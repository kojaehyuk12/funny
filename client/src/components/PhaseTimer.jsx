export default function PhaseTimer({ phase, timeLeft, onVoteSkip }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = timeLeft > 0 ? (timeLeft / (phase === 'day' ? 120 : 60)) * 100 : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl">
            {phase === 'day' ? '☀️' : '🌙'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-mafia-light">
              {phase === 'day' ? '낮 페이즈' : '밤 페이즈'}
            </h2>
            <p className="text-mafia-light text-sm">
              {phase === 'day'
                ? '토론하고 투표로 용의자를 처형하세요'
                : '특수 직업들은 능력을 사용하세요'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-bold text-mafia-accent">
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={onVoteSkip}
            className="mt-2 text-sm px-3 py-1 bg-mafia-secondary hover:bg-mafia-primary rounded transition-colors"
          >
            ⏭️ 시간 단축 투표
          </button>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full h-3 bg-mafia-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-mafia-accent transition-all duration-1000"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
