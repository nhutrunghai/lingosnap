import React, { useEffect, useMemo, useRef, useState } from 'react';

interface LivePromoDashboardProps {
  secondsLeft: number;
  running: boolean;
  initialSeconds: number;
  onToggle: () => void;
  onReset: () => void;
  activeTaskTitle?: string;
}

interface LivePromoSettings {
  title: string;
  subtitle: string;
  studyDone: number;
  studyGoal: number;
  totalSeconds: number;
  accent: string;
  showCameraFrame: boolean;
  sticker: string;
  stickerImage: string;
  stickerImageUrl: string;
  useActiveTaskTitle: boolean;
  useCamera: boolean;
  fontFamily: string;
  topTimerX: number;
  topTimerY: number;
  topTimerSize: number;
  pomoX: number;
  pomoY: number;
  pomoSize: number;
  titleX: number;
  titleY: number;
  titleSize: number;
  progressWidth: number;
  progressY: number;
  stickerImageX: number;
  stickerImageY: number;
  stickerImageSize: number;
}

type DragTarget = 'topTimer' | 'pomo' | 'title' | 'progress' | 'stickerImage';
type ResizeTarget = DragTarget;

const STORAGE_KEY = 'lingosnap_live_promo_settings';
const STARTED_AT_KEY = 'lingosnap_live_promo_started_at';

const fontOptions = [
  { label: 'Be Vietnam Pro', value: "'Be Vietnam Pro', system-ui, sans-serif" },
  { label: 'Source Code Pro', value: "'Source Code Pro', Consolas, monospace" },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', 'Fira Code', Consolas, monospace" },
  { label: 'Inter / system', value: "Inter, system-ui, sans-serif" },
  { label: 'Arial', value: "Arial, sans-serif" },
  { label: 'Montserrat style', value: "Montserrat, 'Be Vietnam Pro', system-ui, sans-serif" },
];

const defaultSettings: LivePromoSettings = {
  title: 'Study with me',
  subtitle: 'LingoSnap focus live',
  studyDone: 0,
  studyGoal: 5,
  totalSeconds: 0,
  accent: '#22d3ee',
  showCameraFrame: true,
  sticker: '🐱📚',
  stickerImage: '',
  stickerImageUrl: '',
  useActiveTaskTitle: true,
  useCamera: false,
  fontFamily: '\'Be Vietnam Pro\', system-ui, sans-serif',
  topTimerX: 50,
  topTimerY: 11,
  topTimerSize: 64,
  pomoX: 50,
  pomoY: 38,
  pomoSize: 62,
  titleX: 50,
  titleY: 60,
  titleSize: 36,
  progressWidth: 72,
  progressY: 73,
  stickerImageX: 31,
  stickerImageY: 38,
  stickerImageSize: 96,
};

const formatTime = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number(value) || min));

const encodeSettings = (settings: LivePromoSettings) => {
  const shareSettings = { ...settings, stickerImage: '' };
  const json = JSON.stringify(shareSettings);
  return btoa(unescape(encodeURIComponent(json)));
};

const decodeSettings = (value: string | null): Partial<LivePromoSettings> | null => {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value)))) as Partial<LivePromoSettings>;
  } catch {
    return null;
  }
};

const normalizeSettings = (settings: LivePromoSettings) => {
  if (!settings.sticker || settings.sticker.includes('?') || settings.sticker.includes('Ã°') || settings.sticker.includes('ð')) settings.sticker = defaultSettings.sticker;
  return settings;
};

const readSettings = (): LivePromoSettings => {
  try {
    const urlSettings = decodeSettings(new URLSearchParams(window.location.search).get('cfg'));
    if (urlSettings) return normalizeSettings({ ...defaultSettings, ...urlSettings });
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultSettings;
    return normalizeSettings({ ...defaultSettings, ...JSON.parse(saved) });
  } catch {
    return defaultSettings;
  }
};

const useCameraStream = (enabled: boolean) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    const stopStream = () => {
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
    };
    if (!enabled) {
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraError('');
      return stopStream;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ camera.');
      return stopStream;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(mediaStream => {
        if (cancelled) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        stream = mediaStream;
        setCameraError('');
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      })
      .catch(() => setCameraError('Không mở được camera. Hãy cho phép quyền camera trong trình duyệt.'));
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [enabled]);

  return { videoRef, cameraError };
};

const DragHint: React.FC<{ label: string }> = ({ label }) => (
  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-full bg-slate-950/90 px-3 py-1 text-[11px] font-black text-white shadow-lg group-hover:block">{label}</span>
);

const ResizeHandle: React.FC<{
  target: ResizeTarget;
  editable: boolean;
  onResizeStart?: (target: ResizeTarget, event: React.PointerEvent<HTMLButtonElement>) => void;
}> = ({ target, editable, onResizeStart }) => {
  if (!editable) return null;
  return (
    <button
      type="button"
      aria-label="Kéo để đổi kích thước"
      onPointerDown={event => onResizeStart?.(target, event)}
      className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-cyan-400 shadow-lg shadow-slate-950/30 transition hover:scale-110"
      style={{ touchAction: 'none' }}
    />
  );
};

const LivePromoOverlay: React.FC<{
  settings: LivePromoSettings;
  elapsedSeconds: number;
  secondsLeft: number;
  running: boolean;
  initialSeconds: number;
  cameraVideoRef?: React.RefObject<HTMLVideoElement | null>;
  activeTaskTitle?: string;
  editable?: boolean;
  compact?: boolean;
  onDragStart?: (target: DragTarget, event: React.PointerEvent<HTMLElement>) => void;
  onResizeStart?: (target: ResizeTarget, event: React.PointerEvent<HTMLButtonElement>) => void;
}> = ({ settings, elapsedSeconds, secondsLeft, running, initialSeconds, cameraVideoRef, activeTaskTitle, editable = false, compact = false, onDragStart, onResizeStart }) => {
  const timeLeftProgress = initialSeconds > 0 ? Math.min(100, Math.max(0, (secondsLeft / initialSeconds) * 100)) : 100;
  const studyGoal = Math.max(1, settings.studyGoal || 1);
  const studyDone = Math.min(Math.max(0, settings.studyDone || 0), studyGoal);
  const displayTitle = settings.useActiveTaskTitle && activeTaskTitle ? activeTaskTitle : settings.title;
  const stickerImageSrc = settings.stickerImageUrl || settings.stickerImage;
  const draggableClass = editable ? 'group cursor-move rounded-xl outline outline-2 outline-cyan-300/0 transition hover:outline-cyan-300/80' : '';

  return (
    <div className={`relative aspect-video overflow-hidden bg-slate-200 ${compact ? 'w-screen max-w-none rounded-none' : 'w-full rounded-[2rem] shadow-2xl shadow-slate-300'}`} style={{ fontFamily: settings.fontFamily }}>
      {settings.useCamera && cameraVideoRef && <video ref={cameraVideoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/25 via-white/10 to-slate-950/35" />
      {settings.showCameraFrame && <div className="absolute inset-0 rounded-[2rem] border-[10px] border-slate-950/90" />}

      <div onPointerDown={event => onDragStart?.('topTimer', event)} className={`absolute -translate-x-1/2 -translate-y-1/2 select-none p-2 text-center font-black text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)] ${draggableClass}`} style={{ left: `${settings.topTimerX}%`, top: `${settings.topTimerY}%`, touchAction: 'none' }}>
        <DragHint label="Kéo timer" />
        <ResizeHandle target="topTimer" editable={editable} onResizeStart={onResizeStart} />
        <div style={{ fontSize: `${settings.topTimerSize}px`, lineHeight: 1 }}>{formatTime(settings.totalSeconds || elapsedSeconds)}</div>
        <div className="mt-3 text-sm uppercase tracking-[0.35em] text-white/85">{settings.subtitle}</div>
      </div>

      <div onPointerDown={event => onDragStart?.('pomo', event)} className={`absolute flex -translate-x-1/2 -translate-y-1/2 select-none items-center gap-5 p-2 text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)] ${draggableClass}`} style={{ left: `${settings.pomoX}%`, top: `${settings.pomoY}%`, touchAction: 'none' }}>
        <DragHint label="Kéo Pomodoro" />
        <ResizeHandle target="pomo" editable={editable} onResizeStart={onResizeStart} />
        <div style={{ fontSize: `${settings.pomoSize}px`, lineHeight: 1 }}>{settings.sticker}</div>
        <div className="font-black" style={{ fontSize: `${settings.pomoSize}px`, lineHeight: 1 }}>{formatTime(secondsLeft)}</div>
      </div>

      <div onPointerDown={event => onDragStart?.('title', event)} className={`absolute -translate-x-1/2 -translate-y-1/2 select-none p-2 text-center font-black ${draggableClass}`} style={{ left: `${settings.titleX}%`, top: `${settings.titleY}%`, color: settings.accent, fontSize: `${settings.titleSize}px`, touchAction: 'none' }}>
        <DragHint label="Kéo tiêu đề" />
        <ResizeHandle target="title" editable={editable} onResizeStart={onResizeStart} />
        {displayTitle} {studyDone}/{studyGoal} 📚
      </div>

      <div onPointerDown={event => onDragStart?.('progress', event)} className={`absolute left-1/2 h-4 -translate-x-1/2 select-none overflow-hidden rounded-full border-2 border-white/90 bg-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.35)] ${draggableClass}`} style={{ top: `${settings.progressY}%`, width: `${settings.progressWidth}%`, touchAction: 'none' }}>
        <DragHint label="Kéo tiêu đề" />
        <ResizeHandle target="progress" editable={editable} onResizeStart={onResizeStart} />
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-all" style={{ width: `${timeLeftProgress}%` }} />
      </div>


      {stickerImageSrc && (
        <div onPointerDown={event => onDragStart?.('stickerImage', event)} className={`absolute -translate-x-1/2 -translate-y-1/2 select-none p-2 ${draggableClass}`} style={{ left: `${settings.stickerImageX}%`, top: `${settings.stickerImageY}%`, touchAction: 'none' }}>
          <DragHint label="Kéo sticker ảnh" />
          <ResizeHandle target="stickerImage" editable={editable} onResizeStart={onResizeStart} />
          <img src={stickerImageSrc} alt="Sticker live" className="pointer-events-none object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]" style={{ width: `${settings.stickerImageSize}px`, height: `${settings.stickerImageSize}px` }} />
        </div>
      )}

      <div className={`absolute right-6 top-6 rounded-full px-4 py-2 text-sm font-black text-white ${running ? 'bg-emerald-500/90' : 'bg-orange-500/90'}`}>{running ? 'LIVE FOCUS' : 'PAUSED'}</div>
    </div>
  );
};

const NumberSlider: React.FC<{ label: string; value: number; min: number; max: number; onChange: (value: number) => void; }> = ({ label, value, min, max, onChange }) => (
  <label className="block text-xs font-black text-slate-500"><span className="flex justify-between"><span>{label}</span><span>{value}</span></span><input type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} className="mt-2 w-full accent-cyan-500" /></label>
);

const LivePromoDashboard: React.FC<LivePromoDashboardProps> = ({ secondsLeft, running, initialSeconds, onToggle, onReset, activeTaskTitle }) => {
  const [settings, setSettings] = useState<LivePromoSettings>(readSettings);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const isObsMode = new URLSearchParams(window.location.search).get('obs') === '1';
  const { videoRef, cameraError } = useCameraStream(settings.useCamera);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    if (!localStorage.getItem(STARTED_AT_KEY)) localStorage.setItem(STARTED_AT_KEY, String(Date.now()));
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - (Number(localStorage.getItem(STARTED_AT_KEY)) || Date.now())) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const obsUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'LIVE_PROMO');
    url.searchParams.set('obs', '1');
    url.searchParams.set('cfg', encodeSettings(settings));
    return url.toString();
  }, [settings]);
  const updateSetting = <K extends keyof LivePromoSettings>(key: K, value: LivePromoSettings[K]) => setSettings(prev => ({ ...prev, [key]: value }));
  const updateNumber = (key: keyof LivePromoSettings, value: number, min: number, max: number) => setSettings(prev => ({ ...prev, [key]: clamp(value, min, max) }));

  const handleDragStart = (target: DragTarget, event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    const move = (moveEvent: PointerEvent) => {
      const x = clamp(((moveEvent.clientX - bounds.left) / bounds.width) * 100, 3, 97);
      const y = clamp(((moveEvent.clientY - bounds.top) / bounds.height) * 100, 3, 97);
      setSettings(prev => {
        if (target === 'topTimer') return { ...prev, topTimerX: Math.round(x), topTimerY: Math.round(y) };
        if (target === 'pomo') return { ...prev, pomoX: Math.round(x), pomoY: Math.round(y) };
        if (target === 'title') return { ...prev, titleX: Math.round(x), titleY: Math.round(y) };
        if (target === 'stickerImage') return { ...prev, stickerImageX: Math.round(x), stickerImageY: Math.round(y) };
        return { ...prev, progressY: Math.round(y) };
      });
    };
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const handleResizeStart = (target: ResizeTarget, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startSettings = settings;
    const move = (moveEvent: PointerEvent) => {
      const delta = Math.round((moveEvent.clientX - startX + moveEvent.clientY - startY) / 4);
      setSettings(prev => {
        if (target === 'topTimer') return { ...prev, topTimerSize: clamp(startSettings.topTimerSize + delta, 28, 110) };
        if (target === 'pomo') return { ...prev, pomoSize: clamp(startSettings.pomoSize + delta, 28, 110) };
        if (target === 'title') return { ...prev, titleSize: clamp(startSettings.titleSize + delta, 18, 86) };
        if (target === 'stickerImage') return { ...prev, stickerImageSize: clamp(startSettings.stickerImageSize + delta, 32, 260) };
        return { ...prev, progressWidth: clamp(startSettings.progressWidth + delta, 20, 95) };
      });
    };
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };


  const resetTotalTimer = () => { localStorage.setItem(STARTED_AT_KEY, String(Date.now())); setElapsedSeconds(0); updateSetting('totalSeconds', 0); };
  const copyObsUrl = async () => { await navigator.clipboard.writeText(obsUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };

  if (isObsMode) return <div className="grid min-h-screen w-screen place-items-center overflow-hidden bg-transparent p-0"><LivePromoOverlay settings={settings} elapsedSeconds={elapsedSeconds} secondsLeft={secondsLeft} running={running} initialSeconds={initialSeconds} cameraVideoRef={videoRef} activeTaskTitle={activeTaskTitle} compact /></div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.4fr]">
      <section className="space-y-5 rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-500">OBS Browser Source</p><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Promo live học</h2><p className="mt-2 text-sm font-semibold text-slate-500">Kéo trực tiếp trên preview để căn bố cục, copy URL vào OBS khi đã ưng ý.</p></div>
        <label className="block text-sm font-black text-slate-600">Tiêu đề chính<input value={settings.title} onChange={event => updateSetting('title', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>
        <label className="block text-sm font-black text-slate-600">Dòng phụ<input value={settings.subtitle} onChange={event => updateSetting('subtitle', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-black text-slate-600">Study đã xong<input type="number" min="0" value={settings.studyDone} onChange={event => updateSetting('studyDone', Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label><label className="block text-sm font-black text-slate-600">Mục tiêu<input type="number" min="1" value={settings.studyGoal} onChange={event => updateSetting('studyGoal', Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-black text-slate-600">Sticker<input value={settings.sticker} onChange={event => updateSetting('sticker', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label><label className="block text-sm font-black text-slate-600">Màu nhấn<input type="color" value={settings.accent} onChange={event => updateSetting('accent', event.target.value)} className="mt-2 h-[50px] w-full rounded-2xl border border-slate-200 bg-white p-2" /></label></div>
        <label className="block text-sm font-black text-slate-600">Sticker ảnh / GIF local<input type="file" accept="image/*,.gif" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => updateSetting('stickerImage', String(reader.result || '')); reader.readAsDataURL(file); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label><label className="block text-sm font-black text-slate-600">Sticker URL cho OBS<input value={settings.stickerImageUrl} onChange={event => updateSetting('stickerImageUrl', event.target.value)} placeholder="Dán link GIF/ảnh online nếu muốn OBS hiện sticker" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>{(settings.stickerImage || settings.stickerImageUrl) && <button onClick={() => { updateSetting('stickerImage', ''); updateSetting('stickerImageUrl', ''); }} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-red-500 shadow-lg shadow-slate-200">Xóa sticker ảnh</button>}<label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-200"><input type="checkbox" checked={settings.useActiveTaskTitle} onChange={event => updateSetting('useActiveTaskTitle', event.target.checked)} />Dùng title streak đang chạy</label><label className="block text-sm font-black text-slate-600">Font chữ overlay<select value={settings.fontFamily} onChange={event => updateSetting('fontFamily', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400">{fontOptions.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}</select></label>
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm font-bold text-cyan-800">Kéo phần thân để đổi vị trí. Kéo chấm xanh ở góc khung để đổi kích thước.</div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 text-sm font-black text-slate-700">Tinh chỉnh bằng số</div><div className="grid grid-cols-2 gap-3"><NumberSlider label="Timer tổng X" value={settings.topTimerX} min={5} max={95} onChange={value => updateNumber('topTimerX', value, 5, 95)} /><NumberSlider label="Timer tổng Y" value={settings.topTimerY} min={5} max={95} onChange={value => updateNumber('topTimerY', value, 5, 95)} /><NumberSlider label="Timer tổng size" value={settings.topTimerSize} min={28} max={110} onChange={value => updateNumber('topTimerSize', value, 28, 110)} /><NumberSlider label="Pomo X" value={settings.pomoX} min={5} max={95} onChange={value => updateNumber('pomoX', value, 5, 95)} /><NumberSlider label="Pomo Y" value={settings.pomoY} min={5} max={95} onChange={value => updateNumber('pomoY', value, 5, 95)} /><NumberSlider label="Pomo size" value={settings.pomoSize} min={28} max={110} onChange={value => updateNumber('pomoSize', value, 28, 110)} /><NumberSlider label="Tiêu đề X" value={settings.titleX} min={5} max={95} onChange={value => updateNumber('titleX', value, 5, 95)} /><NumberSlider label="Tiêu đề Y" value={settings.titleY} min={5} max={95} onChange={value => updateNumber('titleY', value, 5, 95)} /><NumberSlider label="Tiêu đề size" value={settings.titleSize} min={18} max={86} onChange={value => updateNumber('titleSize', value, 18, 86)} /><NumberSlider label="Thanh tiến độ Y" value={settings.progressY} min={8} max={92} onChange={value => updateNumber('progressY', value, 8, 92)} /><NumberSlider label="Thanh tiến độ rộng" value={settings.progressWidth} min={20} max={95} onChange={value => updateNumber('progressWidth', value, 20, 95)} /><NumberSlider label="Sticker ảnh X" value={settings.stickerImageX} min={5} max={95} onChange={value => updateNumber('stickerImageX', value, 5, 95)} /><NumberSlider label="Sticker ảnh Y" value={settings.stickerImageY} min={5} max={95} onChange={value => updateNumber('stickerImageY', value, 5, 95)} /><NumberSlider label="Sticker ảnh size" value={settings.stickerImageSize} min={32} max={260} onChange={value => updateNumber('stickerImageSize', value, 32, 260)} /></div></div>
        <div className="rounded-2xl bg-slate-950 p-4 text-white"><p className="text-xs font-black uppercase tracking-widest text-cyan-300">URL cho OBS</p><p className="mt-1 text-xs font-semibold text-slate-300">URL đã chứa layout hiện tại. Ảnh upload local không nhúng vào URL để tránh chuỗi quá dài; dùng Sticker URL nếu cần hiện trong OBS.</p><input readOnly value={obsUrl} className="mt-3 w-full truncate rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 outline-none" /><button onClick={copyObsUrl} className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-100">{copied ? 'Đã copy URL' : 'Copy URL Browser Source'}</button></div>
      </section>
      <section className="space-y-4"><LivePromoOverlay settings={settings} elapsedSeconds={elapsedSeconds} secondsLeft={secondsLeft} running={running} initialSeconds={initialSeconds} cameraVideoRef={videoRef} activeTaskTitle={activeTaskTitle} editable onDragStart={handleDragStart} onResizeStart={handleResizeStart} />{cameraError && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{cameraError}</div>}<div className="flex flex-wrap gap-3"><button onClick={onToggle} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:bg-cyan-600">{running ? 'Tạm dừng Pomodoro' : 'Bắt đầu Pomodoro'}</button><button onClick={onReset} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-200 transition hover:text-red-500">Reset Pomodoro</button><button onClick={resetTotalTimer} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-200 transition hover:text-blue-600">Reset timer tổng</button><label className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-200"><input type="checkbox" checked={settings.useCamera} onChange={event => updateSetting('useCamera', event.target.checked)} />Bật camera preview</label><label className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-200"><input type="checkbox" checked={settings.showCameraFrame} onChange={event => updateSetting('showCameraFrame', event.target.checked)} />Khung camera</label></div></section>
    </div>
  );
};

export default LivePromoDashboard;
