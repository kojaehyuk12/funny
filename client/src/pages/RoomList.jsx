import { useState, useEffect } from 'react';

export default function RoomList({ socket, gameType, onBack, onCreateRoom, onJoinRoom }) {
  const [playerName, setPlayerName] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const gameInfo = gameType === 'mafia' ? {
    title: '🎭 마피아',
    color: 'mafia-accent',
    gradient: 'from-mafia-accent via-red-600 to-mafia-accent'
  } : {
    title: '🤥 라이어 게임',
    color: 'purple-500',
    gradient: 'from-purple-400 to-purple-600'
  };

  useEffect(() => {
    if (!socket) return;

    // 방 목록 요청
    socket.emit('getRoomList', { gameType });

    // 방 목록 업데이트
    socket.on('roomListUpdate', ({ rooms: updatedRooms }) => {
      setRooms(updatedRooms.filter(room => room.gameType === gameType));
    });

    return () => {
      socket.off('roomListUpdate');
    };
  }, [socket, gameType]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }

    if (gameType === 'mafia') {
      onCreateRoom(playerName, {});
    } else {
      onCreateRoom(playerName);
    }
    setShowCreateModal(false);
  };

  const handleJoinRoom = (roomId) => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      setShowJoinModal(true);
      setSelectedRoomId(roomId);
      return;
    }
    onJoinRoom(playerName, roomId);
  };

  const confirmJoin = () => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    handleJoinRoom(selectedRoomId);
    setShowJoinModal(false);
  };

  return (
    <div className="min-h-screen p-4 animate-fade-in bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="btn-secondary px-6 py-3 flex items-center gap-2"
          >
            ← 뒤로가기
          </button>
          <h1 className={`text-4xl font-extrabold bg-gradient-to-r ${gameInfo.gradient} bg-clip-text text-transparent`}>
            {gameInfo.title}
          </h1>
          <div className="w-32"></div>
        </div>

        {/* 닉네임 입력 */}
        <div className="card backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <label className="text-mafia-gold font-bold">👤 닉네임:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="사용할 닉네임을 입력하세요"
              maxLength={12}
              className="input-field flex-1"
            />
          </div>
        </div>

        {/* 방 생성 버튼 */}
        <button
          onClick={() => setShowCreateModal(true)}
          className={`w-full btn-primary text-lg py-4 font-bold bg-gradient-to-r from-${gameInfo.color} to-${gameInfo.color}/80 hover:from-${gameInfo.color}/90 hover:to-${gameInfo.color}/70`}
        >
          ➕ 새 방 만들기
        </button>

        {/* 방 목록 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-mafia-gold">📋 대기 중인 방</h2>

          {rooms.length === 0 ? (
            <div className="card backdrop-blur-sm text-center py-12">
              <p className="text-mafia-muted text-lg">현재 대기 중인 방이 없습니다</p>
              <p className="text-mafia-muted mt-2">새 방을 만들어보세요!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <div key={room.id} className="card backdrop-blur-sm hover:border-mafia-accent/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-mafia-gold">방 #{room.id}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          room.status === 'waiting'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {room.status === 'waiting' ? '대기 중' : '게임 중'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-mafia-muted">
                        <span>👥 {room.playerCount}/{room.maxPlayers}명</span>
                        <span>👑 방장: {room.host}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={room.status !== 'waiting' || room.playerCount >= room.maxPlayers}
                      className={`btn-primary px-8 py-3 ${
                        room.status !== 'waiting' || room.playerCount >= room.maxPlayers
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      {room.status !== 'waiting' ? '게임 중' :
                       room.playerCount >= room.maxPlayers ? '방 꽉참' : '참가하기'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 방 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-mafia-gold mb-4">새 방 만들기</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-mafia-gold font-bold mb-2">닉네임</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="사용할 닉네임을 입력하세요"
                  maxLength={12}
                  className="input-field w-full"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1 py-3"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="btn-primary flex-1 py-3"
                >
                  만들기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 방 참가 모달 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-mafia-gold mb-4">방 참가</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-mafia-gold font-bold mb-2">닉네임</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="사용할 닉네임을 입력하세요"
                  maxLength={12}
                  className="input-field w-full"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="btn-secondary flex-1 py-3"
                >
                  취소
                </button>
                <button
                  onClick={confirmJoin}
                  className="btn-primary flex-1 py-3"
                >
                  참가하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
