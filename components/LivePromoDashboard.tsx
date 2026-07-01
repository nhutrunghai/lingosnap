import React, { useEffect, useMemo, useState } from 'react';

interface LivePromoDashboardProps {
  secondsLeft: number;
  running: boolean;
  initialSeconds: number;
  onToggle: () => void;
  onReset: () => void;
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
}

const STORAGE_KEY = 'lingosnap_live_promo_settings';
const STARTED_AT_KEY = 'lingosnap_live_promo_started_at';

const defaultSettings: LivePromoSettings = {
  title: 'Study with me',
  subtitle: 'LingoSnap focus live',
  studyDone: 0,
  studyGoal: 5,
  totalSeconds: 0,
  accent: '#22d3ee',
  showCameraFrame: true,
  sticker: '????',
};

const formatTime = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const readSettings = (): LivePromoSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {
    return defaultSettings;
  }
};

const LivePromoOverlay: React.FC<{
  settings: LivePromoSettings;
  elapsedSeconds: number;
  secondsLeft: number;
  running: boolean;
  initialSeconds: number;
  compact?: boolean;
}> = ({ settings, elapsedSeconds, secondsLeft, running, initialSeconds, compact = false }) => {
  const progress = initialSeconds > 0 ? Math.min(100, Math.max(0, ((initialSeconds - secondsLeft) / initialSeconds) * 100)) : 0;
  const studyGoal = Math.max(1, settings.studyGoal || 1);
  const studyDone = Math.min(Math.max(0, settings.studyDone || 0), studyGoal);
  const studyProgress = Math.min(100, (studyDone / studyGoal) * 100);

  return (
    <div className={`relative aspect-video overflow-hidden rounded-[2rem] bg-transparent ${compact ? '' : 'shadow-2xl shadow-slate-300'}`}>
      {settings.showCameraFrame && <div className="absolute inset-0 rounded-[2rem] border-[10px] border-slate-950/90" />}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/15 via-transparent to-slate-950/25" />
      <div className="absolute left-1/2 top-[8%] -translate-x-1/2 text-center font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
        <div className="text-5xl tracking-tight sm:text-6xl">{formatTime(settings.totalSeconds || elapsedSeconds)}</div>
        <div className="mt-3 text-sm uppercase tracking-[0.35em] text-white/80">{settings.subtitle}</div>
      </div>

      <div className="absolute left-1/2 top-[36%] flex -translate-x-1/2 items-center gap-5 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
        <div className="text-6xl sm:text-7xl">{settings.sticker}</div>
        <div className="text-5xl font-black sm:text-6xl">{formatTime(secondsLeft)}</div>
      </div>

      <div className="absolute left-1/2 top-[58%] w-[72%] -translate-x-1/2 text-center">
        <div className="text-3xl font-black sm:text-4xl" style={{ color: settings.accent }}>
          {settings.title} {studyDone}/{studyGoal} ??
        </div>
        <div className="mt-6 h-4 overflow-hidden rounded-full border-2 border-white/90 bg-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-all" style={{ width: `${studyProgress || progress}%` }} />
        </div>
      </div>

      <div className={`absolute right-6 top-6 rounded-full px-4 py-2 text-sm font-black text-white ${running ? 'bg-emerald-500/90' : 'bg-orange-500/90'}`}>
        {running ? 'LIVE FOCUS' : 'PAUSED'}
      </div>
    </div>
  );
};

const LivePromoDashboard: React.FC<LivePromoDashboardProps> = ({ secondsLeft, running, initialSeconds, onToggle, onReset }) => {
  const [settings, setSettings] = useState<LivePromoSettings>(readSettings);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const isObsMode = new URLSearchParams(window.location.search).get('obs') === '1';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!localStorage.getItem(STARTED_AT_KEY)) localStorage.setItem(STARTED_AT_KEY, String(Date.now()));
    const tick = () => {
      const startedAt = Number(localStorage.getItem(STARTED_AT_KEY)) || Date.now();
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const obsUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'LIVE_PROMO');
    url.searchParams.set('obs', '1');
    return url.toString();
  }, []);

  const updateSetting = <K extends keyof LivePromoSettings>(key: K, value: LivePromoSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetTotalTimer = () => {
    localStorage.setItem(STARTED_AT_KEY, String(Date.now()));
    setElapsedSeconds(0);
    updateSetting('totalSeconds', 0);
  };

  const copyObsUrl = async () => {
    await navigator.clipboard.writeText(obsUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (isObsMode) {
    return (
      <div className="grid min-h-screen place-items-center bg-transparent p-0">
        <LivePromoOverlay settings={settings} elapsedSeconds={elapsedSeconds} secondsLeft={secondsLeft} running={running} initialSeconds={initialSeconds} compact />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.4fr]">
      <section className="space-y-5 rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-500">OBS Browser Source</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Promo live h?c</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Ch?nh tr?c ti?p overlay, copy URL v?o OBS v? kh?ng c?n s?a file HTML n?a.</p>
        </div>

        <label className="block text-sm font-black text-slate-600">Ti?u ?? ch?nh
          <input value={settings.title} onChange={event => updateSetting('title', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" />
        </label>
        <label className="block text-sm font-black text-slate-600">D?ng ph?
          <input value={settings.subtitle} onChange={event => updateSetting('subtitle', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-black text-slate-600">Study ?? xong
            <input type="number" min="0" value={settings.studyDone} onChange={event => updateSetting('studyDone', Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" />
          </label>
          <label className="block text-sm font-black text-slate-600">M?c ti?u
            <input type="number" min="1" value={settings.studyGoal} onChange={event => updateSetting('studyGoal', Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-black text-slate-600">Sticker
            <input value={settings.sticker} onChange={event => updateSetting('sticker', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-cyan-400" />
          </label>
          <label className="block text-sm font-black text-slate-600">M?u nh?n
            <input type="color" value={settings.accent} onChange={event => updateSetting('accent', event.target.value)} className="mt-2 h-[50px] w-full rounded-2xl border border-slate-200 bg-white p-2" />
          </label>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">URL cho OBS</p>
              <p className="mt-1 break-all text-xs font-semibold text-slate-300">{obsUrl}</p>
            </div>
          </div>
          <button onClick={copyObsUrl} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-100">
            {copied ? '?? copy URL' : 'Copy URL Browser Source'}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <LivePromoOverlay settings={settings} elapsedSeconds={elapsedSeconds} secondsLeft={secondsLeft} running={running} initialSeconds={initialSeconds} />
        <div className="flex flex-wrap gap-3">
          <button onClick={onToggle} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:bg-cyan-600">
            {running ? 'T?m d?ng Pomodoro' : 'B?t ??u Pomodoro'}
          </button>
          <button onClick={onReset} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-200 transition hover:text-red-500">Reset Pomodoro</button>
          <button onClick={resetTotalTimer} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-200 transition hover:text-blue-600">Reset timer t?ng</button>
          <label className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-200">
            <input type="checkbox" checked={settings.showCameraFrame} onChange={event => updateSetting('showCameraFrame', event.target.checked)} />
            Khung camera
          </label>
        </div>
      </section>
    </div>
  );
};

export default LivePromoDashboard;
