import React, { useEffect } from 'react';

interface CelebrationOverlayProps {
  show: boolean;
  onDone: () => void;
}

const playCelebrationSound = () => {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      const start = audioContext.currentTime + index * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
    });
  } catch {
    // Browser may block audio if no user gesture happened.
  }
};

const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ show, onDone }) => {
  useEffect(() => {
    if (!show) return;
    playCelebrationSound();
    const timer = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(timer);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden bg-slate-950/20 backdrop-blur-[2px]">
      <style>{`
        @keyframes firework-rise { 0% { transform: translateY(40px) scale(.3); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-160px) scale(1.15); opacity: 0; } }
        @keyframes burst { 0% { transform: scale(.2); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
        .fw { position: absolute; width: 12px; height: 12px; border-radius: 9999px; animation: firework-rise 1.9s ease-out forwards; }
        .fw::before, .fw::after { content: ''; position: absolute; inset: -26px; border-radius: 9999px; border: 4px dotted currentColor; animation: burst .9s ease-out .45s forwards; }
        .fw::after { inset: -42px; animation-delay: .6s; }
      `}</style>
      {[...Array(18)].map((_, index) => (
        <div
          key={index}
          className="fw"
          style={{
            left: `${8 + (index * 53) % 86}%`,
            top: `${42 + (index * 29) % 42}%`,
            color: ['#22c55e', '#3b82f6', '#f97316', '#e879f9', '#facc15'][index % 5],
            backgroundColor: 'currentColor',
            animationDelay: `${(index % 6) * 0.12}s`,
          }}
        />
      ))}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white px-8 py-6 text-center shadow-2xl">
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-xl font-black text-slate-950">Pomodoro hoàn thành!</div>
        <div className="mt-1 text-sm font-bold text-emerald-600">Streak hôm nay đã được ghi nhận</div>
      </div>
    </div>
  );
};

export default CelebrationOverlay;
