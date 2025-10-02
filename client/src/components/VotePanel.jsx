import { useState } from 'react';

export default function VotePanel({ socket, roomId, players, currentPlayerId }) {
  const [selectedTarget, setSelectedTarget] = useState(null);

  const handleVote = () => {
    if (!selectedTarget) return;

    socket.emit('voteDayExecution', {
      roomId,
      targetId: selectedTarget
    });

    alert('투표 완료!');
  };

  const alivePlayers = players.filter(p => !p.isDead && p.id !== currentPlayerId);

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-mafia-light mb-4">
        ⚖️ 처형 투표
      </h2>

      <p className="text-mafia-light mb-4">
        용의자를 선택하고 투표하세요. 가장 많은 표를 받은 사람이 처형됩니다.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {alivePlayers.map(player => (
          <button
            key={player.id}
            onClick={() => setSelectedTarget(player.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedTarget === player.id
                ? 'bg-red-600 border-red-500'
                : 'bg-mafia-secondary border-mafia-dark hover:border-mafia-accent'
            }`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">👤</div>
              <div className="font-semibold text-mafia-light">
                {player.name}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleVote}
        disabled={!selectedTarget}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedTarget
          ? `${players.find(p => p.id === selectedTarget)?.name}에게 투표하기`
          : '처형할 대상을 선택하세요'}
      </button>
    </div>
  );
}
