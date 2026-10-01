import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PomodoroSession } from '../types';
import DailyRings from './DailyRings';
import { StreakDayNote, StreakTask } from '../services/streakTypes';
import { fetchPomodoroSessions, fetchStreakDayNotes, fetchStreakTasks, isSupabaseConfigured } from '../services/supabaseService';
import { focusAudio } from '../services/audioService';

interface PomodoroDashboardProps {
  secondsLeft: number;
  running: boolean;
  studyMinutes: number;
  breakMinutes: number;
  savingSession: boolean;
  onToggle: () => void;
  onReset: () => void;
  onUpdateSettings: (studyMinutes: number, breakMinutes: number) => void;
}

const toDateKey = (date: Date) => date.toLocaleDateString('sv-SE');

const getCurrentStreak = (days: Set<string>) => {
  let streak = 0;
  const cursor = new Date();

  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const getLongestStreak = (days: Set<string>) => {
  const sortedDays = Array.from(days).sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  sortedDays.forEach(day => {
    const date = new Date(`${day}T00:00:00`);
    if (!previous) {
      current = 1;
    } else {
      const diffDays = Math.round((date.getTime() - previous.getTime()) / 86400000);
      current = diffDays === 1 ? current + 1 : 1;
    }
    longest = Math.max(longest, current);
    previous = date;
  });

  return longest;
};

const formatTime = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
};

const PomodoroDashboard: React.FC<PomodoroDashboardProps> = ({
  secondsLeft,
  running,
  studyMinutes,
  breakMinutes,
  savingSession,
  onToggle,
  onReset,
  onUpdateSettings,
}) => {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [message, setMessage] = useState('');
  const [streakTasks, setStreakTasks] = useState<StreakTask[]>([]);
  const [streakDayNotes, setStreakDayNotes] = useState<StreakDayNote[]>([]);
  const [draftStudy, setDraftStudy] = useState(studyMinutes);
  const [draftBreak, setDraftBreak] = useState(breakMinutes);

  // Ambient sound states
  const [rainActive, setRainActive] = useState(false);
  const [whiteNoiseActive, setWhiteNoiseActive] = useState(false);

  const pipWindowRef = useRef<any>(null);
  const hasPiPSupport = Boolean((window as any).documentPictureInPicture);

  const sessionsByDay = useMemo(() => {
    return sessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.studyDate] = (acc[session.studyDate] || 0) + 1;
      return acc;
    }, {});
  }, [sessions]);

  const activeDays = useMemo(() => new Set(Object.keys(sessionsByDay)), [sessionsByDay]);
  const currentStreak = useMemo(() => getCurrentStreak(activeDays), [activeDays]);
  const longestStreak = useMemo(() => getLongestStreak(activeDays), [activeDays]);
  const totalMinutes = sessions.reduce((sum, session) => sum + (session.minutes || 0), 0);

  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let index = 83; index >= 0; index -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - index);
      const key = toDateKey(day);
      days.push({ key, count: sessionsByDay[key] || 0 });
    }
    return days;
  }, [sessionsByDay]);

  const loadSessions = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const [data, taskData, noteData] = await Promise.all([
        fetchPomodoroSessions(),
        fetchStreakTasks(),
        fetchStreakDayNotes(),
      ]);
      setSessions(data);
      setStreakTasks(taskData);
      setStreakDayNotes(noteData);
    } catch {
      setMessage('Không tải được dữ liệu Pomodoro.');
    }
  };

  useEffect(() => {
    loadSessions();
  }, [savingSession]);

  useEffect(() => {
    setDraftStudy(studyMinutes);
    setDraftBreak(breakMinutes);
  }, [studyMinutes, breakMinutes]);

  // Handle ambient sound toggle
  const toggleRain = () => {
    const next = !rainActive;
    setRainActive(next);
    focusAudio.setRain(next, 0.4);
  };

  const toggleWhiteNoise = () => {
    const next = !whiteNoiseActive;
    setWhiteNoiseActive(next);
    focusAudio.setWhiteNoise(next, 0.25);
  };

  // Turn off ambient sounds when leaving
  useEffect(() => {
    return () => {
      focusAudio.stopAll();
    };
  }, []);

  const saveSettings = () => {
    const safeStudy = Math.min(Math.max(Number(draftStudy) || 25, 1), 180);
    const safeBreak = Math.min(Math.max(Number(draftBreak) || 5, 1), 60);
    onUpdateSettings(safeStudy, safeBreak);
    setMessage(`Đã cập nhật Pomodoro: ${safeStudy} phút học / ${safeBreak} phút nghỉ.`);
  };

  const setPreset = (study: number, rest: number) => {
    setDraftStudy(study);
    setDraftBreak(rest);
    onUpdateSettings(study, rest);
    setMessage(`Đã chuyển sang chế độ ${study} phút học / ${rest} phút nghỉ.`);
  };

  // Picture in picture window handler
  const openPiP = async () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) return;
    const pipWindowAPI = (window as any).documentPictureInPicture;
    if (!pipWindowAPI) {
      setMessage('Trình duyệt của bạn không hỗ trợ Document Picture-in-Picture.');
      return;
    }

    try {
      const mainWindow = window;
      const pipWindow = await pipWindowAPI.requestWindow({ width: 220, height: 110 });
      pipWindowRef.current = pipWindow;
      const pipDocument = pipWindow.document;

      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        pipDocument.head.appendChild(node.cloneNode(true));
      });

      const container = pipDocument.createElement('div');
      container.className = 'bg-slate-950 text-white min-h-screen p-3 flex flex-col justify-between select-none';
      container.style.fontFamily = 'monospace';
      pipDocument.body.appendChild(container);

      const render = () => {
        const currentSecondsLeft = Number(localStorage.getItem('lingosnap_pomodoro_seconds_left')) || 0;
        const currentRunning = localStorage.getItem('lingosnap_pomodoro_running') === 'true';
        const timeStr = formatTime(currentSecondsLeft);

        container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <p style="font-size: 9px; margin: 0; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Study With Me</p>
              <div style="font-size: 22px; font-weight: 800; margin-top: 2px;">${timeStr}</div>
            </div>
            <div style="width: 10px; height: 10px; border-radius: 9999px; background-color: ${currentRunning ? '#10b981' : '#f59e0b'};"></div>
          </div>
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <button id="pip-toggle" style="flex: 1; padding: 6px 4px; font-size: 11px; font-weight: 700; border-radius: 6px; border: none; background: white; color: black; cursor: pointer;">
              ${currentRunning ? 'Tạm dừng' : 'Bắt đầu'}
            </button>
            <button id="pip-reset" style="flex: 1; padding: 6px 4px; font-size: 11px; font-weight: 700; border-radius: 6px; border: none; background: rgba(255,255,255,0.15); color: white; cursor: pointer;">
              Reset
            </button>
          </div>
        `;

        const toggleBtn = container.querySelector('#pip-toggle');
        const resetBtn = container.querySelector('#pip-reset');

        toggleBtn?.replaceWith(toggleBtn.cloneNode(true));
        resetBtn?.replaceWith(resetBtn.cloneNode(true));

        container.querySelector('#pip-toggle')?.addEventListener('click', () => {
          mainWindow.dispatchEvent(new Event('lingosnap:pomodoro-toggle'));
        });

        container.querySelector('#pip-reset')?.addEventListener('click', () => {
          mainWindow.dispatchEvent(new Event('lingosnap:pomodoro-reset'));
        });
      };

      render();

      const timer = setInterval(() => {
        if (pipWindow.closed) {
          clearInterval(timer);
          return;
        }
        render();
      }, 200);

      pipWindow.addEventListener('pagehide', () => {
        clearInterval(timer);
        pipWindowRef.current = null;
      });
    } catch (e: any) {
      setMessage(`Không mở được PiP: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Focus Dashboard */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Main Timer Display */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Study With Me &amp; Focus Timer
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">Không gian tập trung sâu</h2>
            </div>
            {hasPiPSupport && (
              <button
                onClick={openPiP}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                title="Ghim đồng hồ mini ra góc màn hình (Picture in Picture)"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                <span>Ghim PiP</span>
              </button>
            )}
          </div>

          {/* Huge Digital Clock */}
          <div className="my-8 text-center">
            <div className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-slate-900">
              {formatTime(secondsLeft)}
            </div>
            <div className="mt-2 text-xs font-medium text-slate-500">
              {running ? (
                <span className="flex items-center justify-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đang trong phiên tập trung ({studyMinutes} phút)
                </span>
              ) : (
                <span className="text-slate-400">Đã tạm dừng hoặc chưa bắt đầu</span>
              )}
            </div>
          </div>

          {/* Action Buttons & Presets */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onToggle}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition ${
                  running ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <i className={`fa-solid ${running ? 'fa-pause' : 'fa-play'} text-xs`} />
                <span>{running ? 'Tạm dừng' : 'Bắt đầu học'}</span>
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <i className="fa-solid fa-arrow-rotate-left text-xs" />
                <span>Đặt lại</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-400">Chế độ nhanh:</span>
              <button
                onClick={() => setPreset(25, 5)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  studyMinutes === 25 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pomodoro (25/5)
              </button>
              <button
                onClick={() => setPreset(50, 10)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  studyMinutes === 50 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Deep Work (50/10)
              </button>
              <button
                onClick={() => setPreset(15, 3)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  studyMinutes === 15 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sprint (15/3)
              </button>
            </div>
          </div>
        </section>

        {/* Ambient Sound & Focus Settings Panel */}
        <div className="space-y-6">
          {/* Ambient Sound Generator (Offline Web Audio) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-headphones text-slate-500 text-sm" />
                <h3 className="text-sm font-bold text-slate-900">Âm thanh tập trung (Ambient)</h3>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Offline 100%
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Phát âm thanh thư giãn chạy nền giúp tăng khả năng tập trung, lọc tiếng ồn xung quanh mà không cần mạng.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={toggleRain}
                className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition border ${
                  rainActive
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-cloud-rain text-sm" />
                <span>{rainActive ? 'Đang mưa 🌧️' : 'Tiếng mưa rơi'}</span>
              </button>

              <button
                onClick={toggleWhiteNoise}
                className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition border ${
                  whiteNoiseActive
                    ? 'border-violet-300 bg-violet-50 text-violet-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-water text-sm" />
                <span>{whiteNoiseActive ? 'Bật ồn trắng 🌊' : 'Tiếng ồn trắng'}</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Chuông báo kết thúc:</span>
              <button
                onClick={() => focusAudio.playChime()}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Nghe thử chuông kết thúc 🔔
              </button>
            </div>
          </section>

          {/* Custom Settings Form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Tùy chỉnh thời gian (Phút)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Thời gian học</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={draftStudy}
                  onChange={e => setDraftStudy(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Thời gian nghỉ</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={draftBreak}
                  onChange={e => setDraftBreak(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900"
                />
              </div>
            </div>
            <button
              onClick={saveSettings}
              className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              Lưu cài đặt
            </button>
          </section>
        </div>
      </div>

      {/* Heatmap & Streak Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Nhật ký tập trung 12 tuần gần nhất</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chuỗi hiện tại: <strong className="text-slate-900">{currentStreak} ngày</strong> · Kỷ lục: <strong className="text-slate-900">{longestStreak} ngày</strong> · Tổng tích lũy: <strong className="text-slate-900">{Math.round(totalMinutes / 60)} giờ</strong> ({sessions.length} phiên)
            </p>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pt-2">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
            {calendarDays.map(day => {
              const count = day.count;
              const bg =
                count === 0
                  ? 'bg-slate-100'
                  : count <= 2
                  ? 'bg-emerald-200'
                  : count <= 4
                  ? 'bg-emerald-400'
                  : 'bg-emerald-600 text-white';
              return (
                <div
                  key={day.key}
                  title={`${day.key}: ${count} phiên`}
                  className={`h-4 w-4 rounded-xs ${bg} transition hover:scale-115`}
                />
              );
            })}
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-lg bg-slate-100 p-3 text-xs font-semibold text-slate-700 border border-slate-200">
          {message}
        </div>
      )}
    </div>
  );
};

export default PomodoroDashboard;
