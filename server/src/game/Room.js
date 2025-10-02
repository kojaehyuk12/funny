import { GameRoles } from './GameRoles.js';

export class Room {
  constructor(io, settings = {}) {
    this.io = io;
    this.id = this.generateRoomId();
    this.players = new Map(); // socketId -> Player
    this.chatMessages = [];
    this.status = 'waiting'; // waiting, playing, finished
    this.phase = null; // day, night
    this.day = 0;
    this.phaseTimer = null;
    this.nightActions = new Map();
    this.dayVotes = new Map();
    this.skipTimeVotes = new Set();

    this.settings = {
      minPlayers: settings.minPlayers || 1, // 1명으로 테스트 가능
      maxPlayers: settings.maxPlayers || 12,
      dayDuration: settings.dayDuration || 30, // 30초로 단축 (테스트용)
      nightDuration: settings.nightDuration || 20, // 20초로 단축 (테스트용)
      roles: settings.roles || {
        mafia: 1, // 1명만
        doctor: 0,
        police: 0,
        citizen: 0 // 나머지는 자동으로 시민
      }
    };
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  addPlayer(socketId, name, isHost = false) {
    const player = {
      id: socketId,
      name,
      isHost,
      isReady: false,
      role: null,
      isDead: false,
      protectedBy: null,
      votedFor: null
    };

    this.players.set(socketId, player);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  setPlayerReady(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.isReady = !player.isReady;
    }
  }

  addChatMessage(message) {
    this.chatMessages.push(message);

    // 최대 100개 메시지만 유지
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
  }

  startGame() {
    this.status = 'playing';
    this.day = 1;
    this.assignRoles();
    this.startDayPhase(); // 첫날 아침부터 시작
  }

  assignRoles() {
    const playerIds = Array.from(this.players.keys());
    const shuffled = this.shuffleArray(playerIds);

    const roleAssignments = [];
    let index = 0;

    // 마피아 배정
    for (let i = 0; i < this.settings.roles.mafia; i++) {
      if (index < shuffled.length) {
        roleAssignments.push({ playerId: shuffled[index], role: 'mafia' });
        index++;
      }
    }

    // 의사 배정
    for (let i = 0; i < this.settings.roles.doctor; i++) {
      if (index < shuffled.length) {
        roleAssignments.push({ playerId: shuffled[index], role: 'doctor' });
        index++;
      }
    }

    // 경찰 배정
    for (let i = 0; i < this.settings.roles.police; i++) {
      if (index < shuffled.length) {
        roleAssignments.push({ playerId: shuffled[index], role: 'police' });
        index++;
      }
    }

    // 나머지는 시민
    while (index < shuffled.length) {
      roleAssignments.push({ playerId: shuffled[index], role: 'citizen' });
      index++;
    }

    // 역할 할당
    roleAssignments.forEach(({ playerId, role }) => {
      const player = this.players.get(playerId);
      if (player) {
        player.role = role;
      }
    });
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  startNightPhase() {
    this.phase = 'night';
    this.nightActions.clear();

    this.io.to(this.id).emit('phaseChanged', {
      phase: 'night',
      day: this.day,
      duration: this.settings.nightDuration
    });

    this.startPhaseTimer(this.settings.nightDuration);
  }

  startDayPhase() {
    this.phase = 'day';
    this.dayVotes.clear();
    this.skipTimeVotes.clear();

    this.io.to(this.id).emit('phaseChanged', {
      phase: 'day',
      day: this.day,
      duration: this.settings.dayDuration
    });

    this.startPhaseTimer(this.settings.dayDuration);
  }

  startPhaseTimer(duration) {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }

    this.phaseTimer = setTimeout(() => {
      if (this.phase === 'night') {
        const results = this.resolveNightActions();
        this.io.to(this.id).emit('nightResults', {
          results: results,
          room: this.getState()
        });

        const gameResult = this.checkWinCondition();
        if (!gameResult.isGameOver) {
          this.startDayPhase();
        }
      } else if (this.phase === 'day') {
        const executedPlayer = this.executeByVote();
        this.io.to(this.id).emit('playerExecuted', {
          player: executedPlayer,
          room: this.getState()
        });

        const gameResult = this.checkWinCondition();
        if (!gameResult.isGameOver) {
          this.day++;
          this.startNightPhase();
        }
      }
    }, duration * 1000);
  }

  recordNightAction(playerId, action, targetId) {
    const player = this.players.get(playerId);
    if (!player || player.isDead) return;

    this.nightActions.set(playerId, {
      action,
      targetId,
      role: player.role
    });
  }

  allNightActionsComplete() {
    const activeRoles = ['mafia', 'doctor', 'police'];
    let requiredActions = 0;

    this.players.forEach(player => {
      if (!player.isDead && activeRoles.includes(player.role)) {
        requiredActions++;
      }
    });

    // 1명일 경우 자동으로 완료 처리
    if (this.players.size === 1) {
      return true;
    }

    return this.nightActions.size >= requiredActions;
  }

  resolveNightActions() {
    const results = {
      killed: [],
      saved: [],
      investigated: []
    };

    let mafiaTarget = null;
    let doctorTarget = null;
    const policeInvestigations = [];

    // 각 행동 수집
    this.nightActions.forEach((action, playerId) => {
      if (action.role === 'mafia' && action.action === 'kill') {
        mafiaTarget = action.targetId;
      } else if (action.role === 'doctor' && action.action === 'heal') {
        doctorTarget = action.targetId;
      } else if (action.role === 'police' && action.action === 'investigate') {
        const target = this.players.get(action.targetId);
        if (target) {
          policeInvestigations.push({
            investigatorId: playerId,
            targetId: action.targetId,
            isMafia: target.role === 'mafia'
          });
        }
      }
    });

    // 마피아 킬 처리
    if (mafiaTarget && mafiaTarget !== doctorTarget) {
      const targetPlayer = this.players.get(mafiaTarget);
      if (targetPlayer) {
        targetPlayer.isDead = true;
        results.killed.push({
          id: mafiaTarget,
          name: targetPlayer.name
        });
      }
    } else if (mafiaTarget && mafiaTarget === doctorTarget) {
      // 마피아가 공격했지만 의사가 살린 경우에만 메시지 표시
      results.saved.push(mafiaTarget);
    }

    // 경찰 조사 결과
    results.investigated = policeInvestigations;

    this.nightActions.clear();
    return results;
  }

  voteDayExecution(voterId, targetId) {
    const voter = this.players.get(voterId);
    if (!voter || voter.isDead) return;

    voter.votedFor = targetId;
    this.dayVotes.set(voterId, targetId);
  }

  allPlayersVoted() {
    let aliveCount = 0;
    this.players.forEach(player => {
      if (!player.isDead) aliveCount++;
    });

    // 1명일 경우 자동으로 완료 (투표 스킵)
    if (aliveCount === 1) {
      return true;
    }

    return this.dayVotes.size >= aliveCount;
  }

  executeByVote() {
    const voteCounts = new Map();

    this.dayVotes.forEach(targetId => {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    });

    let maxVotes = 0;
    let executedId = null;

    voteCounts.forEach((votes, playerId) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        executedId = playerId;
      }
    });

    if (executedId) {
      const player = this.players.get(executedId);
      if (player) {
        player.isDead = true;
        return player;
      }
    }

    this.dayVotes.clear();
    return null;
  }

  getVoteResults() {
    const results = {};
    this.dayVotes.forEach((targetId, voterId) => {
      if (!results[targetId]) {
        results[targetId] = [];
      }
      results[targetId].push(voterId);
    });
    return results;
  }

  voteSkipTime(playerId) {
    this.skipTimeVotes.add(playerId);
  }

  shouldSkipTime() {
    let aliveCount = 0;
    this.players.forEach(player => {
      if (!player.isDead) aliveCount++;
    });

    // 과반수 이상이 투표하면 스킵
    return this.skipTimeVotes.size > aliveCount / 2;
  }

  getSkipVotesNeeded() {
    let aliveCount = 0;
    this.players.forEach(player => {
      if (!player.isDead) aliveCount++;
    });
    return Math.floor(aliveCount / 2) + 1;
  }

  skipTime() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }

    if (this.phase === 'night') {
      const results = this.resolveNightActions();
      this.io.to(this.id).emit('nightResults', {
        results: results,
        room: this.getState()
      });
      this.startDayPhase();
    } else {
      const executed = this.executeByVote();
      this.io.to(this.id).emit('playerExecuted', {
        player: executed,
        room: this.getState()
      });
      this.day++;
      this.startNightPhase();
    }

    this.skipTimeVotes.clear();
  }

  checkWinCondition() {
    let mafiaCount = 0;
    let citizenCount = 0;

    this.players.forEach(player => {
      if (!player.isDead) {
        if (player.role === 'mafia') {
          mafiaCount++;
        } else {
          citizenCount++;
        }
      }
    });

    // 마피아가 시민보다 많거나 같으면 마피아 승리
    if (mafiaCount >= citizenCount && mafiaCount > 0) {
      this.status = 'finished';
      return {
        isGameOver: true,
        winner: 'mafia',
        reason: '마피아가 시민을 모두 제거했습니다.'
      };
    }

    // 마피아가 모두 죽으면 시민 승리
    if (mafiaCount === 0) {
      this.status = 'finished';
      return {
        isGameOver: true,
        winner: 'citizen',
        reason: '모든 마피아가 제거되었습니다.'
      };
    }

    return { isGameOver: false };
  }

  getRoleInfo(role) {
    return GameRoles[role] || null;
  }

  getState() {
    return {
      id: this.id,
      status: this.status,
      phase: this.phase,
      day: this.day,
      settings: this.settings,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isReady: p.isReady,
        isDead: p.isDead,
        // 역할은 게임 시작 후에만 개별적으로 전송
      })),
      chatMessages: this.chatMessages
    };
  }
}
