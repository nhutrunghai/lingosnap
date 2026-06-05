import React, { useEffect, useMemo, useState } from 'react';
import { StreakDayNote, StreakTask, StreakTaskStatus } from '../services/streakTypes';
import { deleteStreakTask, fetchStreakDayNotes, fetchStreakTasks, saveStreakDayNote, saveStreakTask } from '../services/supabaseService';

interface StreakDashboardProps {
  activeTaskId: string | null;
  onStartTask: (task: StreakTask) => void;
  onCompleteActiveTask: () => void;
}

const statusLabel: Record<StreakTaskStatus, string> = {
  todo: '⬜ Chưa bắt đầu',
  doing: '🔵 Đang học',
  done: '✅ Đã hoàn thành',
};

const statusClass: Record<StreakTaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-500',
  doing: 'bg-blue-50 text-blue-600 animate-pulse',
  done: 'bg-emerald-50 text-emerald-600',
};

const formatViDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const toIsoDate = (value: string) => {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return trimmed;
};


const StreakDashboard: React.FC<StreakDashboardProps> = ({ activeTaskId, onStartTask, onCompleteActiveTask }) => {
  const [tasks, setTasks] = useState<StreakTask[]>([]);
  const [dayNotes, setDayNotes] = useState<Record<string, StreakDayNote>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const groupedTasks = useMemo(() => {
    return tasks.reduce<Record<string, StreakTask[]>>((acc, task) => {
      acc[task.studyDate] = acc[task.studyDate] || [];
      acc[task.studyDate].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const sortedDates = useMemo(() => Object.keys(groupedTasks).sort(), [groupedTasks]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskData, noteData] = await Promise.all([fetchStreakTasks(), fetchStreakDayNotes()]);
      setTasks(taskData);
      setDayNotes(noteData.reduce<Record<string, StreakDayNote>>((acc, note) => {
        acc[note.studyDate] = note;
        return acc;
      }, {}));
    } catch {
      setMessage('Không tải được danh sách kế hoạch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTaskId]);

  const handleCellChange = async (task: StreakTask, field: keyof StreakTask, value: any) => {
    const updated = { ...task, [field]: value };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    try {
      await saveStreakTask(updated);
    } catch {
      setMessage('Lưu thay đổi thất bại.');
    }
  };

  const handleDayNoteChange = async (date: string, field: keyof StreakDayNote, value: string) => {
    const oldNote = dayNotes[date] || { studyDate: date, weekday: '', totalHours: '', notes: '' };
    const nextNote = { ...oldNote, [field]: value };
    setDayNotes(prev => ({ ...prev, [date]: nextNote }));
    try {
      await saveStreakDayNote(nextNote);
    } catch {
      setMessage('Lưu ghi chú ngày thất bại.');
    }
  };

  const handleAddNew = async (date = new Date().toLocaleDateString('sv-SE')) => {
    const newTask: StreakTask = {
      id: crypto.randomUUID(),
      studyDate: date,
      timeSlot: '08:30-10:30',
      subject: 'Chủ đề mới',
      durationHours: 2.0,
      status: 'todo',
      notes: '',
    };
    setTasks(prev => [...prev, newTask]);
    try {
      await saveStreakTask(newTask);
    } catch {
      setMessage('Thêm hàng mới thất bại.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa hàng kế hoạch này?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await deleteStreakTask(id);
    } catch {
      setMessage('Xóa hàng thất bại.');
    }
  };

  const startTaskPomodoro = async (task: StreakTask) => {
    const updated: StreakTask = { ...task, status: 'doing' };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    await saveStreakTask(updated);
    onStartTask(updated);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Kế hoạch học tập & Streak</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Bảng kế hoạch theo ngày như Excel, tích hợp Pomodoro để hoàn thành nhiệm vụ.</p>
        </div>
        <button onClick={() => handleAddNew()} className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-200">
          + Thêm hàng mới
        </button>
      </div>

      {message && <div className="p-4 rounded-2xl bg-blue-50 text-blue-700 font-bold">{message}</div>}

      <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
        <table className="w-full border-collapse text-left text-xs font-bold text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black sticky top-0 z-10">
            <tr>
              <th className="p-4">Ngày</th>
              <th className="p-4">Khung giờ</th>
              <th className="p-4">Mảng học</th>
              <th className="p-4">Giờ học</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Ghi chú</th>
              <th className="p-4 text-center">Hành động</th>
            </tr>
          </thead>
          {loading && tasks.length === 0 ? (
            <tbody><tr><td colSpan={7} className="p-8 text-center text-slate-400">Đang tải kế hoạch...</td></tr></tbody>
          ) : tasks.length === 0 ? (
            <tbody><tr><td colSpan={7} className="p-8 text-center text-slate-400">Bảng trống. Hãy thêm hàng mới.</td></tr></tbody>
          ) : sortedDates.map((date, dateIndex) => {
            const note = dayNotes[date] || { studyDate: date, weekday: '', totalHours: '', notes: '' };
            return (
              <tbody key={date} className="divide-y divide-slate-100">
                <tr className="bg-amber-50/90 border-y border-amber-100">
                  <td colSpan={7} className="p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="font-black text-blue-900">
                        📌 Ngày {String(dateIndex + 1).padStart(2, '0')} - {formatViDate(date)} {note.weekday ? `- ${note.weekday}` : ''}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input value={note.totalHours} onChange={event => handleDayNoteChange(date, 'totalHours', event.target.value)} placeholder="Tổng giờ" className="rounded-xl bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700 outline-none ring-1 ring-amber-100 focus:ring-blue-500" />
                        <input value={note.notes} onChange={event => handleDayNoteChange(date, 'notes', event.target.value)} placeholder="Ghi chú ngày" className="min-w-[260px] rounded-xl bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 outline-none ring-1 ring-amber-100 focus:ring-blue-500" />
                        <button onClick={() => handleAddNew(date)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white">+ Hàng</button>
                      </div>
                    </div>
                  </td>
                </tr>

                {groupedTasks[date].map(task => {
                  const isActive = activeTaskId === task.id;
                  return (
                    <tr key={task.id} className={`hover:bg-slate-50/50 ${isActive ? 'bg-blue-50/40' : ''}`}>
                      <td className="p-3"><input type="text" value={formatViDate(task.studyDate)} onChange={event => handleCellChange(task, 'studyDate', toIsoDate(event.target.value))} className="bg-transparent outline-none font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-24" placeholder="dd/mm/yyyy" /></td>
                      <td className="p-3"><input type="text" value={task.timeSlot} onChange={event => handleCellChange(task, 'timeSlot', event.target.value)} className="bg-transparent outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-28" /></td>
                      <td className="p-3"><input type="text" value={task.subject} onChange={event => handleCellChange(task, 'subject', event.target.value)} className="bg-transparent outline-none text-slate-950 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-full" /></td>
                      <td className="p-3"><input type="number" step="0.5" min="0" value={task.durationHours} onChange={event => handleCellChange(task, 'durationHours', Number(event.target.value))} className="bg-transparent outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-16" /></td>
                      <td className="p-3"><span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${statusClass[task.status]}`}>{statusLabel[task.status]}</span></td>
                      <td className="p-3"><input type="text" value={task.notes} onChange={event => handleCellChange(task, 'notes', event.target.value)} className="bg-transparent outline-none text-slate-500 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-full font-semibold" placeholder="..." /></td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          {task.status !== 'done' && !isActive && <button onClick={() => startTaskPomodoro(task)} className="rounded-xl bg-slate-950 hover:bg-blue-600 text-white px-3 py-1.5 font-black transition">Học Pomo</button>}
                          {isActive && <button onClick={onCompleteActiveTask} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-black transition">Hoàn thành</button>}
                          <button onClick={() => handleDelete(task.id)} className="text-slate-300 hover:text-red-500 p-1.5 transition"><i className="fa-solid fa-trash-can" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
};

export default StreakDashboard;
