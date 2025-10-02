import { LiarRoom } from './LiarRoom.js';

export class LiarGameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> LiarRoom
  }

  createRoom(socketId, playerName) {
    const room = new LiarRoom(this.io);
    room.addPlayer(socketId, playerName, true); // 첫 플레이어는 호스트
    this.rooms.set(room.id, room);

    return { roomId: room.id, room: room.getState() };
  }

  joinRoom(socketId, playerName, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: '방을 찾을 수 없습니다.' };
    }

    if (room.status !== 'waiting') {
      return { success: false, message: '이미 게임이 진행 중입니다.' };
    }

    room.addPlayer(socketId, playerName, false);
    return { success: true, room: room.getState() };
  }

  leaveRoom(socketId, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.removePlayer(socketId);

    // 방에 아무도 없으면 삭제
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    } else {
      // 호스트가 나갔으면 다른 사람에게 호스트 넘김
      const players = Array.from(room.players.values());
      const hasHost = players.some(p => p.isHost);

      if (!hasHost && players.length > 0) {
        players[0].isHost = true;
      }
    }
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: '방을 찾을 수 없습니다.' };

    return room.startGame();
  }

  handleTurnMessage(roomId, playerId, message) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'turn_chat') return;

    room.sendTurnMessage(playerId, message);
  }

  handleFreeMessage(roomId, playerId, message) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'free_chat') return;

    room.sendFreeMessage(playerId, message);
  }

  handleVote(roomId, voterId, targetId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'voting') return;

    room.vote(voterId, targetId);
  }

  handleKeywordGuess(roomId, liarId, keyword) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'keyword_guess') return;

    room.guessKeyword(liarId, keyword);
  }
}
