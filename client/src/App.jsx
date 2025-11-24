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

    // 방 참가 성공
    socket.on('roomJoined', ({ roomId, room }) => {
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

    // 에러 처리
    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('gameStarted');
      socket.off('error');
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

    // 일단 마피아로 시도
    socket.emit('joinRoom', {
      roomId: code,
      playerName: name
    });

    // 실패하면 라이어로 시도 (에러 처리에서)
    socket.once('error', () => {
      socket.emit('joinLiarRoom', {
        roomId: code,
        playerName: name
      });
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
