import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import GameSelect from './pages/GameSelect';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import LiarGame from './pages/LiarGame';

function App() {
  const { socket, isConnected } = useSocket();
  const [currentPage, setCurrentPage] = useState('home'); // home, create, join, lobby, game
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [gameType, setGameType] = useState(null); // mafia or liar

  const goToCreateRoom = () => {
    setCurrentPage('create');
  };

  const goToJoinRoom = () => {
    setCurrentPage('join');
  };

  const backToHome = () => {
    setCurrentPage('home');
    setGameType(null);
  };

  useEffect(() => {
    if (!socket) return;

    // 방 생성 성공
    socket.on('roomCreated', ({ roomId, room }) => {
      setRoomId(roomId);
      setRoomData(room);
      setCurrentPage('lobby');
    });

    // 게임 시작
    socket.on('gameStarted', ({ room, playerRoles }) => {
      setRoomData({
        ...room,
        playerRoles: playerRoles  // 역할 정보 저장
      });
      setCurrentPage('game');
    });

    return () => {
      socket.off('roomCreated');
      socket.off('gameStarted');
    };
  }, [socket]);

  const handleCreateRoom = (name, type) => {
    setPlayerName(name);
    setGameType(type);

    if (type === 'mafia') {
      socket.emit('createRoom', {
        playerName: name,
        roomSettings: {}
      });
    } else if (type === 'liar') {
      socket.emit('createLiarRoom', {
        playerName: name
      });
    }
  };

  const handleJoinRoom = (name, code) => {
    setPlayerName(name);
    console.log(`[클라이언트] 방 참가 시도: ${code}, 이름: ${name}`);

    // 방 참가 성공 핸들러 (통합)
    const joinSuccessHandler = ({ roomId, room, gameType }) => {
      console.log(`[클라이언트] 방 참가 성공: ${roomId}, 게임 타입: ${gameType || 'mafia'}`);
      setRoomId(roomId);
      setRoomData(room);
      setGameType(gameType || 'mafia'); // 서버에서 gameType 전달받음
      setCurrentPage('lobby');

      // 핸들러 정리
      socket.off('roomJoined', joinSuccessHandler);
      socket.off('error', errorHandler);
    };

    // 에러 핸들러 (통합)
    const errorHandler = ({ message }) => {
      console.log(`[클라이언트] 방 참가 실패: ${message}`);
      alert(message);
      socket.off('roomJoined', joinSuccessHandler);
      socket.off('error', errorHandler);
    };

    // 핸들러 설정
    socket.on('roomJoined', joinSuccessHandler);
    socket.on('error', errorHandler);

    // 통합 방 참가 요청 (서버가 자동으로 마피아/라이어 판별)
    socket.emit('joinRoom', {
      roomId: code,
      playerName: name
    });
  };

  const leaveRoom = () => {
    setCurrentPage('home');
    setRoomId(null);
    setRoomData(null);
    setGameType(null);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mafia-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-mafia-accent mx-auto mb-4"></div>
          <p className="text-mafia-light text-xl">서버 연결 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mafia-dark">
      {currentPage === 'home' && (
        <GameSelect onCreateRoom={goToCreateRoom} onJoinRoom={goToJoinRoom} />
      )}
      {currentPage === 'create' && (
        <CreateRoom onBack={backToHome} onCreate={handleCreateRoom} />
      )}
      {currentPage === 'join' && (
        <JoinRoom onBack={backToHome} onJoin={handleJoinRoom} />
      )}
      {currentPage === 'lobby' && gameType === 'liar' && (
        <LiarGame
          socket={socket}
          roomId={roomId}
          roomData={roomData}
          setRoomData={setRoomData}
          playerName={playerName}
          onLeave={leaveRoom}
        />
      )}
      {currentPage === 'lobby' && gameType === 'mafia' && (
        <Lobby
          socket={socket}
          roomId={roomId}
          roomData={roomData}
          setRoomData={setRoomData}
          playerName={playerName}
          onLeave={leaveRoom}
        />
      )}
      {currentPage === 'game' && (
        <Game
          socket={socket}
          roomId={roomId}
          roomData={roomData}
          setRoomData={setRoomData}
          playerName={playerName}
          onLeave={leaveRoom}
        />
      )}
    </div>
  );
}

export default App;
