import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import GameSelect from './pages/GameSelect';
import RoomList from './pages/RoomList';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import LiarGame from './pages/LiarGame';

function App() {
  const { socket, isConnected } = useSocket();
  const [currentPage, setCurrentPage] = useState('gameSelect'); // gameSelect, roomList, lobby, game, liar
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [gameType, setGameType] = useState(null); // mafia or liar

  const selectGame = (type) => {
    setGameType(type);
    setCurrentPage('roomList');
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

  const createRoom = (name, settings) => {
    setPlayerName(name);
    if (gameType === 'mafia') {
      socket.emit('createRoom', {
        playerName: name,
        roomSettings: settings || {}
      });
    } else if (gameType === 'liar') {
      socket.emit('createLiarRoom', {
        playerName: name
      });
    }
  };

  const joinRoom = (name, roomId) => {
    setPlayerName(name);
    if (gameType === 'mafia') {
      socket.emit('joinRoom', {
        roomId,
        playerName: name
      });
    } else if (gameType === 'liar') {
      socket.emit('joinLiarRoom', {
        roomId,
        playerName: name
      });
    }
  };

  const leaveRoom = () => {
    setCurrentPage('roomList');
    setRoomId(null);
    setRoomData(null);
  };

  const backToGameSelect = () => {
    setCurrentPage('gameSelect');
    setGameType(null);
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
      {currentPage === 'gameSelect' && (
        <GameSelect onSelectGame={selectGame} />
      )}
      {currentPage === 'roomList' && (
        <RoomList
          socket={socket}
          gameType={gameType}
          onBack={backToGameSelect}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
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
