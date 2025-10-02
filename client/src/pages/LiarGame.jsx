import { useState, useEffect } from 'react';
import BackgroundMusic from '../components/BackgroundMusic';

export default function LiarGame({ socket, roomId, roomData, setRoomData, playerName, onLeave }) {
  const [phase, setPhase] = useState('waiting'); // waiting, turn_chat, free_chat, voting, keyword_guess, finished
  const [currentTurn, setCurrentTurn] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [myKeyword, setMyKeyword] = useState('');
  const [isLiar, setIsLiar] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [voteTarget, setVoteTarget] = useState(null);
  const [guessedKeyword, setGuessedKeyword] = useState('');
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('liarGameStarted', ({ keyword: myKw, isLiar: liar, turnOrder }) => {
      setMyKeyword(myKw);
      setIsLiar(liar);
      setPhase('turn_chat');
      setCurrentTurn(0);
    });

    socket.on('liarTurnChanged', ({ currentPlayerIndex, timeLeft: time }) => {
      setCurrentTurn(currentPlayerIndex);
      setTimeLeft(time);
    });

    socket.on('liarFreeChatStarted', ({ duration }) => {
      setPhase('free_chat');
      setTimeLeft(duration);
    });

    socket.on('liarVotingStarted', ({ duration }) => {
      setPhase('voting');
      setTimeLeft(duration);
      setVoteTarget(null);
    });

    socket.on('liarKeywordGuess', ({ liarId }) => {
      if (socket.id === liarId) {
        setPhase('keyword_guess');
      }
    });

    socket.on('liarGameEnd', ({ winner, liarPlayer, keyword: finalKeyword, guessedCorrectly }) => {
      setGameResult({
        winner,
        liarPlayer,
        keyword: finalKeyword,
        guessedCorrectly
      });
      setPhase('finished');
    });

    socket.on('liarChatMessage', (msg) => {
      setRoomData(prev => ({
        ...prev,
        chatMessages: [...(prev.chatMessages || []), msg]
      }));
    });

    return () => {
      socket.off('liarGameStarted');
      socket.off('liarTurnChanged');
      socket.off('liarFreeChatStarted');
      socket.off('liarVotingStarted');
      socket.off('liarKeywordGuess');
      socket.off('liarGameEnd');
      socket.off('liarChatMessage');
    };
  }, [socket, setRoomData]);

  const handleStartGame = () => {
    socket.emit('startLiarGame', { roomId });
  };

  const handleSendTurnMessage = () => {
    if (!message.trim()) return;
    socket.emit('liarTurnMessage', { roomId, message: message.trim() });
    setMessage('');
  };

  const handleSendFreeMessage = () => {
    if (!message.trim()) return;
    socket.emit('liarFreeMessage', { roomId, message: message.trim() });
    setMessage('');
  };

  const handleVote = (playerId) => {
    setVoteTarget(playerId);
    socket.emit('liarVote', { roomId, targetId: playerId });
  };

  const handleKeywordGuess = () => {
    if (!guessedKeyword.trim()) return;
    socket.emit('liarGuessKeyword', { roomId, keyword: guessedKeyword.trim() });
    setGuessedKeyword('');
  };

  const handleReturnToLobby = () => {
    setPhase('waiting');
    setGameResult(null);
    setRoomData(prev => ({ ...prev, chatMessages: [] }));
  };

  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
        <div className="text-mafia-light">로딩 중...</div>
      </div>
    );
  }

  const currentPlayer = roomData.players.find(p => p.id === socket?.id);
  const isHost = currentPlayer?.isHost;
  const currentTurnPlayer = roomData.players[currentTurn];
  const isMyTurn = currentTurnPlayer?.id === socket?.id;

  // 게임 종료 화면
  if (phase === 'finished' && gameResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
        <div className="max-w-2xl w-full card text-center backdrop-blur-sm">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-mafia-gold to-yellow-600 bg-clip-text text-transparent">
            🎭 게임 종료!
          </h1>
          <p className="text-2xl text-mafia-light mb-6">
            {gameResult.winner === 'liar' ? '🎭 라이어 승리!' : '👥 시민 승리!'}
          </p>

          <div className="mb-6 p-4 bg-mafia-primary/50 rounded-xl border border-mafia-secondary/30">
            <p className="text-mafia-light mb-2">
              라이어: <span className="text-mafia-accent font-bold">{gameResult.liarPlayer.name}</span>
            </p>
            <p className="text-mafia-light mb-2">
              제시어: <span className="text-mafia-gold font-bold">{gameResult.keyword}</span>
            </p>
            {gameResult.guessedCorrectly !== undefined && (
              <p className="text-mafia-light">
                라이어 추측: {gameResult.guessedCorrectly ? '✅ 성공' : '❌ 실패'}
              </p>
            )}
          </div>

          <button
            onClick={handleReturnToLobby}
            className="btn-primary w-full py-3 text-lg font-bold"
          >
            🏠 대기실로 돌아가기
          </button>
        </div>
        <BackgroundMusic track={`${import.meta.env.BASE_URL}liarbgm.mp3`} volume={0.2} />
      </div>
    );
  }

  // 대기 화면
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-6 bg-mafia-surface/50 backdrop-blur-sm p-4 rounded-2xl border border-mafia-secondary/30">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-mafia-gold to-yellow-600 bg-clip-text text-transparent">
                🎭 라이어 게임 대기실
              </h1>
              <p className="text-mafia-muted mt-1">방 코드: <span className="text-mafia-accent font-mono">{roomId}</span></p>
            </div>
            <button onClick={onLeave} className="btn-secondary">🚪 나가기</button>
          </header>

          <div className="card backdrop-blur-sm mb-6">
            <h2 className="text-xl font-bold text-mafia-gold mb-4">👥 플레이어 ({roomData.players.length}명)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {roomData.players.map(player => (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    player.isHost
                      ? 'border-mafia-gold shadow-glow-secondary bg-mafia-gold/5'
                      : 'border-mafia-secondary/40 bg-mafia-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{player.isHost ? '👑' : '👤'}</span>
                    <span className="font-semibold text-mafia-light">{player.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card backdrop-blur-sm mb-6">
            <h3 className="text-xl font-bold text-mafia-gold mb-3">📜 게임 규칙</h3>
            <ul className="space-y-2 text-mafia-light">
              <li>• 한 명이 라이어가 되어 제시어를 모릅니다</li>
              <li>• 순서대로 돌아가며 제시어에 대해 한마디씩 합니다</li>
              <li>• 자유 토론 시간 (2-3분) 후 투표로 라이어를 찾습니다</li>
              <li>• 라이어가 맞으면 제시어를 맞춰야 승리!</li>
              <li>• 라이어가 아니면 시민 승리!</li>
            </ul>
          </div>

          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={roomData.players.length < 3}
              className="w-full btn-primary text-lg py-3.5 font-extrabold"
            >
              {roomData.players.length < 3 ? '최소 3명 필요' : '🎮 게임 시작'}
            </button>
          )}
        </div>
        <BackgroundMusic track={`${import.meta.env.BASE_URL}liarbgm.mp3`} volume={0.2} />
      </div>
    );
  }

  // 게임 진행 화면
  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 bg-mafia-surface/50 backdrop-blur-sm p-4 rounded-2xl border border-mafia-secondary/30">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-mafia-gold">
                {phase === 'turn_chat' && '🗣️ 순서대로 발언'}
                {phase === 'free_chat' && '💬 자유 토론'}
                {phase === 'voting' && '🗳️ 투표 시간'}
                {phase === 'keyword_guess' && '🎯 제시어 맞추기'}
              </h1>
              <p className="text-mafia-light mt-1">
                {isLiar ? '당신은 라이어입니다! 🎭' : `제시어: ${myKeyword}`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-mafia-accent">{timeLeft}초</div>
              {phase === 'turn_chat' && currentTurnPlayer && (
                <p className="text-mafia-light text-sm mt-1">
                  현재 차례: <span className="font-bold">{currentTurnPlayer.name}</span>
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* 채팅 영역 */}
            <div className="card backdrop-blur-sm h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {(roomData.chatMessages || []).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.playerName === playerName ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.playerName === playerName
                          ? 'bg-gradient-to-r from-gray-100 to-white text-gray-900'
                          : 'bg-mafia-secondary/80 text-mafia-light'
                      }`}
                    >
                      <div className="font-bold text-xs mb-1">{msg.playerName}</div>
                      <div className="text-sm">{msg.message}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 입력창 */}
              {phase === 'turn_chat' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && isMyTurn && handleSendTurnMessage()}
                    placeholder={isMyTurn ? '메시지를 입력하세요...' : '자신의 차례를 기다리세요...'}
                    disabled={!isMyTurn}
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleSendTurnMessage}
                    disabled={!isMyTurn}
                    className="btn-primary px-6"
                  >
                    전송
                  </button>
                </div>
              )}

              {phase === 'free_chat' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendFreeMessage()}
                    placeholder="자유롭게 대화하세요..."
                    className="input-field flex-1"
                  />
                  <button onClick={handleSendFreeMessage} className="btn-primary px-6">
                    전송
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 플레이어 목록 & 투표/추측 */}
          <div className="lg:col-span-1">
            <div className="card backdrop-blur-sm">
              <h3 className="text-lg font-bold text-mafia-gold mb-4">👥 플레이어</h3>
              <div className="space-y-2">
                {roomData.players.map(player => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border transition-all ${
                      phase === 'turn_chat' && currentTurnPlayer?.id === player.id
                        ? 'border-mafia-accent bg-mafia-accent/10'
                        : voteTarget === player.id
                        ? 'border-mafia-gold bg-mafia-gold/10'
                        : 'border-mafia-secondary/30 bg-mafia-primary/30'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-mafia-light font-semibold">{player.name}</span>
                      {phase === 'voting' && player.id !== socket.id && (
                        <button
                          onClick={() => handleVote(player.id)}
                          disabled={voteTarget !== null}
                          className="text-xs btn-primary py-1 px-3"
                        >
                          {voteTarget === player.id ? '✓' : '투표'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {phase === 'keyword_guess' && isLiar && (
                <div className="mt-6 pt-6 border-t border-mafia-secondary/30">
                  <h4 className="text-mafia-gold font-bold mb-3">🎯 제시어를 맞춰보세요!</h4>
                  <input
                    type="text"
                    value={guessedKeyword}
                    onChange={(e) => setGuessedKeyword(e.target.value)}
                    placeholder="제시어 입력..."
                    className="input-field mb-3"
                  />
                  <button onClick={handleKeywordGuess} className="btn-primary w-full">
                    제출
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <BackgroundMusic track={`${import.meta.env.BASE_URL}lairgame.mp3`} volume={0.2} />
    </div>
  );
}
