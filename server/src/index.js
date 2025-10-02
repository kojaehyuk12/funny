import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './game/GameManager.js';

const app = express();
const httpServer = createServer(app);

// CORS 설정
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Socket.IO 설정
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
  console.log(`✅ User connected: ${socket.id}`);

  // 방 생성
  socket.on('createRoom', ({ playerName, roomSettings }) => {
    gameManager.createRoom(socket, playerName, roomSettings);
  });

  // 방 참가
  socket.on('joinRoom', ({ roomId, playerName }) => {
    gameManager.joinRoom(socket, roomId, playerName);
  });

  // 채팅 메시지
  socket.on('chatMessage', ({ roomId, message }) => {
    gameManager.handleChatMessage(socket, roomId, message);
  });

  // 게임 시작
  socket.on('startGame', ({ roomId }) => {
    gameManager.startGame(socket, roomId);
  });

  // 시간 단축 투표
  socket.on('voteSkipTime', ({ roomId }) => {
    gameManager.voteSkipTime(socket, roomId);
  });

  // 낮 투표 (처형)
  socket.on('voteDayExecution', ({ roomId, targetId }) => {
    gameManager.voteDayExecution(socket, roomId, targetId);
  });

  // 밤 행동 (마피아 킬, 의사 힐, 경찰 조사)
  socket.on('nightAction', ({ roomId, action, targetId }) => {
    gameManager.handleNightAction(socket, roomId, action, targetId);
  });

  // 준비 완료
  socket.on('playerReady', ({ roomId }) => {
    gameManager.playerReady(socket, roomId);
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    gameManager.handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎮 Mafia Game Server is ready!`);
});
