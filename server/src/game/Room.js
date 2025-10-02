import { GameRoles } from './GameRoles.js';

export class Room {
  constructor(io, settings = {}) {
    this.io = io;
    this.id = this.generateRoomId();
    this.players = new Map();
    this.chatMessages = []; // 일반 채팅
    this.mafiaChat = []; // 마피아 전용 채팅
    this.status = 'waiting'; // waiting, playing, finished
    this.phase = null; // reveal, waiting, night, night_result, day, vote_result, final_words, execution_vote
    this.day = 0;
    this.phaseTimer = null;
    this.nightActions = new Map();
    this.dayVotes = new Map();
    this.executionVotes = new Map(); // 처형 투표
    this.suspectId = null; // 최후 변론 대상자

    this.settings = {
      minPlayers: settings.minPlayers || 1,
      maxPlayers: settings.maxPlayers || 12,
      revealDuration: settings.revealDuration || 5, // 익명 번호 공개 시간
      waitingDuration: settings.waitingDuration || 10, // 대기실 시간
      nightDuration: settings.nightDuration || 30,
      dayDuration: settings.dayDuration || 60,
      finalWordsDuration: settings.finalWordsDuration || 30, // 최후 변론 시간
      executionVoteDuration: settings.executionVoteDuration || 20, // 처형 투표 시간
      roles: settings.roles || {
        mafia: 1,
        doctor: 0,
        police: 0,
        citizen: 0
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
      anonymousNumber: null,
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

  updateSettings(newSettings) {
    const numMafia = parseInt(newSettings.roles.mafia, 10) || 0;
    const numDoctor = parseInt(newSettings.roles.doctor, 10) || 0;
    const numPolice = parseInt(newSettings.roles.police, 10) || 0;
    const totalRoles = numMafia + numDoctor + numPolice;

    if (totalRoles >= newSettings.minPlayers) {
      return { success: false, message: '역할의 총합은 최소 플레이어 수보다 적어야 합니다.' };
    }

    this.settings = {
      ...this.settings,
      ...newSettings,
      roles: {
        ...this.settings.roles,
        ...newSettings.roles
      }
    };
    return { success: true };
  }

  addChatMessage(message, isMafiaChat = false) {
    if (isMafiaChat) {
      this.mafiaChat.push(message);
      if (this.mafiaChat.length > 100) {
        this.mafiaChat.shift();
      }
    } else {
      this.chatMessages.push(message);
      if (this.chatMessages.length > 100) {
        this.chatMessages.shift();
      }
    }
  }

  // 게임 시작
  startGame() {
    this.status = 'playing';
    this.day = 1;
    this.assignRoles();
    this.assignAnonymousNumbers();

    // Phase 1: 익명 번호 공개 (5초)
    this.phase = 'reveal';
    this.io.to(this.id).emit('phaseChanged', {
      phase: 'reveal',
      day: this.day,
      duration: this.settings.revealDuration,
      room: this.getState(),
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        anonymousNumber: p.anonymousNumber
      }))
    });

    setTimeout(() => {
      this.startWaitingPhase();
    }, this.settings.revealDuration * 1000);
  }

  // Phase 2: 대기실 (익명 번호로 채팅 가능)
  startWaitingPhase() {
    this.phase = 'waiting';
    const duration = this.settings.waitingDuration;

    this.io.to(this.id).emit('phaseChanged', {
      phase: 'waiting',
      day: this.day,
      duration,
      room: this.getState()
    });

    this.phaseTimer = setTimeout(() => {
      this.startNightPhase();
    }, duration * 1000);
  }

  // Phase 3: 밤 (마피아 채팅 + 능력 사용)
  startNightPhase() {
    this.phase = 'night';
    this.nightActions.clear();
    const duration = this.settings.nightDuration;

    this.io.to(this.id).emit('phaseChanged', {
      phase: 'night',
      day: this.day,
      duration,
      room: this.getState()
    });

    this.phaseTimer = setTimeout(() => {
      this.processNightActions();
    }, duration * 1000);
  }

  // Phase 4: 밤 결과 표시
  processNightActions() {
    this.phase = 'night_result';
    const results = {
      killed: [],
      saved: [],
      investigated: []
    };

    // 1. 마피아 공격 (다수결)
    const mafiaTargets = new Map();
    this.nightActions.forEach((action, playerId) => {
      const player = this.players.get(playerId);
      if (player && player.role === 'mafia' && action.action === 'kill') {
        const targetId = action.targetId;
        mafiaTargets.set(targetId, (mafiaTargets.get(targetId) || 0) + 1);
      }
    });

    let targetId = null;
    let maxVotes = 0;
    mafiaTargets.forEach((votes, tId) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        targetId = tId;
      }
    });

    // 2. 의사 보호
    let savedId = null;
    this.nightActions.forEach((action, playerId) => {
      const player = this.players.get(playerId);
      if (player && player.role === 'doctor' && action.action === 'save') {
        savedId = action.targetId;
      }
    });

    // 3. 살해 vs 보호 처리
    if (targetId && targetId !== savedId) {
      const victim = this.players.get(targetId);
      if (victim) {
        victim.isDead = true;
        results.killed.push({
          id: victim.id,
          anonymousNumber: victim.anonymousNumber
        });
      }
    } else if (targetId && targetId === savedId) {
      results.saved.push({ saved: true });
    }

    // 4. 경찰 조사
    this.nightActions.forEach((action, playerId) => {
      const player = this.players.get(playerId);
      if (player && player.role === 'police' && action.action === 'investigate') {
        const target = this.players.get(action.targetId);
        if (target) {
          const isMafia = target.role === 'mafia';
          results.investigated.push({
            investigatorId: playerId,
            targetNumber: target.anonymousNumber,
            result: isMafia ? '마피아입니다' : '시민입니다'
          });
        }
      }
    });

    this.showNightResults(results);
  }

  showNightResults(results) {
    this.io.to(this.id).emit('nightResults', {
      results,
      room: this.getState()
    });

    // 승리 조건 확인
    if (this.checkWinCondition()) {
      return;
    }

    // 3초 후 낮 시작
    setTimeout(() => {
      this.startDayPhase();
    }, 3000);
  }

  // Phase 5: 낮 (토론 + 투표)
  startDayPhase() {
    this.phase = 'day';
    this.dayVotes.clear();
    const duration = this.settings.dayDuration;

    this.io.to(this.id).emit('phaseChanged', {
      phase: 'day',
      day: this.day,
      duration,
      room: this.getState()
    });

    this.phaseTimer = setTimeout(() => {
      this.processVotes();
    }, duration * 1000);
  }

  // Phase 6: 투표 결과 처리
  processVotes() {
    this.phase = 'vote_result';

    // 투표 집계
    const voteCounts = new Map();
    this.dayVotes.forEach((targetId, voterId) => {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    });

    // 최다 득표자 찾기
    let maxVotes = 0;
    let suspectId = null;
    voteCounts.forEach((votes, targetId) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        suspectId = targetId;
      }
    });

    if (suspectId && maxVotes > 0) {
      this.suspectId = suspectId;
      this.startFinalWordsPhase();
    } else {
      // 아무도 투표 안함 -> 밤으로
      this.day++;
      setTimeout(() => {
        this.startNightPhase();
      }, 2000);
    }
  }

  // Phase 7: 최후 변론
  startFinalWordsPhase() {
    this.phase = 'final_words';
    const duration = this.settings.finalWordsDuration;

    this.io.to(this.id).emit('phaseChanged', {
      phase: 'final_words',
      day: this.day,
      duration,
      suspectId: this.suspectId,
      room: this.getState()
    });

    this.phaseTimer = setTimeout(() => {
      this.startExecutionVote();
    }, duration * 1000);
  }

  // Phase 8: 처형 투표 (살리기 vs 죽이기)
  startExecutionVote() {
    this.phase = 'execution_vote';
    this.executionVotes.clear();
    const duration = this.settings.executionVoteDuration;

    this.io.to(this.id).emit('phaseChanged', {
      phase: 'execution_vote',
      day: this.day,
      duration,
      suspectId: this.suspectId,
      room: this.getState()
    });

    this.phaseTimer = setTimeout(() => {
      this.processExecutionVote();
    }, duration * 1000);
  }

  processExecutionVote() {
    let killVotes = 0;
    let liveVotes = 0;

    this.executionVotes.forEach(vote => {
      if (vote === 'kill') killVotes++;
      else if (vote === 'live') liveVotes++;
    });

    const suspect = this.players.get(this.suspectId);

    // 죽이기가 더 많으면 처형
    if (killVotes > liveVotes && suspect) {
      suspect.isDead = true;

      this.io.to(this.id).emit('executionResult', {
        executed: true,
        player: {
          id: suspect.id,
          anonymousNumber: suspect.anonymousNumber,
          role: suspect.role
        },
        killVotes,
        liveVotes,
        room: this.getState()
      });
    } else {
      this.io.to(this.id).emit('executionResult', {
        executed: false,
        killVotes,
        liveVotes,
        room: this.getState()
      });
    }

    this.suspectId = null;
    this.executionVotes.clear();

    // 승리 조건 확인
    if (this.checkWinCondition()) {
      return;
    }

    // 다음 밤으로
    this.day++;
    setTimeout(() => {
      this.startNightPhase();
    }, 3000);
  }

  // 역할 배정
  assignRoles() {
    const playerIds = Array.from(this.players.keys());
    const shuffled = this.shuffleArray(playerIds);

    const roleAssignments = [];
    let index = 0;

    // 마피아
    for (let i = 0; i < this.settings.roles.mafia; i++) {
      if (index < shuffled.length) {
        roleAssignments.push({ playerId: shuffled[index], role: 'mafia' });
        index++;
      }
    }

    // 의사
    for (let i = 0; i < this.settings.roles.doctor; i++) {
      if (index < shuffled.length) {
        roleAssignments.push({ playerId: shuffled[index], role: 'doctor' });
        index++;
      }
    }

    // 경찰
    for (let i = 0; i < this.settings.roles.police; i++) {
      if (index < shuffled.length) {
        roleAssignments.push({ playerId: shuffled[index], role: 'police' });
        index++;
      }
    }

    // 나머지 시민
    while (index < shuffled.length) {
      roleAssignments.push({ playerId: shuffled[index], role: 'citizen' });
      index++;
    }

    roleAssignments.forEach(({ playerId, role }) => {
      const player = this.players.get(playerId);
      if (player) {
        player.role = role;
      }
    });
  }

  // 익명 번호 배정
  assignAnonymousNumbers() {
    const playerIds = Array.from(this.players.keys());
    const numbers = this.shuffleArray([...Array(playerIds.length).keys()].map(i => i + 1));

    playerIds.forEach((playerId, index) => {
      const player = this.players.get(playerId);
      if (player) {
        player.anonymousNumber = numbers[index];
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

  // 낮 투표
  handleDayVote(playerId, targetId) {
    const player = this.players.get(playerId);
    if (!player || player.isDead || this.phase !== 'day') {
      return;
    }

    this.dayVotes.set(playerId, targetId);

    // 투표 현황 브로드캐스트
    const voteStatus = [];
    const voteCounts = new Map();
    this.dayVotes.forEach((tId) => {
      voteCounts.set(tId, (voteCounts.get(tId) || 0) + 1);
    });

    voteCounts.forEach((count, tId) => {
      const target = this.players.get(tId);
      if (target) {
        voteStatus.push({
          targetId: tId,
          anonymousNumber: target.anonymousNumber,
          votes: count
        });
      }
    });

    this.io.to(this.id).emit('voteStatusUpdate', { votes: voteStatus });
  }

  // 밤 행동
  handleNightAction(playerId, action) {
    const player = this.players.get(playerId);
    if (!player || player.isDead || this.phase !== 'night') {
      return;
    }

    this.nightActions.set(playerId, action);
  }

  // 처형 투표
  handleExecutionVote(playerId, vote) {
    const player = this.players.get(playerId);
    if (!player || player.isDead || this.phase !== 'execution_vote') {
      return;
    }

    this.executionVotes.set(playerId, vote);

    // 투표 현황 브로드캐스트
    let killVotes = 0;
    let liveVotes = 0;
    this.executionVotes.forEach(v => {
      if (v === 'kill') killVotes++;
      else if (v === 'live') liveVotes++;
    });

    this.io.to(this.id).emit('executionVoteStatus', { killVotes, liveVotes });
  }

  // 승리 조건 확인
  checkWinCondition() {
    const alivePlayers = Array.from(this.players.values()).filter(p => !p.isDead);
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const aliveCitizens = alivePlayers.filter(p => p.role !== 'mafia');

    let winner = null;
    let reason = '';

    if (aliveMafia.length === 0) {
      winner = 'citizen';
      reason = '모든 마피아가 제거되었습니다!';
    } else if (aliveMafia.length >= aliveCitizens.length) {
      winner = 'mafia';
      reason = '마피아가 시민 수 이상이 되었습니다!';
    }

    if (winner) {
      this.status = 'finished';
      this.io.to(this.id).emit('gameOver', {
        winner,
        reason,
        room: this.getState()
      });
      return true;
    }

    return false;
  }

  getState() {
    return {
      id: this.id,
      status: this.status,
      phase: this.phase,
      day: this.day,
      players: Array.from(this.players.values()),
      chatMessages: this.chatMessages,
      mafiaChat: this.mafiaChat,
      settings: this.settings
    };
  }

  cleanup() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }
}
