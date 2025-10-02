import { useState, useEffect } from 'react';

export default function Home({ onCreateRoom, onJoinRoom, onCreateLiarRoom, autoJoinRoom }) {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    if (autoJoinRoom) {
      setRoomId(autoJoinRoom.toUpperCase());
    }
  }, [autoJoinRoom]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    // 기본 설정으로 방 생성
    onCreateRoom(playerName, {});
  };

  const handleCreateLiarRoom = () => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    onCreateLiarRoom(playerName);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    if (!roomId.trim()) {
      alert('방 코드를 입력해주세요!');
      return;
    }
    onJoinRoom(playerName, roomId.toUpperCase());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-6xl font-extrabold mb-2 bg-gradient-to-r from-mafia-accent via-red-600 to-mafia-accent bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            🎭 MAFIA
          </h1>
          <p className="text-mafia-muted text-lg font-medium">
            실시간 온라인 마피아 게임
          </p>
        </div>

        <div className="card space-y-6 backdrop-blur-sm">
          <div>
            <label htmlFor="playerName" className="block text-sm font-bold text-mafia-gold mb-2">
              👤 닉네임
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="사용할 닉네임을 입력하세요"
              maxLength={12}
              className="input-field"
            />
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreateRoom}
              className="w-full btn-primary text-lg py-3.5 font-extrabold animate-pulse-glow"
            >
              🎮 새로운 게임 시작
            </button>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-mafia-secondary/40"></div>
              <span className="flex-shrink mx-4 text-mafia-muted text-sm font-semibold">또는</span>
              <div className="flex-grow border-t border-mafia-secondary/40"></div>
            </div>

            <div className="space-y-3">
              <label htmlFor="roomId" className="block text-sm font-bold text-mafia-gold mb-2">
                🔑 코드로 참가하기
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="6자리 방 코드"
                maxLength={6}
                className="input-field text-center text-xl font-mono tracking-widest"
              />
              <button
                onClick={handleJoinRoom}
                className="w-full btn-secondary text-lg py-3.5 font-bold"
              >
                🚪 참가하기
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-mafia-muted text-sm">
          <p className="flex items-center justify-center gap-2">
            <span className="text-mafia-gold">👥</span>
            <span>1-12명이 함께 플레이할 수 있습니다</span>
          </p>
        </div>

        {/* 라이어 게임 버튼 */}
        <div className="mt-4">
          <button
            onClick={handleCreateLiarRoom}
            className="w-full btn-secondary text-lg py-3.5 font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            🎭 라이어 게임 시작
          </button>
        </div>
      </div>
    </div>
  );
}
