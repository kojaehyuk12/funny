// F12 및 개발자 도구 방지
export function blockDevTools() {
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

  // 개발자 도구 열림 감지
  const devtools = /./;
  devtools.toString = function() {
    this.opened = true;
  };

  setInterval(() => {
    console.log(devtools);
    console.clear();
  }, 1000);

  // 콘솔 함수 비활성화
  if (typeof window !== 'undefined') {
    window.console.log = () => {};
    window.console.warn = () => {};
    window.console.error = () => {};
    window.console.info = () => {};
    window.console.debug = () => {};
  }
}
