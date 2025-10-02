import { useState } from 'react';

export default function Home({ onCreateRoom, onJoinRoom }) {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    minPlayers: 4,
    maxPlayers: 12,
    dayDuration: 120,
    nightDuration: 60,
    roles: {
      mafia: 2,
      doctor: 1,
      police: 1,
      citizen: 0
    }
  });

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    onCreateRoom(playerName, settings);
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 타이틀 */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-6xl font-bold text-mafia-accent mb-2">
            🎭 마피아
          </h1>
          <p className="text-mafia-light text-lg">
            실시간 온라인 마피아 게임
          </p>
        </div>

        {/* 메인 카드 */}
        <div className="card animate-slide-up">
          {/* 닉네임 입력 */}
          <div className="mb-6">
            <label className="block text-mafia-light font-semibold mb-2">
              닉네임
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={12}
              className="w-full px-4 py-3 bg-mafia-secondary text-mafia-light rounded-lg border border-mafia-dark focus:border-mafia-accent focus:outline-none transition-colors"
            />
          </div>

          {/* 방 만들기 */}
          <div className="mb-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-primary w-full mb-2"
            >
              🎮 방 만들기
            </button>

            {showSettings && (
              <div className="mt-4 p-4 bg-mafia-secondary rounded-lg space-y-3 animate-fade-in">
                <div>
                  <label className="block text-sm text-mafia-light mb-1">
                    최대 인원: {settings.maxPlayers}명
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="16"
                    value={settings.maxPlayers}
                    onChange={(e) => setSettings({
                      ...settings,
                      maxPlayers: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-mafia-light mb-1">
                    낮 시간: {settings.dayDuration}초
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="300"
                    step="30"
                    value={settings.dayDuration}
                    onChange={(e) => setSettings({
                      ...settings,
                      dayDuration: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-mafia-light mb-1">
                    밤 시간: {settings.nightDuration}초
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="15"
                    value={settings.nightDuration}
                    onChange={(e) => setSettings({
                      ...settings,
                      nightDuration: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="btn-primary w-full mt-2"
                >
                  생성하기
                </button>
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-mafia-secondary"></div>
            <span className="px-4 text-mafia-light text-sm">또는</span>
            <div className="flex-1 border-t border-mafia-secondary"></div>
          </div>

          {/* 방 참가 */}
          <div>
            <label className="block text-mafia-light font-semibold mb-2">
              방 코드
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="방 코드를 입력하세요"
              maxLength={6}
              className="w-full px-4 py-3 bg-mafia-secondary text-mafia-light rounded-lg border border-mafia-dark focus:border-mafia-accent focus:outline-none transition-colors mb-3"
            />
            <button
              onClick={handleJoinRoom}
              className="btn-secondary w-full"
            >
              🚪 방 참가하기
            </button>
          </div>
        </div>

        {/* 게임 설명 */}
        <div className="mt-6 text-center text-mafia-light text-sm opacity-75">
          <p>👥 4-16명이 함께 플레이</p>
          <p>⏰ 시간 단축 가능</p>
          <p>💬 실시간 채팅</p>
        </div>
      </div>
    </div>
  );
}
