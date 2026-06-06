import React, { useEffect, useMemo, useState } from 'react';
import { PomodoroSession } from '../types';
import DailyRings from './DailyRings';
import { StreakDayNote, StreakTask } from '../services/streakTypes';
import { fetchPomodoroSessions, fetchStreakDayNotes, fetchStreakTasks, isSupabaseConfigured } from '../services/supabaseService';

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

const PomodoroDashboard: React.FC<PomodoroDashboardProps> = ({ secondsLeft, running, studyMinutes, breakMinutes, savingSession, onToggle, onReset, onUpdateSettings }) => {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [message, setMessage] = useState('');
  const [streakTasks, setStreakTasks] = useState<StreakTask[]>([]);
  const [streakDayNotes, setStreakDayNotes] = useState<StreakDayNote[]>([]);
  const [draftStudy, setDraftStudy] = useState(studyMinutes);
  const [draftBreak, setDraftBreak] = useState(breakMinutes);

  const sessionsByDay = useMemo(() => {
    return sessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.studyDate] = (acc[session.studyDate] || 0) + 1;
      return acc;
    }, {});
  }, [sessions]);

  const activeDays = useMemo(() => new Set(Object.keys(sessionsByDay)), [sessionsByDay]);
  const currentStreak = useMemo(() => getCurrentStreak(activeDays), [activeDays]);
  const longestStreak = useMemo(() => getLongestStreak(activeDays), [activeDays]);
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);

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
    const [data, taskData, noteData] = await Promise.all([fetchPomodoroSessions(), fetchStreakTasks(), fetchStreakDayNotes()]);
    setSessions(data);
    setStreakTasks(taskData);
    setStreakDayNotes(noteData);
  };

  useEffect(() => {
    loadSessions().catch(() => setMessage('Không tải được dữ liệu Pomodoro.'));
  }, [savingSession]);

  useEffect(() => {
    setDraftStudy(studyMinutes);
    setDraftBreak(breakMinutes);
  }, [studyMinutes, breakMinutes]);

  const saveSettings = () => {
    const safeStudy = Math.min(Math.max(Number(draftStudy) || 25, 1), 180);
    const safeBreak = Math.min(Math.max(Number(draftBreak) || 5, 1), 60);
    onUpdateSettings(safeStudy, safeBreak);
    setMessage(`Đã cập nhật Pomodoro: ${safeStudy} phút học / ${safeBreak} phút nghỉ.`);
  };

  const openPiP = async () => {
    const pipWindowAPI = (window as any).documentPictureInPicture;
    if (!pipWindowAPI) {
      setMessage('Trình duyệt của bạn không hỗ trợ Document Picture-in-Picture.');
      return;
    }

    try {
      const mainWindow = window;
      const pipWindow = await pipWindowAPI.requestWindow({ width: 220, height: 120 });
      pipWindowRef.current = pipWindow;
      const pipDocument = pipWindow.document;

      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        pipDocument.head.appendChild(node.cloneNode(true));
      });

      const container = pipDocument.createElement('div');
      container.className = 'bg-slate-950 text-white min-h-screen p-4 flex flex-col justify-between select-none';
      container.style.fontFamily = 'monospace';
      pipDocument.body.appendChild(container);

      const render = () => {
        const currentSecondsLeft = Number(localStorage.getItem('lingosnap_pomodoro_seconds_left')) || 0;
        const currentRunning = localStorage.getItem('lingosnap_pomodoro_running') === 'true';

        const timeStr = formatTime(currentSecondsLeft);

        container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <p style="font-size: 10px; margin: 0; color: #67e8f9; font-weight: 800; text-transform: uppercase;">Pomodoro</p>
              <div style="font-size: 24px; font-weight: 900; margin-top: 2px;">${timeStr}</div>
            </div>
            <div style="width: 12px; height: 12px; border-radius: 9999px; background-color: ${currentRunning ? '#34d399' : '#fb923c'};"></div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button id="pip-toggle" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 800; border-radius: 8px; border: none; background: white; color: black; cursor: pointer;">
              ${currentRunning ? 'Pause' : 'Start'}
            </button>
            <button id="pip-reset" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 800; border-radius: 8px; border: none; background: rgba(255,255,255,0.1); color: white; cursor: pointer;">
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

  const [pipAutoOpened, setPipAutoOpened] = useState(false);
  const pipWindowRef = React.useRef<any>(null);
  const hasPiPSupport = Boolean((window as any).documentPictureInPicture);

  useEffect(() => {
    if (!running || !hasPiPSupport) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !pipAutoOpened) {
        openPiP();
        setPipAutoOpened(true);
      }
    };

    const handleBlur = () => {
      if (!pipAutoOpened) {
        openPiP();
        setPipAutoOpened(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [running, hasPiPSupport, pipAutoOpened]);

  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        setPipAutoOpened(false);
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          pipWindowRef.current.close();
          pipWindowRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="bg-gray-900 text-white rounded-xl p-5 shadow-2xl overflow-hidden relative">
        <div className="absolute -right-10 -top-7 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <p className="text-blue-300 font-black uppercase tracking-widest text-xs mb-3">Pomodoro Focus</p>
            <h2 className="text-3xl font-black tracking-tight mb-3">{formatTime(secondsLeft)}</h2>
            <p className="text-gray-300 font-medium">Bấm "Ghim luôn nổi" để mở đồng hồ nhỏ luôn nằm trên các app khác.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onToggle} className="px-6 py-2.5 rounded-lg bg-white text-gray-900 font-black hover:bg-blue-50 transition">
              {running ? 'Tạm dừng' : 'Bắt đầu'}
            </button>
            <button onClick={onReset} className="px-6 py-2.5 rounded-lg bg-white/10 font-black hover:bg-white/20 transition">
              Reset
            </button>
            {hasPiPSupport && (
              <button onClick={openPiP} className="px-6 py-2.5 rounded-xl bg-blue-600 font-black hover:bg-blue-700 transition">
                <i className="fa-solid fa-window-restore mr-2" />
                Ghim luôn nổi
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black text-gray-900">Cài đặt thời gian</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-sm font-bold text-gray-500">
              Phút học
              <input type="number" min={1} max={180} value={draftStudy} onChange={event => setDraftStudy(Number(event.target.value))} className="w-full rounded-xl bg-gray-50 px-4 py-3 font-black text-gray-900 outline-none ring-1 ring-gray-100 focus:ring-blue-500" />
            </label>
            <label className="space-y-2 text-sm font-bold text-gray-500">
              Phút nghỉ
              <input type="number" min={1} max={60} value={draftBreak} onChange={event => setDraftBreak(Number(event.target.value))} className="w-full rounded-xl bg-gray-50 px-4 py-3 font-black text-gray-900 outline-none ring-1 ring-gray-100 focus:ring-blue-500" />
            </label>
          </div>
          <button onClick={saveSettings} className="mt-4 w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white hover:bg-blue-600">Lưu cài đặt</button>
          <p className="mt-3 text-xs font-semibold text-gray-400">Đổi setting sẽ reset phiên hiện tại về thời lượng học mới.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm"><div className="text-2xl font-black">{currentStreak}</div><div className="text-gray-500 font-bold text-sm">Ngày liên tiếp</div></div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm"><div className="text-2xl font-black">{longestStreak}</div><div className="text-gray-500 font-bold text-sm">Streak dài nhất</div></div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm"><div className="text-2xl font-black">{totalMinutes}</div><div className="text-gray-500 font-bold text-sm">Tổng phút học</div></div>
        </div>
      </section>

      {message && <div className="p-4 rounded-xl bg-blue-50 text-blue-700 font-bold">{message}</div>}
      {!isSupabaseConfigured && <div className="p-4 rounded-xl bg-orange-50 text-orange-700 font-bold">Chưa có VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY nên chưa thể đồng bộ dữ liệu.</div>}
      {savingSession && <div className="p-4 rounded-xl bg-green-50 text-green-700 font-bold">Đang lưu Pomodoro hoàn thành...</div>}

      <DailyRings tasks={streakTasks} dayNotes={streakDayNotes} days={30} />
    </div>
  );
};

export default PomodoroDashboard;
