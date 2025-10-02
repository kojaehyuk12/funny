export default function PlayerList({ players, myRole, phase }) {
  const alivePlayers = players.filter(p => !p.isDead);
  const deadPlayers = players.filter(p => p.isDead);

  const showRole = (player) => {
    // 내가 마피아면 다른 마피아 표시
    if (myRole.role === 'mafia' && player.role === 'mafia') {
      return '🔪';
    }
    return '';
  };

  const getPlayerDisplay = (player) => {
    // 게임 중에는 익명번호, 이름이 없으면 익명번호 표시
    return player.name || `#${player.anonymousNumber}`;
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-mafia-light mb-4">
        👥 플레이어 ({alivePlayers.length}명 생존)
      </h2>

      {/* 생존자 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {alivePlayers.map(player => (
          <div
            key={player.id}
            className="p-4 bg-mafia-secondary rounded-lg border-2 border-mafia-dark hover:border-mafia-accent transition-all"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">
                {showRole(player) || '👤'}
              </div>
              <div className="font-semibold text-mafia-light">
                {getPlayerDisplay(player)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 사망자 */}
      {deadPlayers.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-400 mb-3">💀 사망 ({deadPlayers.length}명)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {deadPlayers.map(player => (
              <div
                key={player.id}
                className="p-4 bg-gray-800 rounded-lg border-2 border-gray-700 opacity-50"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">💀</div>
                  <div className="font-semibold text-gray-400">
                    {getPlayerDisplay(player)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
