import React, { useEffect, useRef, useState } from 'react';

interface FloatingPomodoroProps {
  secondsLeft: number;
  running: boolean;
  studyMinutes: number;
  onToggle: () => void;
  onReset: () => void;
  onOpen: () => void;
}

const formatTime = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
};

const FloatingPomodoro: React.FC<FloatingPomodoroProps> = ({ secondsLeft, running, studyMinutes, onToggle, onReset, onOpen }) => {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('lingosnap_pomodoro_widget_pos');
    return saved ? JSON.parse(saved) as { x: number; y: number } : { x: 24, y: 24 };
  });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; dragging: boolean } | null>(null);

  const shouldShow = running || secondsLeft < studyMinutes * 60;
  if (!shouldShow) return null;

  const updatePosition = (next: { x: number; y: number }) => {
    const maxX = Math.max(0, window.innerWidth - 220);
    const maxY = Math.max(0, window.innerHeight - 110);
    const safe = { x: Math.min(Math.max(next.x, 8), maxX), y: Math.min(Math.max(next.y, 8), maxY) };
    setPosition(safe);
    localStorage.setItem('lingosnap_pomodoro_widget_pos', JSON.stringify(safe));
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, dragging: true };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current?.dragging) return;
    updatePosition({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    });
  };

  const stopDrag = () => {
    if (dragRef.current) dragRef.current.dragging = false;
  };

  return (
    <div
      className="fixed z-[90] w-[210px] select-none rounded-3xl border border-white/70 bg-slate-950/95 p-3 text-white shadow-2xl shadow-slate-400/40 backdrop-blur-xl"
      style={{ right: 'auto', bottom: 'auto', left: position.x, top: position.y }}
    >
      <div onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} className="cursor-grab active:cursor-grabbing">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Pomodoro</p>
            <div className="text-2xl font-black leading-none">{formatTime(secondsLeft)}</div>
          </div>
          <div className={`h-3 w-3 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-orange-400'}`} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={onToggle} className="rounded-2xl bg-white px-2 py-2 text-xs font-black text-slate-950">{running ? 'Pause' : 'Start'}</button>
        <button onClick={onOpen} className="rounded-2xl bg-white/10 px-2 py-2 text-xs font-black text-white">Mở</button>
        <button onClick={onReset} className="rounded-2xl bg-white/10 px-2 py-2 text-xs font-black text-white">Reset</button>
      </div>
    </div>
  );
};

export default FloatingPomodoro;
