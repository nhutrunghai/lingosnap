import React from 'react';
import { StreakDayNote, StreakTask } from '../services/streakTypes';

interface DailyRingsProps {
  tasks: StreakTask[];
  dayNotes: StreakDayNote[];
  days?: number;
}

const parseTargetHours = (value: string) => {
  const match = String(value || '').match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
};

const getDateKey = (date: Date) => date.toLocaleDateString('sv-SE');
const formatViDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}`;
};

const getRingColor = (ratio: number) => {
  if (ratio >= 1) return '#22c55e';
  if (ratio >= 0.75) return '#3b82f6';
  if (ratio >= 0.45) return '#f59e0b';
  if (ratio > 0) return '#fb7185';
  return '#e5e7eb';
};

const DailyRings: React.FC<DailyRingsProps> = ({ tasks, dayNotes, days = 30 }) => {
  const notesByDate: Record<string, StreakDayNote> = {};
  dayNotes.forEach(note => {
    notesByDate[note.studyDate] = note;
  });

  const completedHoursByDate: Record<string, number> = {};
  tasks.forEach(task => {
    if (task.status === 'done') {
      completedHoursByDate[task.studyDate] = (completedHoursByDate[task.studyDate] || 0) + Number(task.durationHours || 0);
    }
  });

  const totalTasksByDate: Record<string, number> = {};
  tasks.forEach(task => {
    totalTasksByDate[task.studyDate] = (totalTasksByDate[task.studyDate] || 0) + 1;
  });

  const doneTasksByDate: Record<string, number> = {};
  tasks.forEach(task => {
    if (task.status === 'done') doneTasksByDate[task.studyDate] = (doneTasksByDate[task.studyDate] || 0) + 1;
  });

  const today = new Date();
  const dateKeys = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return getDateKey(date);
  });

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-black text-slate-950">Daily Rings</h3>
          <p className="text-xs font-semibold text-slate-500">Vòng càng đầy = hoàn thành càng nhiều giờ so với mục tiêu ngày.</p>
        </div>
        <div className="flex gap-2 text-[10px] font-black text-slate-500">
          <span className="rounded-full bg-rose-100 px-2 py-1">Ít</span>
          <span className="rounded-full bg-amber-100 px-2 py-1">Vừa</span>
          <span className="rounded-full bg-blue-100 px-2 py-1">Tốt</span>
          <span className="rounded-full bg-emerald-100 px-2 py-1">Đạt</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 sm:grid-cols-6 lg:grid-cols-10 xl:grid-cols-15">
        {dateKeys.map(dateKey => {
          const targetHours = parseTargetHours(notesByDate[dateKey]?.totalHours) || Math.max(1, tasks.filter(task => task.studyDate === dateKey).reduce((sum, task) => sum + Number(task.durationHours || 0), 0));
          const completedHours = completedHoursByDate[dateKey] || 0;
          const ratio = Math.min(1, targetHours ? completedHours / targetHours : 0);
          const percent = Math.round(ratio * 100);
          const color = getRingColor(ratio);
          const totalTasks = totalTasksByDate[dateKey] || 0;
          const doneTasks = doneTasksByDate[dateKey] || 0;

          return (
            <div key={dateKey} className="group relative flex flex-col items-center gap-2 rounded-2xl bg-slate-50 p-3 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg">
              <div
                className="grid h-16 w-16 place-items-center rounded-full"
                style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, #e5e7eb 0deg)` }}
                title={`${dateKey}: ${completedHours}/${targetHours}h, ${doneTasks}/${totalTasks} tasks`}
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-center shadow-inner">
                  <span className="text-[11px] font-black text-slate-950">{completedHours}h</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-black text-slate-500">{formatViDate(dateKey)}</div>
                <div className="text-[9px] font-bold text-slate-400">{doneTasks}/{totalTasks || 0}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DailyRings;
