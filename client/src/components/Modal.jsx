import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, showCloseButton = true }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={showCloseButton ? onClose : undefined}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-mafia-primary rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-mafia-accent">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-mafia-dark">
          <h3 className="text-2xl font-bold text-mafia-light">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-mafia-light hover:text-mafia-accent transition-colors text-2xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* 본문 */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
