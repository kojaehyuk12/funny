import { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import BackgroundMusic from '../components/BackgroundMusic';

export default function Game({ socket, roomId, roomData, setRoomData, playerName, onLeave }) {
  const [myRole, setMyRole] = useState(null);
  const [phase, setPhase] = useState(null);
  const [day, setDay] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [notification, setNotification] = useState(null);

  // 듀얼 채팅
  const [chatMessages, setChatMessages] = useState([]);
  const [mafiaMessages, setMafiaMessages] = useState([]);
  const [message, setMessage] = useState('');
  const chatRef = useRef(null);
  const mafiaChatRef = useRef(null);

  // 투표
  const [voteTarget, setVoteTarget] = useState(null);
  const [voteStatus, setVoteStatus] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);

  // 밤 행동
  const [nightTarget, setNightTarget] = useState(null);
  const [hasActed, setHasActed] = useState(false);

  // 처형 투표
  const [suspectId, setSuspectId] = useState(null);
  const [executionVote, setExecutionVote] = useState(null);
  const [executionStatus, setExecutionStatus] = useState({ killVotes: 0, liveVotes: 0 });

  const [gameOver, setGameOver] = useState(null);

  // 역할 정보 가져오기
  useEffect(() => {
    if (!roomData || !roomData.playerRoles || !socket) return;

    const myRoleData = roomData.playerRoles[socket.id];
    if (myRoleData) {
      setMyRole({ role: myRoleData.role, info: myRoleData.roleInfo });
    }
  }, [roomData, socket]);

  // Phase 변경 처리
  useEffect(() => {
    if (!socket) return;

    socket.on('phaseChanged', (data) => {
      setPhase(data.phase);
      setDay(data.day || 1);
      setTimeLeft(data.duration || 0);

      // Room 데이터 업데이트
      if (data.room) {
        setRoomData(data.room);
      }

      // Phase별 초기화
      if (data.phase === 'day') {
        setHasVoted(false);
        setVoteTarget(null);
        setVoteStatus([]);
      }

      if (data.phase === 'night') {
        setHasActed(false);
        setNightTarget(null);
      }

      if (data.phase === 'final_words') {
        setSuspectId(data.suspectId);
      }

      if (data.phase === 'execution_vote') {
        setSuspectId(data.suspectId);
        setExecutionVote(null);
        setExecutionStatus({ killVotes: 0, liveVotes: 0 });
      }

      // Reveal phase 모달
      if (data.phase === 'reveal' && data.players) {
        const duration = data.duration || 5;
        setNotification({
          title: '🎭 플레이어 번호 공개',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {data.players.map(p => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg ${
                      p.id === socket.id
                        ? 'bg-mafia-accent'
                        : 'bg-mafia-secondary'
                    }`}
                  >
                    <div className="text-3xl font-bold text-center">
                      #{p.anonymousNumber}
                    </div>
                    {p.id === socket.id && (
                      <div className="text-xs text-center text-mafia-gold">나</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center text-xl">
                {duration}초 후 게임 시작
              </div>
            </div>
          ),
          icon: '🎭'
        });

        setTimeout(() => {
          setNotification(null);
        }, duration * 1000);
      }
    });

    return () => {
      socket.off('phaseChanged');
    };
  }, [socket, setRoomData]);

  // 타이머
  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // 채팅 리스너
  useEffect(() => {
    if (!socket) return;

    socket.on('chatMessage', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('mafiaChat', (msg) => {
      setMafiaMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('chatMessage');
      socket.off('mafiaChat');
    };
  }, [socket]);

  // 자동 스크롤
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (mafiaChatRef.current) {
      mafiaChatRef.current.scrollTop = mafiaChatRef.current.scrollHeight;
    }
  }, [mafiaMessages]);

  // 투표 현황
  useEffect(() => {
    if (!socket) return;

    socket.on('voteStatusUpdate', ({ votes }) => {
      setVoteStatus(votes);
    });

    return () => {
      socket.off('voteStatusUpdate');
    };
  }, [socket]);

  // 처형 투표 현황
  useEffect(() => {
    if (!socket) return;

    socket.on('executionVoteStatus', ({ killVotes, liveVotes }) => {
      setExecutionStatus({ killVotes, liveVotes });
    });

    return () => {
      socket.off('executionVoteStatus');
    };
  }, [socket]);

  // 밤 결과
  useEffect(() => {
    if (!socket) return;

    socket.on('nightResults', ({ results, room }) => {
      if (room) setRoomData(room);

      const messages = [];
      if (results?.killed && results.killed.length > 0) {
        results.killed.forEach(victim => {
          messages.push(`💀 #${victim.anonymousNumber}번이 살해당했습니다!`);
        });
      }
      if (results?.saved && results.saved.length > 0) {
        messages.push('💉 의사가 누군가를 살렸습니다!');
      }

      // 경찰 조사 결과 (경찰에게만)
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
          content: messages.join('\n'),
          icon: '🌙'
        });

        setTimeout(() => setNotification(null), 5000);
      }
    });

    return () => {
      socket.off('nightResults');
    };
  }, [socket, setRoomData]);

  // 처형 결과
  useEffect(() => {
    if (!socket) return;

    socket.on('executionResult', (data) => {
      const { executed, player, killVotes, liveVotes, room } = data;
      if (room) setRoomData(room);

      if (executed && player) {
        setNotification({
          title: '⚖️ 처형 결과',
          content: `#${player.anonymousNumber}번이 처형되었습니다!\n\n죽이기: ${killVotes}표\n살리기: ${liveVotes}표\n직업: ${player.role}`,
          icon: '⚖️'
        });
      } else {
        setNotification({
          title: '⚖️ 처형 결과',
          content: `처형되지 않았습니다.\n\n죽이기: ${killVotes}표\n살리기: ${liveVotes}표`,
          icon: 'ℹ️'
        });
      }

      setTimeout(() => setNotification(null), 5000);
    });

    return () => {
      socket.off('executionResult');
    };
  }, [socket, setRoomData]);

  // 게임 종료
  useEffect(() => {
    if (!socket) return;

    socket.on('gameOver', ({ winner, reason, room }) => {
      if (room) setRoomData(room);
      setGameOver({ winner, reason });
    });

    return () => {
      socket.off('gameOver');
    };
  }, [socket, setRoomData]);

  // 채팅 전송
  const sendChat = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket.emit('chatMessage', { roomId, message });
    setMessage('');
  };

  const sendMafiaChat = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    socket.emit('mafiaChat', { roomId, message });
    setMessage('');
  };

  // 낮 투표
  const handleDayVote = () => {
    if (!voteTarget || hasVoted) return;
    socket.emit('dayVote', { roomId, targetId: voteTarget });
    setHasVoted(true);
  };

  // 밤 행동
  const handleNightAction = () => {
    if (!nightTarget || hasActed) return;

    const action = {
      action: myRole.role === 'mafia' ? 'kill' : myRole.role === 'doctor' ? 'save' : 'investigate',
      targetId: nightTarget
    };

    socket.emit('nightAction', { roomId, action });
    setHasActed(true);
  };

  // 처형 투표
  const handleExecutionVote = (vote) => {
    if (executionVote) return;
    socket.emit('executionVote', { roomId, vote });
    setExecutionVote(vote);
  };

  const currentPlayer = roomData?.players.find(p => p.id === socket?.id);
  const isAlive = currentPlayer && !currentPlayer.isDead;

  if (gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
        <div className="max-w-2xl w-full card text-center">
          <h1 className="text-5xl font-bold mb-4">
            {gameOver.winner === 'mafia' ? '🔪 마피아 승리!' : '👥 시민 승리!'}
          </h1>
          <p className="text-xl text-mafia-light mb-8">{gameOver.reason}</p>

          <div className="space-y-3 mb-8">
            {roomData?.players.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-mafia-secondary rounded-lg">
                <span className="font-semibold">#{p.anonymousNumber} - {p.name}</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  p.role === 'mafia' ? 'bg-red-500' : 'bg-blue-500'
                }`}>
                  {p.role}
                </span>
              </div>
            ))}
          </div>

          <button onClick={onLeave} className="btn-primary w-full">
            로비로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!myRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-mafia-accent mx-auto mb-4"></div>
          <p className="text-mafia-light text-xl">역할 배정 중...</p>
        </div>
      </div>
    );
  }

  const alivePlayers = roomData?.players.filter(p => !p.isDead) || [];

  return (
    <>
      <div className="min-h-screen p-4 bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* 헤더 */}
          <div className="card">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-mafia-gold">
                  {phase === 'reveal' && '🎭 플레이어 공개'}
                  {phase === 'waiting' && '⏳ 대기실'}
                  {phase === 'night' && '🌙 밤'}
                  {phase === 'day' && '☀️ 낮'}
                  {phase === 'final_words' && '💬 최후 변론'}
                  {phase === 'execution_vote' && '⚖️ 처형 투표'}
                </h2>
                <p className="text-mafia-light">
                  Day {day} | {timeLeft}초 남음
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">내 역할: {myRole.info?.name}</div>
                <div className="text-sm text-mafia-light">{myRole.info?.description}</div>
              </div>
            </div>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 왼쪽: 채팅 */}
            <div className="lg:col-span-2 space-y-4">
              {/* 일반 채팅 */}
              {phase !== 'night' && (
                <div className="card h-96 flex flex-col">
                  <h3 className="font-bold mb-3">💬 채팅</h3>
                  <div ref={chatRef} className="flex-1 overflow-y-auto space-y-2 mb-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="p-2 bg-mafia-secondary rounded">
                        <span className="font-bold text-mafia-accent">#{msg.anonymousNumber}: </span>
                        <span className="text-mafia-light">{msg.message}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="input flex-1"
                      placeholder="메시지 입력..."
                      disabled={!isAlive}
                    />
                    <button type="submit" className="btn-primary" disabled={!isAlive}>
                      전송
                    </button>
                  </form>
                </div>
              )}

              {/* 마피아 채팅 (밤에만) */}
              {phase === 'night' && myRole.role === 'mafia' && (
                <div className="card h-96 flex flex-col">
                  <h3 className="font-bold mb-3 text-red-500">🔪 마피아 채팅</h3>
                  <div ref={mafiaChatRef} className="flex-1 overflow-y-auto space-y-2 mb-3">
                    {mafiaMessages.map((msg, i) => (
                      <div key={i} className="p-2 bg-red-900/30 rounded">
                        <span className="font-bold text-red-400">#{msg.anonymousNumber}: </span>
                        <span className="text-mafia-light">{msg.message}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendMafiaChat} className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="input flex-1"
                      placeholder="마피아 전용 메시지..."
                      disabled={!isAlive}
                    />
                    <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700" disabled={!isAlive}>
                      전송
                    </button>
                  </form>
                </div>
              )}

              {/* 밤에 일반 플레이어는 대기 */}
              {phase === 'night' && myRole.role !== 'mafia' && (
                <div className="card h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🌙</div>
                    <h3 className="text-2xl font-bold mb-2">밤이 되었습니다</h3>
                    <p className="text-mafia-light">밤에는 채팅을 사용할 수 없습니다</p>
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽: 플레이어 & 액션 */}
            <div className="space-y-4">
              {/* 플레이어 목록 */}
              <div className="card">
                <h3 className="font-bold mb-3">👥 플레이어 ({alivePlayers.length}명)</h3>
                <div className="space-y-2">
                  {roomData?.players.map(p => (
                    <div
                      key={p.id}
                      className={`p-2 rounded ${
                        p.isDead ? 'bg-gray-700 opacity-50' : 'bg-mafia-secondary'
                      } ${p.id === socket?.id ? 'border-2 border-mafia-gold' : ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-mafia-accent">#{p.anonymousNumber}</span>
                        {p.isDead && <span className="text-red-500">💀</span>}
                        {p.id === socket?.id && <span className="text-mafia-gold text-xs">(나)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 낮 투표 */}
              {phase === 'day' && isAlive && (
                <div className="card">
                  <h3 className="font-bold mb-3">🗳️ 투표</h3>
                  <select
                    value={voteTarget || ''}
                    onChange={(e) => setVoteTarget(e.target.value)}
                    className="input w-full mb-3"
                    disabled={hasVoted}
                  >
                    <option value="">투표할 플레이어 선택</option>
                    {alivePlayers
                      .filter(p => p.id !== socket?.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.anonymousNumber}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleDayVote}
                    className="btn-primary w-full"
                    disabled={!voteTarget || hasVoted}
                  >
                    {hasVoted ? '✅ 투표 완료' : '투표하기'}
                  </button>

                  {/* 투표 현황 */}
                  {voteStatus.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-semibold">투표 현황</h4>
                      {voteStatus.map(v => (
                        <div key={v.targetId} className="text-sm">
                          #{v.anonymousNumber}: {v.votes}표
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 밤 행동 */}
              {phase === 'night' && isAlive && myRole.role !== 'citizen' && (
                <div className="card">
                  <h3 className="font-bold mb-3">
                    {myRole.role === 'mafia' && '🔪 살해 대상'}
                    {myRole.role === 'doctor' && '💉 보호 대상'}
                    {myRole.role === 'police' && '👮 조사 대상'}
                  </h3>
                  <select
                    value={nightTarget || ''}
                    onChange={(e) => setNightTarget(e.target.value)}
                    className="input w-full mb-3"
                    disabled={hasActed}
                  >
                    <option value="">대상 선택</option>
                    {alivePlayers
                      .filter(p => myRole.role === 'mafia' ? p.role !== 'mafia' : p.id !== socket?.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.anonymousNumber}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleNightAction}
                    className="btn-primary w-full"
                    disabled={!nightTarget || hasActed}
                  >
                    {hasActed ? '✅ 행동 완료' : '행동하기'}
                  </button>
                </div>
              )}

              {/* 최후 변론 */}
              {phase === 'final_words' && (
                <div className="card">
                  <h3 className="font-bold mb-3">💬 최후 변론</h3>
                  <div className="p-4 bg-mafia-secondary rounded-lg text-center">
                    <div className="text-4xl mb-2">
                      #{roomData?.players.find(p => p.id === suspectId)?.anonymousNumber}
                    </div>
                    <p className="text-mafia-light">최후 변론 중...</p>
                  </div>
                </div>
              )}

              {/* 처형 투표 */}
              {phase === 'execution_vote' && isAlive && (
                <div className="card">
                  <h3 className="font-bold mb-3">⚖️ 처형 투표</h3>
                  <div className="text-center mb-4">
                    <div className="text-3xl mb-2">
                      #{roomData?.players.find(p => p.id === suspectId)?.anonymousNumber}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleExecutionVote('kill')}
                      className={`btn-primary bg-red-600 hover:bg-red-700 ${executionVote === 'kill' ? 'ring-2 ring-white' : ''}`}
                      disabled={!!executionVote}
                    >
                      죽이기 ({executionStatus.killVotes})
                    </button>
                    <button
                      onClick={() => handleExecutionVote('live')}
                      className={`btn-primary bg-green-600 hover:bg-green-700 ${executionVote === 'live' ? 'ring-2 ring-white' : ''}`}
                      disabled={!!executionVote}
                    >
                      살리기 ({executionStatus.liveVotes})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {notification && (
        <Modal
          isOpen={true}
          onClose={() => setNotification(null)}
          title={notification.title}
          icon={notification.icon}
        >
          <div className="whitespace-pre-line">{notification.content}</div>
        </Modal>
      )}

      {/* BGM */}
      <BackgroundMusic
        track={phase === 'night' ? `${import.meta.env.BASE_URL}night.mp3` : `${import.meta.env.BASE_URL}moring.mp3`}
        volume={0.2}
      />
    </>
  );
}
