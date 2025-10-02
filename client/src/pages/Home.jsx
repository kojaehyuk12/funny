import { useState, useEffect } from 'react';

export default function Home({ onCreateRoom, onJoinRoom, autoJoinRoom }) {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // URL로 방 코드가 전달되면 자동 세팅
  useEffect(() => {
    if (autoJoinRoom) {
      setRoomId(autoJoinRoom.toUpperCase());
    }
  }, [autoJoinRoom]);
  const [settings, setSettings] = useState({
    minPlayers: 1, // 테스트용: 1명으로 변경
    maxPlayers: 12,
    dayDuration: 30, // 테스트용: 30초로 단축
    nightDuration: 20, // 테스트용: 20초로 단축
    roles: {
      mafia: 1, // 테스트용: 1명만
      doctor: 0,
      police: 0,
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
      <div className="max-w-5xl w-full">
        {/* 타이틀 */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-6xl font-bold text-mafia-accent mb-2">
            🎭 마피아
          </h1>
          <p className="text-mafia-light text-lg">
            실시간 온라인 마피아 게임
          </p>
        </div>

        {/* 닉네임 입력 */}
        <div className="card mb-6 animate-slide-up">
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

        {/* 방 만들기 / 참가하기 가로 배치 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
          {/* 방 만들기 */}
          <div className="card">
            <h2 className="text-2xl font-bold text-mafia-accent mb-4">🎮 방 만들기</h2>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-primary w-full mb-4"
            >
              {showSettings ? '설정 닫기' : '게임 설정'}
            </button>

            {showSettings && (
              <div className="p-4 bg-mafia-secondary rounded-lg space-y-3 animate-fade-in mb-4">
                <div>
                  <label className="block text-sm text-mafia-light mb-1">
                    최대 인원: {settings.maxPlayers}명
                  </label>
                  <input
                    type="range"
                    min="1"
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
                    min="10"
                    max="120"
                    step="10"
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
                    min="5"
                    max="60"
                    step="5"
                    value={settings.nightDuration}
                    onChange={(e) => setSettings({
                      ...settings,
                      nightDuration: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleCreateRoom}
              className="btn-primary w-full text-lg py-4"
            >
              방 생성하기
            </button>
          </div>

          {/* 방 참가하기 */}
          <div className="card">
            <h2 className="text-2xl font-bold text-mafia-accent mb-4">🚪 방 참가하기</h2>

            <label className="block text-mafia-light font-semibold mb-2">
              방 코드
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="6자리 방 코드 입력"
              maxLength={6}
              className="w-full px-4 py-3 bg-mafia-secondary text-mafia-light rounded-lg border border-mafia-dark focus:border-mafia-accent focus:outline-none transition-colors mb-4 text-center text-2xl font-mono tracking-widest"
            />

            <button
              onClick={handleJoinRoom}
              className="btn-secondary w-full text-lg py-4"
            >
              참가하기
            </button>
          </div>
        </div>

        {/* 게임 설명 */}
        <div className="mt-8 text-center text-mafia-light text-sm opacity-75 space-y-1">
          <p>👥 1-16명이 함께 플레이 | ⏰ 시간 단축 가능 | 💬 실시간 채팅</p>
        </div>
      </div>
    </div>
  );
}
