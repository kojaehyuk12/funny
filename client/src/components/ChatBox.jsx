import { useState, useEffect, useRef } from 'react';

export default function ChatBox({ socket, roomId, playerName, messages, isAlive = true, phase }) {
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

  const canChat = isAlive && (phase !== 'night' || phase === null);

  return (
    <div className="card h-[600px] flex flex-col">
      <h2 className="text-xl font-bold text-mafia-light mb-4">💬 채팅</h2>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${
              msg.type === 'system'
                ? 'bg-mafia-dark text-center text-sm italic'
                : msg.playerName === playerName
                ? 'bg-mafia-accent text-white ml-8'
                : 'bg-mafia-secondary text-mafia-light mr-8'
            }`}
          >
            {msg.type !== 'system' && (
              <div className="font-semibold text-sm mb-1">
                {msg.playerName}
              </div>
            )}
            <div className="break-words">{msg.message}</div>
            <div className="text-xs opacity-75 mt-1">
              {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}
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
              ? '사망하여 채팅할 수 없습니다'
              : phase === 'night'
              ? '밤에는 채팅할 수 없습니다'
              : '메시지를 입력하세요...'
          }
          disabled={!canChat}
          maxLength={200}
          className="flex-1 px-4 py-2 bg-mafia-secondary text-mafia-light rounded-lg border border-mafia-dark focus:border-mafia-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!canChat || !message.trim()}
          className="px-4 py-2 bg-mafia-accent hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          전송
        </button>
      </form>
    </div>
  );
}
