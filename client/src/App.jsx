import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function App() {
  const { socket, isConnected } = useSocket();
  const [currentPage, setCurrentPage] = useState('home'); // home, lobby, game
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);

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
    socket.on('gameStarted', ({ room }) => {
      setRoomData(room);
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

  const createRoom = (name, settings) => {
    setPlayerName(name);
    socket.emit('createRoom', {
      playerName: name,
      roomSettings: settings
    });
  };

  const joinRoom = (name, roomId) => {
    setPlayerName(name);
    socket.emit('joinRoom', {
      roomId,
      playerName: name
    });
  };

  const leaveRoom = () => {
    setCurrentPage('home');
    setRoomId(null);
    setRoomData(null);
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
        <Home onCreateRoom={createRoom} onJoinRoom={joinRoom} />
      )}
      {currentPage === 'lobby' && (
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
