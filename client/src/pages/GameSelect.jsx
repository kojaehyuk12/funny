export default function GameSelect({ onCreateRoom, onJoinRoom }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-mafia-bg via-mafia-dark to-mafia-bg">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-6xl font-extrabold mb-2 bg-gradient-to-r from-mafia-accent via-red-600 to-mafia-accent bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            🎮 온라인 게임
          </h1>
          <p className="text-mafia-muted text-lg font-medium">
            마피아 & 라이어 게임
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 방 생성하기 */}
          <button
            onClick={onCreateRoom}
            className="card p-8 hover:scale-105 transition-all duration-300 backdrop-blur-sm border-2 border-mafia-secondary/50 hover:border-mafia-accent group"
          >
            <div className="text-center space-y-4">
              <div className="text-7xl mb-4 group-hover:animate-bounce">➕</div>
              <h2 className="text-3xl font-bold text-mafia-gold">방 생성하기</h2>
              <p className="text-mafia-muted">
                새로운 게임방을 만들고<br />
                친구들을 초대하세요
              </p>
              <div className="pt-4">
                <span className="inline-block px-4 py-2 bg-mafia-accent/20 text-mafia-accent rounded-lg font-bold group-hover:bg-mafia-accent group-hover:text-white transition-colors">
                  생성하기 →
                </span>
              </div>
            </div>
          </button>

          {/* 코드로 참가하기 */}
          <button
            onClick={onJoinRoom}
            className="card p-8 hover:scale-105 transition-all duration-300 backdrop-blur-sm border-2 border-purple-500/50 hover:border-purple-400 group"
          >
            <div className="text-center space-y-4">
              <div className="text-7xl mb-4 group-hover:animate-bounce">🔑</div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                코드로 참가하기
              </h2>
              <p className="text-mafia-muted">
                친구가 공유한 코드로<br />
                게임에 참가하세요
              </p>
              <div className="pt-4">
                <span className="inline-block px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg font-bold group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  참가하기 →
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="text-center text-mafia-muted text-sm">
          <p className="flex items-center justify-center gap-2">
            <span className="text-mafia-gold">✨</span>
            <span>친구들과 함께 즐거운 시간을 보내세요!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
