export default function RoleInfo({ role, isAlive }) {
  if (!role) return null;

  return (
    <div className={`card ${!isAlive ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-6xl">{role.info.icon}</div>
          <div>
            <h2 className="text-3xl font-bold" style={{ color: role.info.color }}>
              {role.info.name}
            </h2>
            <p className="text-mafia-light mt-1">{role.info.description}</p>
            {!isAlive && (
              <p className="text-red-500 font-bold mt-2">💀 사망</p>
            )}
          </div>
        </div>
        <div className={`px-4 py-2 rounded-lg font-bold ${
          role.info.team === 'mafia' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {role.info.team === 'mafia' ? '🔪 마피아팀' : '👥 시민팀'}
        </div>
      </div>
      <div className="mt-4 p-3 bg-mafia-secondary rounded-lg text-sm text-mafia-light">
        <strong>승리 조건:</strong> {role.info.winCondition}
      </div>
    </div>
  );
}
