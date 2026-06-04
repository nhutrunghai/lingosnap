import React, { useEffect, useMemo, useState } from 'react';
import { PomodoroSession } from '../types';
import { fetchPomodoroSessions, isSupabaseConfigured, savePomodoroSession } from '../services/supabaseService';

const STUDY_MINUTES = 25;
const BREAK_MINUTES = 5;

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

const PomodoroDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(STUDY_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
    const data = await fetchPomodoroSessions();
    setSessions(data);
  };

  useEffect(() => {
    loadSessions().catch(() => setMessage('Không tải được dữ liệu Pomodoro.'));
  }, []);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          completePomodoro();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  const completePomodoro = async () => {
    if (!isSupabaseConfigured) {
      setMessage('Bạn cần cấu hình Supabase trước khi lưu streak.');
      return;
    }

    setSaving(true);
    try {
      const session = await savePomodoroSession(STUDY_MINUTES);
      setSessions(prev => [session, ...prev]);
      setSecondsLeft(BREAK_MINUTES * 60);
      setMessage('Đã hoàn thành Pomodoro! Hôm nay được đánh dấu học.');
    } catch {
      setMessage('Lưu Pomodoro thất bại, kiểm tra Supabase schema/env.');
    } finally {
      setSaving(false);
    }
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="bg-gray-900 text-white rounded-3xl p-5 shadow-2xl overflow-hidden relative">
        <div className="absolute -right-10 -top-7 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <p className="text-blue-300 font-black uppercase tracking-widest text-xs mb-3">Pomodoro Focus</p>
            <h2 className="text-3xl font-black tracking-tight mb-3">{minutes}:{seconds}</h2>
            <p className="text-gray-300 font-medium">Hoàn thành 25 phút học để ghi nhận streak giống GitHub.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRunning(prev => !prev)} className="px-6 py-2.5 rounded-2xl bg-white text-gray-900 font-black hover:bg-blue-50 transition">
              {running ? 'Tạm dừng' : 'Bắt đầu'}
            </button>
            <button onClick={() => { setRunning(false); setSecondsLeft(STUDY_MINUTES * 60); }} className="px-6 py-2.5 rounded-2xl bg-white/10 font-black hover:bg-white/20 transition">
              Reset
            </button>
          </div>
        </div>
      </section>

      {message && <div className="p-4 rounded-2xl bg-blue-50 text-blue-700 font-bold">{message}</div>}
      {!isSupabaseConfigured && <div className="p-4 rounded-2xl bg-orange-50 text-orange-700 font-bold">Chưa có VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY nên chưa thể đồng bộ dữ liệu.</div>}

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm"><div className="text-2xl font-black">{currentStreak}</div><div className="text-gray-500 font-bold text-sm">Ngày liên tiếp</div></div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm"><div className="text-2xl font-black">{longestStreak}</div><div className="text-gray-500 font-bold text-sm">Streak dài nhất</div></div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm"><div className="text-2xl font-black">{totalMinutes}</div><div className="text-gray-500 font-bold text-sm">Tổng phút học</div></div>
      </section>

      <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-black text-gray-900">Lịch học 12 tuần gần đây</h3>
          {saving && <span className="text-xs font-black text-blue-600">Đang lưu...</span>}
        </div>
        <div className="grid grid-cols-12 gap-2">
          {calendarDays.map(day => (
            <div key={day.key} title={`${day.key}: ${day.count} phiên`} className={`aspect-square rounded-md ${day.count === 0 ? 'bg-gray-100' : day.count === 1 ? 'bg-green-300' : day.count === 2 ? 'bg-green-500' : 'bg-green-700'}`} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default PomodoroDashboard;

