import { useState, useEffect, useRef } from 'react';

export default function ChatBox({ socket, roomId, playerName, messages, isAlive = true, phase, myRole }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !isAlive) return;

    socket.emit('chatMessage', {
      roomId,
      message: message.trim()
    });

    setMessage('');
  };

  // 마피아는 밤에 채팅 가능, 다른 직업은 낮에만 채팅 가능
  const canChat = isAlive && (
    phase === 'day' ||
    (phase === 'night' && myRole?.role === 'mafia')
  );

  return (
    <div className="card h-[600px] flex flex-col bg-gradient-to-br from-mafia-primary via-mafia-primary to-mafia-dark">
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-mafia-accent/30">
        <h2 className="text-xl font-bold text-mafia-light flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <span>채팅</span>
        </h2>
        {phase === 'night' && myRole?.role === 'mafia' && (
          <span className="text-xs bg-red-600 px-3 py-1 rounded-full animate-pulse">
            🔪 마피아 전용
          </span>
        )}
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3 px-1">
        {messages.length === 0 && (
          <div className="text-center text-mafia-light/50 text-sm mt-8">
            💬 대화를 시작해보세요!
          </div>
        )}
        {messages.map((msg) => {
          const isMyMessage = msg.playerName === playerName;
          const isMafiaChat = msg.type === 'mafia';
          const isSystem = msg.type === 'system';

          return (
            <div
              key={msg.id}
              className={`flex ${isSystem ? 'justify-center' : isMyMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-lg ${
                  isSystem
                    ? 'bg-mafia-dark/50 text-center text-xs italic text-mafia-light/70 px-6'
                    : isMafiaChat
                    ? isMyMessage
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-br-sm'
                      : 'bg-gradient-to-r from-red-800 to-red-900 text-white rounded-bl-sm'
                    : isMyMessage
                    ? 'bg-gradient-to-r from-mafia-accent to-red-600 text-white rounded-br-sm'
                    : 'bg-mafia-secondary/80 text-mafia-light rounded-bl-sm backdrop-blur-sm'
                }`}
              >
                {!isSystem && (
                  <div className="flex items-center gap-1 mb-1">
                    {isMafiaChat && <span className="text-sm">🔪</span>}
                    <span className="font-bold text-xs opacity-90">
                      {msg.playerName}
                    </span>
                  </div>
                )}
                <div className={`break-words ${isSystem ? 'text-xs' : 'text-sm'}`}>
                  {msg.message}
                </div>
                {!isSystem && (
                  <div className="text-[10px] opacity-60 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 폼 */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            !isAlive
              ? '💀 사망하여 채팅할 수 없습니다'
              : phase === 'night' && myRole?.role !== 'mafia'
              ? '🌙 밤에는 마피아만 채팅할 수 있습니다'
              : '메시지를 입력하세요...'
          }
          disabled={!canChat}
          maxLength={200}
          className="flex-1 px-4 py-3 bg-mafia-secondary text-mafia-light rounded-full border-2 border-mafia-dark focus:border-mafia-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-sm"
        />
        <button
          type="submit"
          disabled={!canChat || !message.trim()}
          className="px-6 py-3 bg-gradient-to-r from-mafia-accent to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
        >
          전송
        </button>
      </form>
    </div>
  );
}
