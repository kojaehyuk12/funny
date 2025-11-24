import { useState } from 'react';

export default function CreateRoom({ onBack, onCreate }) {
  const [playerName, setPlayerName] = useState('');
  const [gameType, setGameType] = useState('mafia');

  const handleCreate = () => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    onCreate(playerName, gameType);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-mafia-accent via-red-600 to-mafia-accent bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            ➕ 방 생성하기
          </h1>
          <p className="text-mafia-muted text-lg font-medium">
            게임 종류를 선택하고 방을 만드세요
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

          {/* 게임 선택 */}
          <div>
            <label className="block text-sm font-bold text-mafia-gold mb-3">
              🎮 게임 종류
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setGameType('mafia')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  gameType === 'mafia'
                    ? 'border-mafia-accent bg-mafia-accent/20 text-mafia-accent'
                    : 'border-mafia-secondary/50 text-mafia-muted hover:border-mafia-accent/50'
                }`}
              >
                <div className="text-3xl mb-2">🎭</div>
                <div className="font-bold">마피아</div>
                <div className="text-xs text-mafia-muted mt-1">4-12명</div>
              </button>
              <button
                onClick={() => setGameType('liar')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  gameType === 'liar'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                    : 'border-mafia-secondary/50 text-mafia-muted hover:border-purple-500/50'
                }`}
              >
                <div className="text-3xl mb-2">🤥</div>
                <div className="font-bold">라이어</div>
                <div className="text-xs text-mafia-muted mt-1">3-8명</div>
              </button>
            </div>
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
              onClick={handleCreate}
              className="btn-primary flex-1 py-3.5 text-lg font-bold"
            >
              방 만들기
            </button>
          </div>
        </div>

        <div className="text-center text-mafia-muted text-sm">
          <p className="flex items-center justify-center gap-2">
            <span className="text-mafia-gold">💡</span>
            <span>방을 만들면 친구에게 공유할 코드가 생성됩니다</span>
          </p>
        </div>
      </div>
    </div>
  );
}
