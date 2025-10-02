import { useState } from 'react';

export default function NightActionPanel({ socket, roomId, players, myRole, currentPlayerId }) {
  const [selectedTarget, setSelectedTarget] = useState(null);

  const handleAction = () => {
    if (!selectedTarget) return;

    socket.emit('nightAction', {
      roomId,
      action: myRole.info.actionType,
      targetId: selectedTarget
    });

    alert('행동 완료!');
  };

  const alivePlayers = players.filter(p => !p.isDead && p.id !== currentPlayerId);

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
    <div className="card">
      <h2 className="text-xl font-bold text-mafia-light mb-4">
        {actionText.title}
      </h2>

      <p className="text-mafia-light mb-4">
        {actionText.description}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {alivePlayers.map(player => (
          <button
            key={player.id}
            onClick={() => setSelectedTarget(player.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedTarget === player.id
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
                {player.name}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleAction}
        disabled={!selectedTarget}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedTarget
          ? `${players.find(p => p.id === selectedTarget)?.name}${
              myRole.role === 'mafia' ? '를 살해' :
              myRole.role === 'doctor' ? '를 보호' :
              '를 조사'
            }하기`
          : actionText.button}
      </button>
    </div>
  );
}
