import { useEffect, useRef } from 'react';

export default function BackgroundMusic({ track, volume = 0.3 }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current || !track) return;

    // 기존 오디오 정리
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // 오디오 소스 설정
    audioRef.current.src = track;
    audioRef.current.volume = volume;
    audioRef.current.loop = true;

    // 로드 후 재생
    const playAudio = async () => {
      try {
        await audioRef.current.load();
        await audioRef.current.play();
      } catch {
        // 사용자 상호작용 후 재생하도록 이벤트 리스너 추가
        const handleUserInteraction = async () => {
          try {
            if (audioRef.current) {
              await audioRef.current.play();
              document.removeEventListener('click', handleUserInteraction);
              document.removeEventListener('keydown', handleUserInteraction);
            }
          } catch {
            // Ignore playback errors
          }
        };
        document.addEventListener('click', handleUserInteraction, { once: true });
        document.addEventListener('keydown', handleUserInteraction, { once: true });
      }
    };

    playAudio();

    // 클린업
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [track, volume]);

  return <audio ref={audioRef} />;
}
