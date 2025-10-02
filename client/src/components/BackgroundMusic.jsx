import { useEffect, useRef } from 'react';

export default function BackgroundMusic({ track, volume = 0.3 }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current || !track) return;

    // 오디오 소스 설정
    audioRef.current.src = track;
    audioRef.current.volume = volume;
    audioRef.current.loop = true;

    // 자동 재생
    const playAudio = async () => {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.log('자동 재생 실패:', error);
        // 사용자 상호작용 후 재생하도록 이벤트 리스너 추가
        const handleUserInteraction = async () => {
          try {
            await audioRef.current.play();
            document.removeEventListener('click', handleUserInteraction);
          } catch (err) {
            console.log('재생 실패:', err);
          }
        };
        document.addEventListener('click', handleUserInteraction);
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
