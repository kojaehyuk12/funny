import { useState, useEffect } from 'react';
import ChatBox from '../components/ChatBox';
import RoleInfo from '../components/RoleInfo';
import PlayerList from '../components/PlayerList';
import PhaseTimer from '../components/PhaseTimer';
import VotePanel from '../components/VotePanel';
import NightActionPanel from '../components/NightActionPanel';
import Modal from '../components/Modal';
import BackgroundMusic from '../components/BackgroundMusic';

export default function Game({ socket, roomId, roomData, setRoomData, playerName, onLeave }) {
  const [myRole, setMyRole] = useState(null);
  const [phase, setPhase] = useState(null);
  const [day, setDay] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showAnonymousNumbers, setShowAnonymousNumbers] = useState(false);
  const [anonymousPlayers, setAnonymousPlayers] = useState([]);

  // roomData에서 내 역할 정보 추출
  useEffect(() => {
    if (roomData?.playerRoles && socket?.id) {
      const myRoleData = roomData.playerRoles[socket.id];
      if (myRoleData) {
        console.log('✅ Role found in roomData:', myRoleData);
        setMyRole({ role: myRoleData.role, info: myRoleData.roleInfo });
      }
    }
  }, [roomData, socket]);

  useEffect(() => {
    if (!socket) return;

    // 익명 번호 공개
    socket.on('anonymousNumbersRevealed', ({ players, duration }) => {
      console.log('🎭 Anonymous numbers revealed:', players);
      setAnonymousPlayers(players);
      setShowAnonymousNumbers(true);
      setTimeLeft(duration);

      // duration 후 익명번호 화면 숨김
      setTimeout(() => {
        setShowAnonymousNumbers(false);
      }, duration * 1000);
    });

    // 역할 배정 (백업용 - 혹시 개별 전송되면 받기)
    socket.on('roleAssigned', ({ role, roleInfo }) => {
      console.log('✅ Role assigned via event:', role, roleInfo);
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
      const messages = [];
      if (results?.killed && results.killed.length > 0) {
        results.killed.forEach(victim => {
          const victimDisplay = victim.name || `#${victim.anonymousNumber || victim.id}`;
          messages.push(`💀 ${victimDisplay}님이 마피아에게 살해당했습니다!`);
        });
      }
      if (results?.saved && results.saved.length > 0) {
        messages.push('💉 의사가 누군가를 살렸습니다!');
      }

      // 경찰 조사 결과 (경찰에게만 표시)
      if (results?.investigated && results.investigated.length > 0) {
        results.investigated.forEach(inv => {
          if (inv.investigatorId === socket?.id) {
            messages.push(`👮 조사 결과: #${inv.targetNumber}번은 ${inv.result}`);
          }
        });
      }

      if (messages.length > 0) {
        setNotification({
          title: '🌙 밤 결과',
          message: messages.join('\n'),
          icon: '🌙'
        });
      }
    });

    // 처형 결과
    socket.on('playerExecuted', (data) => {
      const { player, room } = data;
      setRoomData(room);

      if (data.executed && player) {
        // 과반수 달성 - 처형됨
        const playerDisplay = player.name || `#${player.anonymousNumber}`;
        setNotification({
          title: '⚖️ 처형 결과',
          message: `${playerDisplay}님이 투표로 처형되었습니다!\n\n득표: ${data.votes}표 (필요: ${data.required}표)\n직업: ${player.role}`,
          icon: '⚖️'
        });
      } else if (!data.executed && data.suspect) {
        // 과반수 미달 - 처형 없음
        const suspectDisplay = data.suspect.name || `#${data.suspect.anonymousNumber}`;
        setNotification({
          title: '⚖️ 처형 결과',
          message: `과반수 미달로 처형되지 않았습니다.\n\n최다 득표: ${suspectDisplay} (${data.votes}표)\n필요 득표: ${data.required}표`,
          icon: 'ℹ️'
        });
      } else {
        // 아무도 투표 안함
        setNotification({
          title: '⚖️ 처형 결과',
          message: '투표가 없어 아무도 처형되지 않았습니다.',
          icon: 'ℹ️'
        });
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
      socket.off('anonymousNumbersRevealed');
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

  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-mafia-accent mx-auto mb-4"></div>
          <p className="text-mafia-light text-xl">게임 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!myRole) {
    console.log('⚠️ Role not assigned yet, roomData:', roomData);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-mafia-accent mx-auto mb-4"></div>
          <p className="text-mafia-light text-xl">역할 배정 중...</p>
          <p className="text-mafia-light text-sm mt-2 opacity-75">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 익명 번호 공개 화면
  if (showAnonymousNumbers) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
        <div className="card backdrop-blur-sm max-w-4xl w-full">
          <h1 className="text-4xl font-bold text-mafia-gold mb-2 text-center animate-pulse">
            🎭 플레이어 번호 공개
          </h1>
          <p className="text-mafia-light text-center mb-8 text-lg">
            게임 중에는 번호로만 식별됩니다
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {anonymousPlayers.map(player => {
              const playerData = roomData.players.find(p => p.id === player.id);
              const isMe = player.id === socket?.id;

              return (
                <div
                  key={player.id}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    isMe
                      ? 'bg-gradient-to-br from-mafia-accent to-red-700 border-mafia-gold shadow-glow-primary scale-105'
                      : 'bg-mafia-primary border-mafia-secondary/30 hover:border-mafia-accent/50'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-5xl font-bold mb-2 ${isMe ? 'text-white' : 'text-mafia-accent'}`}>
                      {player.anonymousNumber}
                    </div>
                    {isMe && (
                      <div className="text-mafia-gold text-sm font-semibold">
                        나
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <div className="text-5xl font-bold text-mafia-gold mb-2 animate-pulse">
              {timeLeft}
            </div>
            <p className="text-mafia-light text-xl">
              초 후 첫날 아침이 시작됩니다
            </p>
          </div>
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

          <div className="flex gap-3">
            <button
              onClick={() => {
                setGameOver(null);
                window.location.href = '/funny/';
              }}
              className="flex-1 btn-primary"
            >
              🏠 홈으로
            </button>
            <button
              onClick={() => {
                setGameOver(null);
                onLeave();
              }}
              className="flex-1 btn-secondary"
            >
              🔄 다시하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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
              myRole={myRole}
            />
          </div>
        </div>
      </div>
    </div>

    {/* 알림 모달 */}
    {notification && (
      <Modal
        isOpen={true}
        onClose={() => setNotification(null)}
        title={notification.title}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">{notification.icon}</div>
          <p className="text-mafia-light text-lg whitespace-pre-line">
            {notification.message}
          </p>
          <button
            onClick={() => setNotification(null)}
            className="mt-6 btn-primary w-full"
          >
            확인
          </button>
        </div>
      </Modal>
    )}

    {/* 배경 음악 - phase에 따라 변경 */}
    <BackgroundMusic
      track={phase === 'night' ? `${import.meta.env.BASE_URL}night.mp3` : `${import.meta.env.BASE_URL}moring.mp3`}
      volume={0.2}
    />
    </>
  );
}
