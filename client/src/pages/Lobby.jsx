import { useState, useEffect } from 'react';
import ChatBox from '../components/ChatBox';
import BackgroundMusic from '../components/BackgroundMusic';

export default function Lobby({ socket, roomId, roomData, setRoomData, playerName, onLeave }) {
  const [isHost, setIsHost] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handlePlayerJoined = ({ player, room }) => setRoomData(room);
    const handlePlayerLeft = ({ playerId, playerName }) => {
      setRoomData(prev => ({ ...prev, players: prev.players.filter(p => p.id !== playerId) }));
    };
    const handleHostChanged = ({ newHostId }) => {
      setRoomData(prev => ({ ...prev, players: prev.players.map(p => ({ ...p, isHost: p.id === newHostId })) }));
    };
    const handlePlayerReadyUpdate = ({ room }) => setRoomData(room);
    const handleChatMessage = (message) => {
      setRoomData(prev => ({ ...prev, chatMessages: [...(prev.chatMessages || []), message] }));
    };
    const handleRoomUpdated = (newRoomData) => setRoomData(newRoomData);

    socket.on('playerJoined', handlePlayerJoined);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('hostChanged', handleHostChanged);
    socket.on('playerReadyUpdate', handlePlayerReadyUpdate);
    socket.on('chatMessage', handleChatMessage);
    socket.on('roomUpdated', handleRoomUpdated);

    return () => {
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('hostChanged', handleHostChanged);
      socket.off('playerReadyUpdate', handlePlayerReadyUpdate);
      socket.off('chatMessage', handleChatMessage);
      socket.off('roomUpdated', handleRoomUpdated);
    };
  }, [socket, setRoomData]);

  useEffect(() => {
    if (roomData && socket) {
      const currentPlayer = roomData.players.find(p => p.id === socket.id);
      setIsHost(currentPlayer?.isHost || false);
    }
  }, [roomData, socket]);

  const handleStartGame = () => {
    if (!isHost) return;
    socket.emit('startGame', { roomId });
  };

  const handleReady = () => socket.emit('playerReady', { roomId });

  const copyToClipboard = (text, message) => {
    navigator.clipboard.writeText(text).then(() => alert(message));
  };

  if (!roomData) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;

  const currentPlayer = roomData.players.find(p => p.id === socket?.id);
  const canStart = isHost && roomData.players.length >= roomData.settings.minPlayers;

  const handleSaveSettings = (newSettings) => {
    socket.emit('updateSettings', { roomId, newSettings });
    setSettingsModalOpen(false);
  };

  return (
    <div className="min-h-screen p-4 lg:p-6 animate-fade-in bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6 bg-mafia-surface/50 backdrop-blur-sm p-4 rounded-2xl border border-mafia-secondary/30">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-mafia-gold to-yellow-600 bg-clip-text text-transparent">🚪 대기실</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <p className="text-mafia-light">
                방 코드: <span className="font-mono font-bold text-xl text-mafia-accent">{roomId}</span>
              </p>
              <button onClick={() => copyToClipboard(roomId, '방 코드가 복사되었습니다!')} className="bg-mafia-secondary/80 hover:bg-mafia-secondary text-mafia-light py-1 px-3 text-sm rounded-lg transition-all">📋</button>
              <button onClick={() => copyToClipboard(`${window.location.origin}/funny/?room=${roomId}`, '초대 링크가 복사되었습니다!')} className="bg-mafia-secondary/80 hover:bg-mafia-secondary text-mafia-light py-1 px-3 text-sm rounded-lg transition-all">🔗</button>
            </div>
          </div>
          <button onClick={onLeave} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-2 px-4 rounded-lg transition-all">🚪 나가기</button>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card backdrop-blur-sm">
              <h2 className="text-xl font-bold text-mafia-gold mb-4">👥 플레이어 ({roomData.players.length}/{roomData.settings.maxPlayers})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {roomData.players.map(player => (
                  <div key={player.id} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between ${player.isHost ? 'border-mafia-gold shadow-glow-secondary bg-mafia-gold/5' : player.isReady ? 'border-green-500 bg-green-500/5' : 'border-mafia-secondary/40 bg-mafia-primary/30'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{player.isHost ? '👑' : '👤'}</span>
                      <span className="font-semibold text-mafia-light">{player.name}</span>
                    </div>
                    {player.isReady && !player.isHost && <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-bold">READY</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="card backdrop-blur-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-bold text-mafia-gold">⚙️ 게임 설정</h3>
                {isHost && <button onClick={() => setSettingsModalOpen(true)} className="btn-primary py-1.5 px-4 text-sm">⚙️ 변경</button>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-mafia-light p-4 bg-mafia-primary/50 rounded-xl border border-mafia-secondary/30">
                <p className="flex items-center gap-2"><span>⏰</span><span>낮: {roomData.settings.dayDuration}초</span></p>
                <p className="flex items-center gap-2"><span>🌙</span><span>밤: {roomData.settings.nightDuration}초</span></p>
                <p className="flex items-center gap-2"><span>🔪</span><span>마피아: {roomData.settings.roles.mafia}명</span></p>
                <p className="flex items-center gap-2"><span>💉</span><span>의사: {roomData.settings.roles.doctor}명</span></p>
                <p className="flex items-center gap-2"><span>👮</span><span>경찰: {roomData.settings.roles.police}명</span></p>
                <p className="flex items-center gap-2"><span>👥</span><span>시민: 나머지</span></p>
              </div>
            </div>

            <div>
              {isHost ? (
                <button onClick={handleStartGame} disabled={!canStart} className="w-full btn-primary text-lg py-3">
                  {canStart ? '🎮 게임 시작' : `최소 ${roomData.settings.minPlayers}명 필요`}
                </button>
              ) : (
                <button onClick={handleReady} className={`w-full text-lg py-3 ${currentPlayer?.isReady ? 'bg-error text-white font-bold rounded-lg' : 'btn-primary'}`}>
                  {currentPlayer?.isReady ? '❌ 준비 취소' : '✅ 준비 완료'}
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <ChatBox socket={socket} roomId={roomId} playerName={playerName} messages={roomData.chatMessages || []} isLobby={true} />
          </div>
        </main>

        {isSettingsModalOpen && <SettingsModal settings={roomData.settings} onClose={() => setSettingsModalOpen(false)} onSave={handleSaveSettings} />}
        <BackgroundMusic track="/lobby.mp3" volume={0.2} />
      </div>
    </div>
  );
}

function SettingsModal({ settings, onClose, onSave }) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const [category, key] = name.split('.');

    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) return;

    if (category === 'roles') {
      setLocalSettings(prev => ({ ...prev, roles: { ...prev.roles, [key]: parsedValue } }));
    } else {
      setLocalSettings(prev => ({ ...prev, [name]: parsedValue }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(localSettings);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
      <div className="card w-full max-w-md animate-slide-up">
        <h2 className="text-2xl font-bold text-primary mb-6">게임 설정 변경</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2"><span>최소 인원</span><input type="number" name="minPlayers" value={localSettings.minPlayers} onChange={handleChange} className="input-field" min="1" max="12" /></label>
            <label className="flex flex-col gap-2"><span>최대 인원</span><input type="number" name="maxPlayers" value={localSettings.maxPlayers} onChange={handleChange} className="input-field" min={localSettings.minPlayers} max="12" /></label>
            <label className="flex flex-col gap-2"><span>낮 시간 (초)</span><input type="number" name="dayDuration" value={localSettings.dayDuration} onChange={handleChange} className="input-field" min="10" step="5" /></label>
            <label className="flex flex-col gap-2"><span>밤 시간 (초)</span><input type="number" name="nightDuration" value={localSettings.nightDuration} onChange={handleChange} className="input-field" min="10" step="5" /></label>
          </div>
          <h3 className="text-lg font-bold text-primary pt-4 border-t border-dark-secondary">직업 설정</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2"><span>마피아</span><input type="number" name="roles.mafia" value={localSettings.roles.mafia} onChange={handleChange} className="input-field" min="1" /></label>
            <label className="flex flex-col gap-2"><span>의사</span><input type="number" name="roles.doctor" value={localSettings.roles.doctor} onChange={handleChange} className="input-field" min="0" /></label>
            <label className="flex flex-col gap-2"><span>경찰</span><input type="number" name="roles.police" value={localSettings.roles.police} onChange={handleChange} className="input-field" min="0" /></label>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary">취소</button>
            <button type="submit" className="btn-primary">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}
