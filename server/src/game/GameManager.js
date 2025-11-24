import { Room } from './Room.js';
import { GameRoles } from './GameRoles.js';

export class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRoomMap = new Map();
  }

  getRoomList() {
    const roomList = [];
    this.rooms.forEach((room) => {
      const host = Array.from(room.players.values()).find(p => p.isHost);
      roomList.push({
        id: room.id,
        gameType: 'mafia',
        status: room.status,
        playerCount: room.players.size,
        maxPlayers: room.settings.maxPlayers,
        host: host ? host.name : 'Unknown'
      });
    });
    return roomList;
  }

  createRoom(socket, playerName, roomSettings) {
    const room = new Room(this.io, roomSettings);
    this.rooms.set(room.id, room);

    room.addPlayer(socket.id, playerName, true);
    this.playerRoomMap.set(socket.id, room.id);

    socket.join(room.id);
    socket.emit('roomCreated', {
      roomId: room.id,
      room: room.getState()
    });
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
      room: room.getState(),
      gameType: 'mafia' // 마피아 게임 타입 전달
    });

    this.io.to(roomId).emit('playerJoined', {
      player: room.players.get(socket.id),
      room: room.getState()
    });
  }

  // 듀얼 채팅 시스템
  handleChatMessage(socket, roomId, message, isMafiaChat = false) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    if (player.isDead) {
      socket.emit('error', { message: '사망한 플레이어는 채팅할 수 없습니다.' });
      return;
    }

    if (isMafiaChat) {
      // 마피아 채팅
      if (player.role !== 'mafia') {
        socket.emit('error', { message: '마피아만 마피아 채팅을 사용할 수 있습니다.' });
        return;
      }

      if (room.phase !== 'night') {
        socket.emit('error', { message: '마피아 채팅은 밤에만 사용할 수 있습니다.' });
        return;
      }

      const chatMessage = {
        id: Date.now(),
        playerId: socket.id,
        anonymousNumber: player.anonymousNumber,
        message,
        timestamp: new Date(),
        type: 'mafia'
      };

      room.addChatMessage(chatMessage, true);

      // 마피아들에게만 전송
      room.players.forEach((p, pId) => {
        if (p.role === 'mafia') {
          this.io.to(pId).emit('mafiaChat', chatMessage);
        }
      });
    } else {
      // 일반 채팅 (밤에는 불가)
      if (room.phase === 'night') {
        socket.emit('error', { message: '밤에는 일반 채팅을 사용할 수 없습니다.' });
        return;
      }

      const chatMessage = {
        id: Date.now(),
        playerId: socket.id,
        anonymousNumber: player.anonymousNumber,
        message,
        timestamp: new Date(),
        type: 'normal'
      };

      room.addChatMessage(chatMessage, false);
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

    // 역할 정보 전송
    const playerRoles = {};
    room.players.forEach((player, playerId) => {
      const roleInfo = GameRoles[player.role];
      playerRoles[playerId] = {
        role: player.role,
        roleInfo: roleInfo
      };
    });

    this.io.to(roomId).emit('gameStarted', {
      room: room.getState(),
      playerRoles: playerRoles
    });
  }

  handleDayVote(socket, roomId, targetId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.handleDayVote(socket.id, targetId);
  }

  handleNightAction(socket, roomId, action) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.handleNightAction(socket.id, action);
  }

  handleExecutionVote(socket, roomId, vote) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.handleExecutionVote(socket.id, vote);
  }

  toggleReady(socket, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.setPlayerReady(socket.id);

    this.io.to(roomId).emit('playerReady', {
      player: room.players.get(socket.id),
      room: room.getState()
    });
  }

  updateSettings(socket, roomId, newSettings) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: '방장만 설정을 변경할 수 있습니다.' });
      return;
    }

    const result = room.updateSettings(newSettings);
    if (result.success) {
      this.io.to(roomId).emit('settingsUpdated', {
        room: room.getState()
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  }

  leaveRoom(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    const wasHost = player?.isHost;

    room.removePlayer(socket.id);
    this.playerRoomMap.delete(socket.id);
    socket.leave(roomId);

    if (room.players.size === 0) {
      room.cleanup();
      this.rooms.delete(roomId);
    } else {
      if (wasHost) {
        const newHost = Array.from(room.players.values())[0];
        newHost.isHost = true;
      }

      this.io.to(roomId).emit('playerLeft', {
        playerId: socket.id,
        room: room.getState()
      });
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
