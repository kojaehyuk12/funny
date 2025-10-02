import { useState } from 'react';
import Modal from './Modal';

export default function VotePanel({ socket, roomId, players, currentPlayerId }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const handleVoteClick = () => {
    if (!selectedTarget || hasVoted) return;
    setShowConfirmModal(true);
  };

  const confirmVote = () => {
    socket.emit('voteDayExecution', {
      roomId,
      targetId: selectedTarget
    });

    setHasVoted(true);
    setShowConfirmModal(false);
    setShowResultModal(true);
  };

  const alivePlayers = players.filter(p => !p.isDead && p.id !== currentPlayerId);
  const selectedPlayerName = players.find(p => p.id === selectedTarget)?.name;

  return (
    <>
      <div className="card">
        <h2 className="text-xl font-bold text-mafia-light mb-4">
          ⚖️ 처형 투표 {hasVoted && <span className="text-green-400 text-sm">(투표 완료 ✓)</span>}
        </h2>

        <p className="text-mafia-light mb-4">
          용의자를 선택하고 투표하세요. 가장 많은 표를 받은 사람이 처형됩니다.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {alivePlayers.map(player => (
            <button
              key={player.id}
              onClick={() => !hasVoted && setSelectedTarget(player.id)}
              disabled={hasVoted}
              className={`p-4 rounded-lg border-2 transition-all ${
                hasVoted
                  ? 'opacity-50 cursor-not-allowed bg-mafia-secondary border-mafia-dark'
                  : selectedTarget === player.id
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
          onClick={handleVoteClick}
          disabled={!selectedTarget || hasVoted}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasVoted
            ? '투표 완료되었습니다'
            : selectedTarget
            ? `${selectedPlayerName}에게 투표하기`
            : '처형할 대상을 선택하세요'}
        </button>
      </div>

      {/* 투표 확인 모달 */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="⚖️ 투표 확인"
      >
        <div className="text-center">
          <p className="text-mafia-light mb-6 text-lg">
            <strong className="text-red-400">{selectedPlayerName}</strong>님을<br />
            처형 대상으로 투표하시겠습니까?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 px-4 py-3 bg-mafia-secondary hover:bg-mafia-dark rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={confirmVote}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-bold"
            >
              투표하기
            </button>
          </div>
        </div>
      </Modal>

      {/* 투표 완료 모달 */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="✓ 투표 완료"
      >
        <div className="text-center">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-mafia-light text-lg">
            <strong className="text-red-400">{selectedPlayerName}</strong>님에게<br />
            투표가 완료되었습니다!
          </p>
          <button
            onClick={() => setShowResultModal(false)}
            className="mt-6 btn-primary w-full"
          >
            확인
          </button>
        </div>
      </Modal>
    </>
  );
}
