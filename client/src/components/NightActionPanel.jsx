import { useState } from 'react';
import Modal from './Modal';

export default function NightActionPanel({ socket, roomId, players, myRole, currentPlayerId }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hasActed, setHasActed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const handleActionClick = () => {
    if (!selectedTarget || hasActed) return;
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    socket.emit('nightAction', {
      roomId,
      action: myRole.info.actionType,
      targetId: selectedTarget
    });

    setHasActed(true);
    setShowConfirmModal(false);
    setShowResultModal(true);
  };

  const alivePlayers = players.filter(p => !p.isDead && p.id !== currentPlayerId);

  const getPlayerDisplay = (player) => {
    return player.name || `#${player.anonymousNumber}`;
  };

  const getActionText = () => {
    switch (myRole.role) {
      case 'mafia':
        return {
          title: '🔪 살해 대상 선택',
          description: '오늘 밤 제거할 시민을 선택하세요.',
          button: '살해하기'
        };
      case 'doctor':
        return {
          title: '💉 보호 대상 선택',
          description: '마피아의 공격으로부터 보호할 사람을 선택하세요.',
          button: '보호하기'
        };
      case 'police':
        return {
          title: '👮 조사 대상 선택',
          description: '마피아인지 조사할 사람을 선택하세요.',
          button: '조사하기'
        };
      default:
        return {
          title: '대기 중',
          description: '다른 플레이어들의 행동을 기다리고 있습니다.',
          button: ''
        };
    }
  };

  const actionText = getActionText();
  const selectedPlayer = players.find(p => p.id === selectedTarget);
  const selectedPlayerDisplay = selectedPlayer ? getPlayerDisplay(selectedPlayer) : '';

  if (!myRole.info.nightAction) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-mafia-light mb-4">
          🌙 밤 페이즈
        </h2>
        <p className="text-mafia-light text-center py-8">
          특수 직업들이 행동하는 동안 기다려주세요...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2 className="text-xl font-bold text-mafia-light mb-4">
          {actionText.title} {hasActed && <span className="text-green-400 text-sm">(완료 ✓)</span>}
        </h2>

        <p className="text-mafia-light mb-4">
          {actionText.description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {alivePlayers.map(player => (
            <button
              key={player.id}
              onClick={() => !hasActed && setSelectedTarget(player.id)}
              disabled={hasActed}
              className={`p-4 rounded-lg border-2 transition-all ${
                hasActed
                  ? 'opacity-50 cursor-not-allowed bg-mafia-secondary border-mafia-dark'
                  : selectedTarget === player.id
                  ? myRole.role === 'mafia'
                    ? 'bg-red-600 border-red-500'
                    : myRole.role === 'doctor'
                    ? 'bg-green-600 border-green-500'
                    : 'bg-blue-600 border-blue-500'
                  : 'bg-mafia-secondary border-mafia-dark hover:border-mafia-accent'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">
                  {myRole.role === 'mafia' && player.role === 'mafia' ? '🔪' : '👤'}
                </div>
                <div className="font-semibold text-mafia-light">
                  {getPlayerDisplay(player)}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleActionClick}
          disabled={!selectedTarget || hasActed}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasActed
            ? '행동 완료되었습니다'
            : selectedTarget
            ? `${selectedPlayerDisplay}${
                myRole.role === 'mafia' ? '를 살해' :
                myRole.role === 'doctor' ? '를 보호' :
                '를 조사'
              }하기`
            : actionText.button}
        </button>
      </div>

      {/* 행동 확인 모달 */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={actionText.title}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">
            {myRole.role === 'mafia' ? '🔪' : myRole.role === 'doctor' ? '💉' : '👮'}
          </div>
          <p className="text-mafia-light mb-6 text-lg">
            <strong className={
              myRole.role === 'mafia' ? 'text-red-400' :
              myRole.role === 'doctor' ? 'text-green-400' :
              'text-blue-400'
            }>{selectedPlayerDisplay}</strong>를
            {myRole.role === 'mafia' ? ' 살해' :
             myRole.role === 'doctor' ? ' 보호' :
             ' 조사'}하시겠습니까?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 px-4 py-3 bg-mafia-secondary hover:bg-mafia-dark rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={confirmAction}
              className={`flex-1 px-4 py-3 rounded-lg transition-colors font-bold ${
                myRole.role === 'mafia' ? 'bg-red-600 hover:bg-red-700' :
                myRole.role === 'doctor' ? 'bg-green-600 hover:bg-green-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              확인
            </button>
          </div>
        </div>
      </Modal>

      {/* 행동 완료 모달 */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="✓ 행동 완료"
      >
        <div className="text-center">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-mafia-light text-lg">
            <strong className={
              myRole.role === 'mafia' ? 'text-red-400' :
              myRole.role === 'doctor' ? 'text-green-400' :
              'text-blue-400'
            }>{selectedPlayerDisplay}</strong>
            {myRole.role === 'mafia' ? ' 살해' :
             myRole.role === 'doctor' ? ' 보호' :
             ' 조사'} 완료!
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
