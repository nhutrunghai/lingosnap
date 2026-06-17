import React, { useEffect, useMemo, useState } from 'react';
import { DailyCheckin, DailyCheckinSettings } from '../services/streakTypes';
import { fetchDailyCheckinSettings, fetchDailyCheckins, saveDailyCheckin, saveDailyCheckinSettings } from '../services/supabaseService';

const text = {
  title: 'Tickbox hằng ngày',
  desc: 'Mỗi ngày chỉ tick được sau 10:00 sáng theo giờ Việt Nam. Bạn có thể chọn độ dài chuỗi ngày để theo dõi.',
  targetDays: 'Chuỗi ngày',
  tickToday: 'Tick hôm nay',
  tickDone: 'Đã tick hôm nay',
  tickLocked: 'Mở tick sau 10:00 VN',
  loadFail: 'Không tải được dữ liệu tickbox.',
  checkinFail: 'Lưu tick hôm nay thất bại.',
  settingsFail: 'Lưu chuỗi ngày thất bại.',
  today: 'Hôm nay',
  progress: 'Tiến độ chuỗi',
};

const DEFAULT_CHECKIN_SETTINGS: DailyCheckinSettings = {
  targetDays: 7,
  unlockHour: 10,
  timezone: 'Asia/Ho_Chi_Minh',
};

const formatViDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
};

const getVietnamNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_CHECKIN_SETTINGS.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date()).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour || 0),
    minute: Number(parts.minute || 0),
  };
};

const addDays = (date: string, amount: number) => {
  const next = new Date(`${date}T00:00:00+07:00`);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
};

const buildCheckinDays = (today: string, targetDays: number) => {
  return Array.from({ length: targetDays }, (_, index) => addDays(today, index - targetDays + 1));
};

const DailyCheckinDashboard: React.FC = () => {
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [settings, setSettings] = useState<DailyCheckinSettings>(DEFAULT_CHECKIN_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const vietnamNow = getVietnamNow();
  const checkedDates = useMemo(() => new Set(checkins.map(item => item.studyDate)), [checkins]);
  const checkinDays = useMemo(() => buildCheckinDays(vietnamNow.date, settings.targetDays), [settings.targetDays, vietnamNow.date]);
  const checkedToday = checkedDates.has(vietnamNow.date);
  const canTickToday = vietnamNow.hour >= settings.unlockHour;
  const checkedInTarget = checkinDays.filter(date => checkedDates.has(date)).length;

  const loadData = async () => {
    setLoading(true);
    try {
      const [checkinData, settingsData] = await Promise.all([fetchDailyCheckins(), fetchDailyCheckinSettings()]);
      setCheckins(checkinData);
      setSettings(settingsData || DEFAULT_CHECKIN_SETTINGS);
    } catch {
      setMessage(text.loadFail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTargetDaysChange = async (value: number) => {
    const targetDays = Math.min(365, Math.max(1, value || 1));
    const nextSettings = { ...settings, targetDays };
    setSettings(nextSettings);
    try {
      await saveDailyCheckinSettings(nextSettings);
    } catch {
      setMessage(text.settingsFail);
    }
  };

  const handleTickToday = async () => {
    if (!canTickToday || checkedToday) return;
    const optimistic: DailyCheckin = { studyDate: vietnamNow.date, checkedAt: new Date().toISOString() };
    setCheckins(prev => [...prev.filter(item => item.studyDate !== vietnamNow.date), optimistic]);
    try {
      await saveDailyCheckin(vietnamNow.date);
    } catch {
      setMessage(text.checkinFail);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-300/60">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Daily Check-in</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">{text.title}</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">{text.desc}</p>
          </div>
          <button onClick={handleTickToday} disabled={!canTickToday || checkedToday} className={`rounded-2xl px-7 py-4 text-sm font-black shadow-xl transition ${checkedToday ? 'bg-emerald-500 text-white shadow-emerald-900/20' : canTickToday ? 'bg-white text-slate-950 shadow-white/10 hover:bg-emerald-400 hover:text-white' : 'cursor-not-allowed bg-slate-700 text-slate-400 shadow-none'}`}>
            {checkedToday ? text.tickDone : canTickToday ? text.tickToday : text.tickLocked}
          </button>
        </div>
      </section>

      {message && <div className="rounded-xl bg-blue-50 p-4 font-bold text-blue-700">{message}</div>}
      {loading && <div className="rounded-xl bg-white p-5 text-center font-black text-slate-400">Loading...</div>}

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xl shadow-emerald-100/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">{text.progress}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{checkedInTarget}/{settings.targetDays} ngày trong chuỗi</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{text.today}: {formatViDate(vietnamNow.date)} · {vietnamNow.hour.toString().padStart(2, '0')}:{vietnamNow.minute.toString().padStart(2, '0')} VN</p>
          </div>
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">
            {text.targetDays}
            <input type="number" min="1" max="365" value={settings.targetDays} onChange={event => handleTargetDaysChange(Number(event.target.value))} className="mt-1 w-28 rounded-xl border border-slate-200 px-3 py-2 text-base font-black text-slate-950 outline-none focus:border-emerald-500" />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-14">
          {checkinDays.map(date => {
            const checked = checkedDates.has(date);
            const isToday = date === vietnamNow.date;
            return (
              <div key={date} className={`rounded-xl border p-2 text-center ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isToday ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                <div className="text-[10px] font-black">{formatViDate(date).slice(0, 5)}</div>
                <div className="mt-1 text-lg">{checked ? '✅' : '⬜'}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default DailyCheckinDashboard;
