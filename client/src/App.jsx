import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import LiarGame from './pages/LiarGame';

function App() {
  const { socket, isConnected } = useSocket();
  const [currentPage, setCurrentPage] = useState('home'); // home, lobby, game, liar
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [autoJoinRoom, setAutoJoinRoom] = useState(null);
  const [gameType, setGameType] = useState('mafia'); // mafia or liar

  // URL 파라미터에서 방 코드 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      setAutoJoinRoom(roomCode);
    }
  }, []);

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

  const createRoom = (name, settings) => {
    setPlayerName(name);
    setGameType('mafia');
    socket.emit('createRoom', {
      playerName: name,
      roomSettings: settings
    });
  };

  const joinRoom = (name, roomId) => {
    setPlayerName(name);
    setGameType('mafia');
    socket.emit('joinRoom', {
      roomId,
      playerName: name
    });
  };

  const createLiarRoom = (name) => {
    setPlayerName(name);
    // gameType을 먼저 설정 (roomCreated 이벤트가 오기 전에)
    setGameType('liar');
    socket.emit('createLiarRoom', {
      playerName: name
    });
  };

  const leaveRoom = () => {
    setCurrentPage('home');
    setRoomId(null);
    setRoomData(null);
    setGameType('mafia');
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
        <Home
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onCreateLiarRoom={createLiarRoom}
          autoJoinRoom={autoJoinRoom}
        />
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
