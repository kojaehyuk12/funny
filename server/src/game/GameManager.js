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
    this.io.to(roomId).emit('gameStarted', {
      room: room.getState()
    });

    // 각 플레이어에게 개별적으로 역할 정보 전송
    room.players.forEach((player, playerId) => {
      this.io.to(playerId).emit('roleAssigned', {
        role: player.role,
        roleInfo: room.getRoleInfo(player.role)
      });
    });

    console.log(`🎮 Game started in room: ${roomId}`);
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
