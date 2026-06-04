import React, { useEffect, useState } from 'react';
import { StreakTask } from '../services/streakTypes';
import { deleteStreakTask, fetchStreakTasks, saveStreakTask } from '../services/supabaseService';

interface StreakDashboardProps {
  activeTaskId: string | null;
  onStartTask: (task: StreakTask) => void;
  onCompleteActiveTask: () => void;
}

const StreakDashboard: React.FC<StreakDashboardProps> = ({ activeTaskId, onStartTask, onCompleteActiveTask }) => {
  const [tasks, setTasks] = useState<StreakTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchStreakTasks();
      setTasks(data);
    } catch {
      setMessage('Không tải được danh sách kế hoạch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
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

  const handleAddNew = async () => {
    const newTask: StreakTask = {
      id: crypto.randomUUID(),
      studyDate: new Date().toLocaleDateString('sv-SE'),
      timeSlot: '08:30-10:30',
      subject: 'Chủ đề mới',
      durationHours: 2.0,
      status: 'Chưa bắt đầu',
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

  const startTaskPomodoro = (task: StreakTask) => {
    onStartTask(task);
    handleCellChange(task, 'status', 'Đang học');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Kế hoạch học tập & Streak</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Quản lý lộ trình học theo khung giờ, tích hợp Pomodoro để hoàn thành nhiệm vụ.</p>
        </div>
        <button onClick={handleAddNew} className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-200">
          + Thêm hàng mới
        </button>
      </div>

      {message && <div className="p-4 rounded-2xl bg-blue-50 text-blue-700 font-bold">{message}</div>}

      <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
        <table className="w-full border-collapse text-left text-xs font-bold text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black">
            <tr>
              <th className="p-4">Ngày</th>
              <th className="p-4">Khung giờ</th>
              <th className="p-4">Mảng học</th>
              <th className="p-4">Giờ học (h)</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Ghi chú</th>
              <th className="p-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">Đang tải kế hoạch...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">Bảng trống. Hãy thêm hàng mới.</td>
              </tr>
            ) : (
              tasks.map(task => {
                const isActive = activeTaskId === task.id;
                return (
                  <tr key={task.id} className={`hover:bg-slate-50/50 ${isActive ? 'bg-blue-50/40' : ''}`}>
                    <td className="p-3">
                      <input type="date" value={task.studyDate} onChange={event => handleCellChange(task, 'studyDate', event.target.value)} className="bg-transparent border-none outline-none font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1" />
                    </td>
                    <td className="p-3">
                      <input type="text" value={task.timeSlot} onChange={event => handleCellChange(task, 'timeSlot', event.target.value)} className="bg-transparent border-none outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-28" />
                    </td>
                    <td className="p-3">
                      <input type="text" value={task.subject} onChange={event => handleCellChange(task, 'subject', event.target.value)} className="bg-transparent border-none outline-none text-slate-950 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-full" />
                    </td>
                    <td className="p-3">
                      <input type="number" step="0.5" min="0" value={task.durationHours} onChange={event => handleCellChange(task, 'durationHours', Number(event.target.value))} className="bg-transparent border-none outline-none text-slate-700 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-16" />
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${task.status === 'Đã hoàn thành' ? 'bg-emerald-50 text-emerald-600' : task.status === 'Đang học' ? 'bg-blue-50 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <input type="text" value={task.notes} onChange={event => handleCellChange(task, 'notes', event.target.value)} className="bg-transparent border-none outline-none text-slate-500 focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-1 w-full font-semibold" placeholder="..." />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        {task.status !== 'Đã hoàn thành' && !isActive && (
                          <button onClick={() => startTaskPomodoro(task)} className="rounded-xl bg-slate-950 hover:bg-blue-600 text-white px-3 py-1.5 font-black transition">
                            Học Pomo
                          </button>
                        )}
                        {isActive && (
                          <button onClick={onCompleteActiveTask} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-black transition">
                            Hoàn thành
                          </button>
                        )}
                        <button onClick={() => handleDelete(task.id)} className="text-slate-300 hover:text-red-500 p-1.5 transition">
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StreakDashboard;
