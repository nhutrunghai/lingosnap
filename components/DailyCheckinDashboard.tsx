import React, { useEffect, useMemo, useState } from 'react';
import { DailyCheckin, DailyCheckinSettings } from '../services/streakTypes';
import { fetchDailyCheckinSettings, fetchDailyCheckins, resetDailyCheckins, saveDailyCheckin, saveDailyCheckinSettings } from '../services/supabaseService';

const LEVELS = [
  { label: '7 ngày', days: 7 },
  { label: '1 tháng', days: 30 },
  { label: '3 tháng', days: 90 },
  { label: '5 tháng', days: 150 },
  { label: '8 tháng', days: 240 },
  { label: '1 năm', days: 365 },
];

const text = {
  title: 'Tickbox hằng ngày',
  desc: 'Tickbox là chức năng riêng: mỗi ngày chỉ tick được sau 22:00 tối theo giờ Việt Nam. Miss 1 ngày sẽ reset về cấp 7 ngày.',
  tickToday: 'Tick hôm nay',
  tickDone: 'Đã tick hôm nay',
  tickLocked: 'Mở tick sau 22:00 VN',
  notStarted: 'Chuỗi này bắt đầu từ ngày mai',
  loadFail: 'Không tải được dữ liệu tickbox.',
  checkinFail: 'Lưu tick hôm nay thất bại.',
  settingsFail: 'Lưu cấp độ thất bại.',
  resetNotice: 'Bạn đã bỏ lỡ 1 ngày nên Tickbox được reset về cấp 7 ngày.',
  today: 'Hôm nay',
  progress: 'Tiến độ cấp hiện tại',
  chooseLevel: 'Chọn cấp độ',
  lockedLevel: 'Hoàn thành cấp trước để mở',
};

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

const formatViDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
};

const getVietnamNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
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

const getDefaultSettings = (today: string): DailyCheckinSettings => ({
  targetDays: LEVELS[0].days,
  unlockHour: 22,
  timezone: DEFAULT_TIMEZONE,
  currentLevelIndex: 0,
  unlockedLevelIndex: 0,
  startDate: addDays(today, 1),
});

const normalizeSettings = (settings: DailyCheckinSettings | null, today: string): DailyCheckinSettings => {
  const fallback = getDefaultSettings(today);
  const currentLevelIndex = Math.min(Math.max(settings?.currentLevelIndex ?? 0, 0), LEVELS.length - 1);
  const unlockedLevelIndex = Math.min(Math.max(settings?.unlockedLevelIndex ?? currentLevelIndex, 0), LEVELS.length - 1);
  return {
    targetDays: LEVELS[currentLevelIndex].days,
    unlockHour: 22,
    timezone: settings?.timezone || DEFAULT_TIMEZONE,
    currentLevelIndex,
    unlockedLevelIndex: Math.max(unlockedLevelIndex, currentLevelIndex),
    startDate: settings?.startDate || fallback.startDate,
  };
};

const buildCheckinDays = (startDate: string, targetDays: number) => {
  return Array.from({ length: targetDays }, (_, index) => addDays(startDate, index));
};

const hasMissedDay = (settings: DailyCheckinSettings, checkedDates: Set<string>, today: string) => {
  if (!settings.startDate || today <= settings.startDate) return false;

  let cursor = settings.startDate;
  while (cursor < today) {
    if (!checkedDates.has(cursor)) return true;
    cursor = addDays(cursor, 1);
  }
  return false;
};

const DailyCheckinDashboard: React.FC = () => {
  const vietnamNow = getVietnamNow();
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [settings, setSettings] = useState<DailyCheckinSettings>(() => getDefaultSettings(vietnamNow.date));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const checkedDates = useMemo(() => new Set(checkins.map(item => item.studyDate)), [checkins]);
  const activeLevel = LEVELS[settings.currentLevelIndex] || LEVELS[0];
  const checkinDays = useMemo(() => buildCheckinDays(settings.startDate, activeLevel.days), [activeLevel.days, settings.startDate]);
  const checkedToday = checkedDates.has(vietnamNow.date);
  const hasStarted = vietnamNow.date >= settings.startDate;
  const canTickToday = hasStarted && vietnamNow.hour >= settings.unlockHour;
  const checkedInTarget = checkinDays.filter(date => checkedDates.has(date)).length;
  const isLevelComplete = checkedInTarget >= activeLevel.days;

  const loadData = async () => {
    setLoading(true);
    try {
      const [checkinData, settingsData] = await Promise.all([fetchDailyCheckins(), fetchDailyCheckinSettings()]);
      const nextSettings = normalizeSettings(settingsData, vietnamNow.date);
      const nextCheckedDates = new Set(checkinData.map(item => item.studyDate));

      if (hasMissedDay(nextSettings, nextCheckedDates, vietnamNow.date)) {
        const resetSettings = getDefaultSettings(vietnamNow.date);
        await resetDailyCheckins();
        await saveDailyCheckinSettings(resetSettings);
        setCheckins([]);
        setSettings(resetSettings);
        setMessage(text.resetNotice);
        return;
      }

      setCheckins(checkinData);
      setSettings(nextSettings);
      if (!settingsData) await saveDailyCheckinSettings(nextSettings);
    } catch {
      setMessage(text.loadFail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectLevel = async (levelIndex: number) => {
    if (levelIndex > settings.unlockedLevelIndex) return;
    const nextSettings: DailyCheckinSettings = {
      ...settings,
      currentLevelIndex: levelIndex,
      targetDays: LEVELS[levelIndex].days,
      startDate: addDays(vietnamNow.date, 1),
    };
    setSettings(nextSettings);
    try {
      await resetDailyCheckins();
      await saveDailyCheckinSettings(nextSettings);
      setCheckins([]);
    } catch {
      setMessage(text.settingsFail);
    }
  };

  const completeLevelIfNeeded = async (nextCheckins: DailyCheckin[]) => {
    const nextCheckedDates = new Set(nextCheckins.map(item => item.studyDate));
    const nextCount = checkinDays.filter(date => nextCheckedDates.has(date)).length;
    if (nextCount < activeLevel.days) return;

    const nextUnlockedLevelIndex = Math.min(settings.currentLevelIndex + 1, LEVELS.length - 1);
    const nextSettings: DailyCheckinSettings = {
      ...settings,
      unlockedLevelIndex: Math.max(settings.unlockedLevelIndex, nextUnlockedLevelIndex),
    };
    setSettings(nextSettings);
    await saveDailyCheckinSettings(nextSettings);
  };

  const handleTickToday = async () => {
    if (!canTickToday || checkedToday || isLevelComplete) return;
    const optimistic: DailyCheckin = { studyDate: vietnamNow.date, checkedAt: new Date().toISOString() };
    const nextCheckins = [...checkins.filter(item => item.studyDate !== vietnamNow.date), optimistic];
    setCheckins(nextCheckins);
    try {
      await saveDailyCheckin(vietnamNow.date);
      await completeLevelIfNeeded(nextCheckins);
    } catch {
      setMessage(text.checkinFail);
    }
  };

  const tickLabel = checkedToday ? text.tickDone : !hasStarted ? text.notStarted : canTickToday ? text.tickToday : text.tickLocked;

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-300/60">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Daily Check-in</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">{text.title}</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">{text.desc}</p>
          </div>
          <button onClick={handleTickToday} disabled={!canTickToday || checkedToday || isLevelComplete} className={`rounded-2xl px-7 py-4 text-sm font-black shadow-xl transition ${checkedToday || isLevelComplete ? 'bg-emerald-500 text-white shadow-emerald-900/20' : canTickToday ? 'bg-white text-slate-950 shadow-white/10 hover:bg-emerald-400 hover:text-white' : 'cursor-not-allowed bg-slate-700 text-slate-400 shadow-none'}`}>
            {isLevelComplete ? 'Hoàn thành cấp này' : tickLabel}
          </button>
        </div>
      </section>

      {message && <div className="rounded-xl bg-blue-50 p-4 font-bold text-blue-700">{message}</div>}
      {loading && <div className="rounded-xl bg-white p-5 text-center font-black text-slate-400">Loading...</div>}

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/50">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500">{text.chooseLevel}</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Cấp hiện tại: {activeLevel.label}</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {LEVELS.map((level, index) => {
            const locked = index > settings.unlockedLevelIndex;
            const active = index === settings.currentLevelIndex;
            return (
              <button key={level.label} onClick={() => selectLevel(index)} disabled={locked} title={locked ? text.lockedLevel : level.label} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-200' : locked ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300' : 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-300'}`}>
                <div className="text-lg font-black">{level.label}</div>
                <div className="mt-2 text-xs font-bold opacity-75">{locked ? text.lockedLevel : active ? 'Đang chọn' : 'Đã mở khóa'}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xl shadow-emerald-100/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">{text.progress}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{checkedInTarget}/{activeLevel.days} ngày · Bắt đầu {formatViDate(settings.startDate)}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{text.today}: {formatViDate(vietnamNow.date)} · {vietnamNow.hour.toString().padStart(2, '0')}:{vietnamNow.minute.toString().padStart(2, '0')} VN</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">Mở tick lúc 22:00 VN</div>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-14">
          {checkinDays.map(date => {
            const checked = checkedDates.has(date);
            const isToday = date === vietnamNow.date;
            const future = date > vietnamNow.date;
            return (
              <div key={date} className={`rounded-xl border p-2 text-center ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isToday ? 'border-blue-200 bg-blue-50 text-blue-700' : future ? 'border-slate-100 bg-white text-slate-300' : 'border-red-100 bg-red-50 text-red-400'}`}>
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
