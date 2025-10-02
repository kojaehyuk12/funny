import { Room } from './Room.js';

export class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room
    this.playerRoomMap = new Map(); // socketId -> roomId
  }

  createRoom(socket, playerName, roomSettings) {
    const room = new Room(this.io, roomSettings);
    this.rooms.set(room.id, room);

    room.addPlayer(socket.id, playerName, true); // true = host
    this.playerRoomMap.set(socket.id, room.id);

    socket.join(room.id);
    socket.emit('roomCreated', {
      roomId: room.id,
      room: room.getState()
    });

    console.log(`🎲 Room created: ${room.id} by ${playerName}`);
  }

  joinRoom(socket, roomId, playerName) {
    const room = this.rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: '방을 찾을 수 없습니다.' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('error', { message: '게임이 이미 시작되었습니다.' });
      return;
    }

    if (room.players.size >= room.settings.maxPlayers) {
      socket.emit('error', { message: '방이 가득 찼습니다.' });
      return;
    }

    room.addPlayer(socket.id, playerName, false);
    this.playerRoomMap.set(socket.id, roomId);

    socket.join(roomId);
    socket.emit('roomJoined', {
      roomId,
      room: room.getState()
    });

    this.io.to(roomId).emit('playerJoined', {
      player: room.players.get(socket.id),
      room: room.getState()
    });

    console.log(`👤 ${playerName} joined room: ${roomId}`);
  }

  handleChatMessage(socket, roomId, message) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // 사망자는 채팅 불가
    if (player.isDead) {
      socket.emit('error', { message: '사망한 플레이어는 채팅할 수 없습니다.' });
      return;
    }

    // 밤 페이즈 체크
    if (room.phase === 'night') {
      // 마피아가 아니면 밤에 채팅 불가
      if (player.role !== 'mafia') {
        socket.emit('error', { message: '밤에는 마피아만 채팅할 수 있습니다.' });
        return;
      }

      // 마피아 전용 채팅
      const chatMessage = {
        id: Date.now(),
        playerId: socket.id,
        playerName: player.name,
        message,
        timestamp: new Date(),
        type: 'mafia' // 마피아 채팅임을 표시
      };

      room.addChatMessage(chatMessage);

      // 마피아들에게만 전송
      room.players.forEach((p, pId) => {
        if (p.role === 'mafia') {
          this.io.to(pId).emit('chatMessage', chatMessage);
        }
      });

      console.log(`🔪 Mafia chat in ${roomId}: ${player.name}: ${message}`);
    } else {
      // 낮 페이즈는 전체 채팅
      const chatMessage = {
        id: Date.now(),
        playerId: socket.id,
        playerName: player.name,
        message,
        timestamp: new Date(),
        type: 'normal'
      };

      room.addChatMessage(chatMessage);
      this.io.to(roomId).emit('chatMessage', chatMessage);
    }
  }

  startGame(socket, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: '방장만 게임을 시작할 수 있습니다.' });
      return;
    }

    if (room.players.size < room.settings.minPlayers) {
      socket.emit('error', {
        message: `최소 ${room.settings.minPlayers}명이 필요합니다.`
      });
      return;
    }

    room.startGame();

    console.log(`🎮 Game started in room: ${roomId}, players:`, room.players.size);

    // 모든 플레이어의 역할 정보를 맵으로 만들기
    const playerRoles = {};
    room.players.forEach((player, playerId) => {
      const roleInfo = room.getRoleInfo(player.role);
      console.log(`📨 Preparing role for ${player.name} (${playerId}): ${player.role}`, roleInfo ? '✅' : '❌ NULL');

      playerRoles[playerId] = {
        role: player.role,
        roleInfo: roleInfo
      };
    });

    // 게임 시작 알림과 함께 역할 정보도 전송
    this.io.to(roomId).emit('gameStarted', {
      room: room.getState(),
      playerRoles: playerRoles  // 각 플레이어의 역할 정보 포함
    });

    console.log(`✅ gameStarted event sent to room: ${roomId} with roles:`, Object.keys(playerRoles));
  }

  voteSkipTime(socket, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.voteSkipTime(socket.id);
    this.io.to(roomId).emit('timeSkipVoted', {
      votesNeeded: room.getSkipVotesNeeded(),
      currentVotes: room.skipTimeVotes.size
    });

    if (room.shouldSkipTime()) {
      room.skipTime();
      this.io.to(roomId).emit('timeSkipped', {
        phase: room.phase
      });
    }
  }

  voteDayExecution(socket, roomId, targetId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.phase !== 'day') {
      socket.emit('error', { message: '낮 시간에만 투표할 수 있습니다.' });
      return;
    }

    room.voteDayExecution(socket.id, targetId);

    this.io.to(roomId).emit('voteUpdated', {
      votes: room.getVoteResults()
    });

    // 모든 살아있는 플레이어가 투표했는지 확인
    if (room.allPlayersVoted()) {
      const executedPlayer = room.executeByVote();

      this.io.to(roomId).emit('playerExecuted', {
        player: executedPlayer,
        room: room.getState()
      });

      // 게임 종료 체크
      this.checkGameEnd(room);
    }
  }

  handleNightAction(socket, roomId, action, targetId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.phase !== 'night') {
      socket.emit('error', { message: '밤 시간에만 행동할 수 있습니다.' });
      return;
    }

    const player = room.players.get(socket.id);
    if (!player || player.isDead) return;

    room.recordNightAction(socket.id, action, targetId);
    socket.emit('actionRecorded', { success: true });

    // 모든 특수 역할이 행동했는지 확인
    if (room.allNightActionsComplete()) {
      const results = room.resolveNightActions();

      this.io.to(roomId).emit('nightResults', {
        results,
        room: room.getState()
      });

      // 게임 종료 체크
      this.checkGameEnd(room);
    }
  }

  playerReady(socket, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.setPlayerReady(socket.id);

    this.io.to(roomId).emit('playerReadyUpdate', {
      playerId: socket.id,
      room: room.getState()
    });
  }

  checkGameEnd(room) {
    const result = room.checkWinCondition();

    if (result.isGameOver) {
      this.io.to(room.id).emit('gameOver', {
        winner: result.winner,
        reason: result.reason,
        room: room.getState()
      });

      console.log(`🏁 Game ended in room: ${room.id} - Winner: ${result.winner}`);
    }
  }

  handleDisconnect(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      this.io.to(roomId).emit('playerLeft', {
        playerId: socket.id,
        playerName: player.name
      });

      room.removePlayer(socket.id);
      this.playerRoomMap.delete(socket.id);

      // 방에 아무도 없으면 삭제
      if (room.players.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🗑️ Room deleted: ${roomId}`);
      } else {
        // 호스트가 나갔으면 다른 사람에게 호스트 권한 이전
        if (player.isHost && room.players.size > 0) {
          const newHost = Array.from(room.players.values())[0];
          newHost.isHost = true;
          this.io.to(roomId).emit('hostChanged', {
            newHostId: newHost.id,
            newHostName: newHost.name
          });
        }
      }
    }
  }

  getRooms() {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      playerCount: room.players.size,
      maxPlayers: room.settings.maxPlayers,
      status: room.status
    }));
  }
}
