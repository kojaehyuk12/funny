// F12 및 개발자 도구 방지 (개발 중에는 비활성화)
export function blockDevTools() {
  // 개발 환경에서는 차단하지 않음
  if (import.meta.env.DEV) {
    console.log('🔧 개발 모드: 개발자 도구 차단 비활성화');
    return;
  }

  // 프로덕션에서만 차단 활성화
  // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U 차단
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault();
      return false;
    }
  });

  // 우클릭 방지
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
}
