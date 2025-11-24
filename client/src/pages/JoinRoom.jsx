import { useState } from 'react';

export default function JoinRoom({ onBack, onJoin }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = () => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    if (!roomCode.trim()) {
      alert('방 코드를 입력해주세요!');
      return;
    }
    onJoin(playerName, roomCode.toUpperCase());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-purple-400 via-purple-600 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
            🔑 코드로 참가하기
          </h1>
          <p className="text-mafia-muted text-lg font-medium">
            친구에게 받은 코드를 입력하세요
          </p>
        </div>

        <div className="card space-y-6 backdrop-blur-sm">
          {/* 닉네임 입력 */}
          <div>
            <label className="block text-sm font-bold text-mafia-gold mb-2">
              👤 닉네임
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="사용할 닉네임을 입력하세요"
              maxLength={12}
              className="input-field"
              autoFocus
            />
          </div>

          {/* 방 코드 입력 */}
          <div>
            <label className="block text-sm font-bold text-mafia-gold mb-2">
              🔢 방 코드
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="6자리 방 코드 입력"
              maxLength={6}
              className="input-field text-center text-2xl font-mono tracking-widest uppercase"
            />
            <p className="text-xs text-mafia-muted mt-2 text-center">
              친구가 공유한 6자리 코드를 입력하세요
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="btn-secondary flex-1 py-3.5 text-lg font-bold"
            >
              ← 뒤로
            </button>
            <button
              onClick={handleJoin}
              className="flex-1 py-3.5 text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
            >
              참가하기
            </button>
          </div>
        </div>

        <div className="text-center text-mafia-muted text-sm">
          <p className="flex items-center justify-center gap-2">
            <span className="text-mafia-gold">💡</span>
            <span>방 코드는 대소문자를 구분하지 않습니다</span>
          </p>
        </div>
      </div>
    </div>
  );
}
