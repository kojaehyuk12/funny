import { useState, useEffect } from 'react';
import ChatBox from '../components/ChatBox';
import RoleInfo from '../components/RoleInfo';
import PlayerList from '../components/PlayerList';
import PhaseTimer from '../components/PhaseTimer';
import VotePanel from '../components/VotePanel';
import NightActionPanel from '../components/NightActionPanel';

export default function Game({ socket, roomId, roomData, setRoomData, playerName, onLeave }) {
  const [myRole, setMyRole] = useState(null);
  const [phase, setPhase] = useState(null);
  const [day, setDay] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // 역할 배정
    socket.on('roleAssigned', ({ role, roleInfo }) => {
      console.log('✅ Role assigned:', role, roleInfo);
      setMyRole({ role, info: roleInfo });
    });

    // 페이즈 변경
    socket.on('phaseChanged', ({ phase, day, duration }) => {
      setPhase(phase);
      setDay(day);
      setTimeLeft(duration);
    });

    // 밤 결과
    socket.on('nightResults', (data) => {
      // 데이터 구조 확인
      const results = data?.results || data;
      const room = data?.room;

      if (room) setRoomData(room);

      // 결과 알림
      if (results?.killed && results.killed.length > 0) {
        results.killed.forEach(victim => {
          alert(`💀 ${victim.name}님이 마피아에게 살해당했습니다!`);
        });
      }
      if (results?.saved && results.saved.length > 0) {
        alert('💉 의사가 누군가를 살렸습니다!');
      }
    });

    // 처형 결과
    socket.on('playerExecuted', ({ player, room }) => {
      setRoomData(room);
      if (player) {
        alert(`⚖️ ${player.name}님이 투표로 처형되었습니다! (직업: ${player.role})`);
      } else {
        alert('⚖️ 동점으로 아무도 처형되지 않았습니다.');
      }
    });

    // 게임 종료
    socket.on('gameOver', ({ winner, reason, room }) => {
      setRoomData(room);
      setGameOver({ winner, reason });
    });

    // 시간 스킵 투표
    socket.on('timeSkipVoted', ({ votesNeeded, currentVotes }) => {
      // 투표 현황 표시 가능
    });

    socket.on('timeSkipped', ({ phase }) => {
      setPhase(phase);
    });

    // 채팅 메시지 수신 (즉시 업데이트)
    socket.on('chatMessage', (message) => {
      setRoomData(prev => ({
        ...prev,
        chatMessages: [...(prev.chatMessages || []), message]
      }));
    });

    return () => {
      socket.off('roleAssigned');
      socket.off('phaseChanged');
      socket.off('nightResults');
      socket.off('playerExecuted');
      socket.off('gameOver');
      socket.off('timeSkipVoted');
      socket.off('timeSkipped');
      socket.off('chatMessage');
    };
  }, [socket, setRoomData]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleVoteSkip = () => {
    socket.emit('voteSkipTime', { roomId });
  };

  if (!roomData || !myRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-mafia-accent mx-auto mb-4"></div>
          <p className="text-mafia-light text-xl">게임 로딩 중...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = roomData.players.find(p => p.id === socket?.id);
  const isAlive = currentPlayer && !currentPlayer.isDead;

  if (gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full card text-center">
          <h1 className="text-5xl font-bold mb-4">
            {gameOver.winner === 'mafia' ? '🔪 마피아 승리!' : '👥 시민 승리!'}
          </h1>
          <p className="text-xl text-mafia-light mb-6">{gameOver.reason}</p>

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">최종 결과</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roomData.players.map(player => (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg ${
                    player.isDead
                      ? 'bg-gray-700 opacity-50'
                      : myRole.info.team === 'mafia' && player.role === 'mafia'
                      ? 'bg-red-600'
                      : 'bg-mafia-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{player.name}</span>
                    <span className="text-sm">
                      {player.role === 'mafia' ? '🔪' :
                       player.role === 'doctor' ? '💉' :
                       player.role === 'police' ? '👮' : '👤'}
                      {' '}{player.role}
                    </span>
                  </div>
                  {player.isDead && <span className="text-xs text-gray-400">💀 사망</span>}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onLeave}
            className="btn-primary"
          >
            🏠 홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* 상단 헤더 */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-mafia-accent">🎭 마피아 게임</h1>
            <div className="flex items-center gap-4 mt-2 text-mafia-light">
              <span>방 코드: <strong className="font-mono">{roomId}</strong></span>
              <span>Day {day}</span>
            </div>
          </div>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            🚪 나가기
          </button>
        </div>

        {/* 내 역할 정보 */}
        <RoleInfo role={myRole} isAlive={isAlive} />

        {/* 페이즈 타이머 */}
        <PhaseTimer
          phase={phase}
          timeLeft={timeLeft}
          onVoteSkip={handleVoteSkip}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* 게임 영역 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 플레이어 목록 */}
            <PlayerList
              players={roomData.players}
              myRole={myRole}
              phase={phase}
            />

            {/* 행동 패널 */}
            {isAlive && (
              <>
                {phase === 'day' && (
                  <VotePanel
                    socket={socket}
                    roomId={roomId}
                    players={roomData.players}
                    currentPlayerId={socket.id}
                  />
                )}

                {phase === 'night' && myRole.info.nightAction && (
                  <NightActionPanel
                    socket={socket}
                    roomId={roomId}
                    players={roomData.players}
                    myRole={myRole}
                    currentPlayerId={socket.id}
                  />
                )}
              </>
            )}
          </div>

          {/* 채팅 */}
          <div className="lg:col-span-1">
            <ChatBox
              socket={socket}
              roomId={roomId}
              playerName={playerName}
              messages={roomData.chatMessages || []}
              isAlive={isAlive}
              phase={phase}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
