import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './game/GameManager.js';
import { LiarGameManager } from './game/LiarGameManager.js';

const app = express();
const httpServer = createServer(app);

// 허용할 오리진 목록
const allowedOrigins = [
  'http://localhost:5173',
  'https://kojaehyuk12.github.io',
  process.env.CLIENT_URL
].filter(Boolean);

// CORS 설정
app.use(cors({
  origin: (origin, callback) => {
    // origin이 없는 경우 (같은 도메인) 또는 허용 목록에 있는 경우
    if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Socket.IO 설정
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  // 성능 최적화 설정
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  perMessageDeflate: false, // 압축 비활성화로 지연시간 감소
  httpCompression: false
});

// 게임 매니저 인스턴스
const gameManager = new GameManager(io);
const liarGameManager = new LiarGameManager(io);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'Mafia Game Server',
    status: 'running',
    rooms: gameManager.getRooms().length
  });
});

// 게임 상태 API
app.get('/api/rooms', (req, res) => {
  res.json(gameManager.getRooms());
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {

  // 방 목록 조회
  socket.on('getRoomList', ({ gameType }) => {
    const mafiaRooms = gameManager.getRoomList();
    const liarRooms = liarGameManager.getRoomList();
    const allRooms = [...mafiaRooms, ...liarRooms];

    socket.emit('roomListUpdate', {
      rooms: gameType ? allRooms.filter(r => r.gameType === gameType) : allRooms
    });
  });

  // 방 생성
  socket.on('createRoom', ({ playerName, roomSettings }) => {
    gameManager.createRoom(socket, playerName, roomSettings);

    // 방 목록 업데이트 브로드캐스트
    io.emit('roomListUpdate', {
      rooms: [...gameManager.getRoomList(), ...liarGameManager.getRoomList()]
    });
  });

  // 통합 방 참가 (마피아 + 라이어 자동 판별)
  socket.on('joinRoom', ({ roomId, playerName }) => {
    console.log(`[통합] 방 참가 시도: ${roomId}, 플레이어: ${playerName}`);

    // 먼저 마피아 방 확인
    const mafiaRoom = gameManager.rooms.get(roomId);
    if (mafiaRoom) {
      console.log(`[통합] 마피아 방 발견: ${roomId}`);
      gameManager.joinRoom(socket, roomId, playerName);
      return;
    }

    // 마피아 방이 없으면 라이어 방 확인
    const liarRoom = liarGameManager.rooms.get(roomId);
    if (liarRoom) {
      console.log(`[통합] 라이어 방 발견: ${roomId}`);
      const result = liarGameManager.joinRoom(socket.id, playerName, roomId);
      if (result.success) {
        socket.join(roomId);
        socket.emit('roomJoined', { roomId, room: result.room, gameType: 'liar' });
        io.to(roomId).emit('playerJoined', { player: { id: socket.id, name: playerName }, room: result.room });

        // 방 목록 업데이트
        io.emit('roomListUpdate', {
          rooms: [...gameManager.getRoomList(), ...liarGameManager.getRoomList()]
        });
      } else {
        socket.emit('error', { message: result.message });
      }
      return;
    }

    // 둘 다 없으면 에러
    console.log(`[통합] 방을 찾을 수 없음: ${roomId}`);
    socket.emit('error', { message: '방을 찾을 수 없습니다.' });
  });

  // 일반 채팅
  socket.on('chatMessage', ({ roomId, message }) => {
    gameManager.handleChatMessage(socket, roomId, message, false);
  });

  // 마피아 채팅
  socket.on('mafiaChat', ({ roomId, message }) => {
    gameManager.handleChatMessage(socket, roomId, message, true);
  });

  // 게임 시작
  socket.on('startGame', ({ roomId }) => {
    gameManager.startGame(socket, roomId);
  });

  // 낮 투표
  socket.on('dayVote', ({ roomId, targetId }) => {
    gameManager.handleDayVote(socket, roomId, targetId);
  });

  // 밤 행동
  socket.on('nightAction', ({ roomId, action }) => {
    gameManager.handleNightAction(socket, roomId, action);
  });

  // 처형 투표
  socket.on('executionVote', ({ roomId, vote }) => {
    gameManager.handleExecutionVote(socket, roomId, vote);
  });

  // 준비 완료
  socket.on('toggleReady', ({ roomId }) => {
    gameManager.toggleReady(socket, roomId);
  });

  // 설정 변경
  socket.on('updateSettings', ({ roomId, newSettings }) => {
    gameManager.updateSettings(socket, roomId, newSettings);
  });

  // ===== 라이어 게임 이벤트 =====

  // 라이어 방 생성
  socket.on('createLiarRoom', ({ playerName }) => {
    try {
      const { roomId, room } = liarGameManager.createRoom(socket.id, playerName);
      socket.join(roomId);
      console.log(`[라이어] 방 생성: ${roomId}, 호스트: ${playerName}`);
      socket.emit('roomCreated', { roomId, room });

      // 방 목록 업데이트 브로드캐스트
      io.emit('roomListUpdate', {
        rooms: [...gameManager.getRoomList(), ...liarGameManager.getRoomList()]
      });
    } catch (error) {
      console.error('[라이어] 방 생성 실패:', error);
      socket.emit('error', { message: '방 생성 실패' });
    }
  });

  // [제거됨] joinLiarRoom - 이제 통합 joinRoom을 사용

  // 라이어 게임 시작
  socket.on('startLiarGame', ({ roomId }) => {
    try {
      const result = liarGameManager.startGame(roomId);
      if (!result.success) {
        socket.emit('error', { message: result.message });
      }
    } catch (error) {
      socket.emit('error', { message: '게임 시작 실패' });
    }
  });

  // 턴 메시지
  socket.on('liarTurnMessage', ({ roomId, message }) => {
    liarGameManager.handleTurnMessage(roomId, socket.id, message);
  });

  // 자유 채팅 메시지
  socket.on('liarFreeMessage', ({ roomId, message }) => {
    liarGameManager.handleFreeMessage(roomId, socket.id, message);
  });

  // 투표
  socket.on('liarVote', ({ roomId, targetId }) => {
    liarGameManager.handleVote(roomId, socket.id, targetId);
  });

  // 제시어 추측
  socket.on('liarGuessKeyword', ({ roomId, keyword }) => {
    liarGameManager.handleKeywordGuess(roomId, socket.id, keyword);
  });

  // 방 나가기
  socket.on('leaveRoom', () => {
    gameManager.leaveRoom(socket);
  });

  // 연결 해제
  socket.on('disconnect', () => {
    gameManager.leaveRoom(socket);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 서버 시작: http://localhost:${PORT}`);
});
