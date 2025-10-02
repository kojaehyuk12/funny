import { useState, useEffect } from 'react';
import ChatBox from '../components/ChatBox';

export default function Lobby({ socket, roomId, roomData, setRoomData, playerName, onLeave }) {
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // 플레이어 참가
    socket.on('playerJoined', ({ player, room }) => {
      setRoomData(room);
    });

    // 플레이어 나감
    socket.on('playerLeft', ({ playerId, playerName }) => {
      // roomData에서 플레이어 제거
      setRoomData(prev => ({
        ...prev,
        players: prev.players.filter(p => p.id !== playerId)
      }));
    });

    // 호스트 변경
    socket.on('hostChanged', ({ newHostId, newHostName }) => {
      setRoomData(prev => ({
        ...prev,
        players: prev.players.map(p => ({
          ...p,
          isHost: p.id === newHostId
        }))
      }));
    });

    // 준비 상태 업데이트
    socket.on('playerReadyUpdate', ({ playerId, room }) => {
      setRoomData(room);
    });

    // 채팅 메시지 수신 (즉시 업데이트)
    socket.on('chatMessage', (message) => {
      setRoomData(prev => ({
        ...prev,
        chatMessages: [...(prev.chatMessages || []), message]
      }));
    });

    return () => {
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('hostChanged');
      socket.off('playerReadyUpdate');
      socket.off('chatMessage');
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

  const handleReady = () => {
    socket.emit('playerReady', { roomId });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    alert('방 코드가 복사되었습니다!');
  };

  const shareRoomURL = () => {
    const shareURL = `${window.location.origin}/funny/?room=${roomId}`;
    navigator.clipboard.writeText(shareURL);
    alert('방 링크가 복사되었습니다!\n친구에게 공유해보세요.');
  };

  if (!roomData) return null;

  const currentPlayer = roomData.players.find(p => p.id === socket?.id);
  const canStart = isHost && roomData.players.length >= roomData.settings.minPlayers;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-mafia-accent">
              🎭 대기실
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-mafia-light">
                방 코드: <span className="font-mono font-bold text-xl">{roomId}</span>
              </p>
              <button
                onClick={copyRoomCode}
                className="px-3 py-1 bg-mafia-secondary hover:bg-mafia-primary rounded text-sm transition-colors"
              >
                📋 코드 복사
              </button>
              <button
                onClick={shareRoomURL}
                className="px-3 py-1 bg-mafia-accent hover:bg-red-600 rounded text-sm transition-colors"
              >
                🔗 링크 공유
              </button>
            </div>
          </div>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            🚪 나가기
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 플레이어 목록 */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-bold text-mafia-light mb-4">
                플레이어 ({roomData.players.length}/{roomData.settings.maxPlayers})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roomData.players.map(player => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      player.isHost
                        ? 'bg-mafia-accent border-mafia-accent'
                        : player.isReady
                        ? 'bg-green-600 border-green-500'
                        : 'bg-mafia-secondary border-mafia-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {player.isHost ? '👑' : '👤'}
                        </span>
                        <span className="font-semibold text-mafia-light">
                          {player.name}
                        </span>
                      </div>
                      {player.isReady && !player.isHost && (
                        <span className="text-xs bg-green-700 px-2 py-1 rounded">
                          준비완료
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 게임 설정 정보 */}
              <div className="mt-6 p-4 bg-mafia-secondary rounded-lg">
                <h3 className="font-bold text-mafia-light mb-2">게임 설정</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-mafia-light">
                  <div>⏰ 낮 시간: {roomData.settings.dayDuration}초</div>
                  <div>🌙 밤 시간: {roomData.settings.nightDuration}초</div>
                  <div>🔪 마피아: {roomData.settings.roles.mafia}명</div>
                  <div>💉 의사: {roomData.settings.roles.doctor}명</div>
                  <div>👮 경찰: {roomData.settings.roles.police}명</div>
                  <div>👥 시민: 나머지</div>
                </div>
              </div>

              {/* 준비/시작 버튼 */}
              <div className="mt-6">
                {isHost ? (
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                      canStart
                        ? 'btn-primary'
                        : 'bg-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {canStart
                      ? '🎮 게임 시작'
                      : `최소 ${roomData.settings.minPlayers}명 필요`}
                  </button>
                ) : (
                  <button
                    onClick={handleReady}
                    className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                      currentPlayer?.isReady
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'btn-primary'
                    }`}
                  >
                    {currentPlayer?.isReady ? '❌ 준비 취소' : '✅ 준비 완료'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 채팅 */}
          <div className="lg:col-span-1">
            <ChatBox
              socket={socket}
              roomId={roomId}
              playerName={playerName}
              messages={roomData.chatMessages || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
