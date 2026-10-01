import React, { useEffect, useMemo, useState } from 'react';
import { AppMode, ExerciseFolder, ExerciseItem, ExerciseProgress, InterviewItem, NoteItem, VocabList } from './types';
import Header from './components/Header';
import QuizContainer from './components/QuizContainer';
import PronunciationMode from './components/PronunciationMode';
import PomodoroDashboard from './components/PomodoroDashboard';
import FloatingPomodoro from './components/FloatingPomodoro';
import CelebrationOverlay from './components/CelebrationOverlay';
import StreakDashboard from './components/StreakDashboard';
import VocaDashboard from './components/VocaDashboard';
import NoteDashboard from './components/NoteDashboard';
import InterviewDashboard from './components/InterviewDashboard';
import AuthGate from './components/AuthGate';
import {
  createExerciseFolder,
  deleteExerciseFolder,
  deleteVocabularyList,
  fetchExerciseFolders,
  fetchExerciseProgress,
  fetchInterviewItems,
  fetchNotes,
  fetchPomodoroSessions,
  fetchStreakTasks,
  fetchVocaWords,
  fetchVocabulary,
  isSupabaseConfigured,
  moveVocabularyListToFolder,
  renameVocabularyList,
  saveExerciseProgress,
  saveNote,
  savePomodoroSession,
  saveStreakTask,
  supabase,
} from './services/supabaseService';
import { StreakTask } from './services/streakTypes';
import { focusAudio } from './services/audioService';

const getModeTitle = (mode: AppMode) => {
  if (mode === AppMode.INTERVIEW) return 'Luyện ôn phỏng vấn';
  if (mode === AppMode.NOTE) return 'Sổ tay ghi chú & Snippets';
  if (mode === AppMode.POMODORO) return 'Study With Me & Focus Timer';
  if (mode === AppMode.VOCA) return 'Kho từ vựng & Thuật ngữ';
  if (mode === AppMode.STREAK) return 'Kế hoạch học tập & Streak';
  if (mode === AppMode.HISTORY) return 'Kho bài tập & Từ vựng';
  if (mode === AppMode.QUIZ) return 'Luyện tập làm bài';
  if (mode === AppMode.PRONUNCIATION) return 'Luyện phát âm';
  return 'Bàn làm việc cá nhân';
};

const LAST_CATEGORY_KEY = 'lingosnap_last_category';
const persistentCategories = new Set<AppMode>([
  AppMode.HOME,
  AppMode.INTERVIEW,
  AppMode.NOTE,
  AppMode.POMODORO,
  AppMode.VOCA,
  AppMode.STREAK,
  AppMode.HISTORY,
]);

const getSavedCategory = (): AppMode => {
  const savedMode = localStorage.getItem(LAST_CATEGORY_KEY) as AppMode | null;
  return savedMode && persistentCategories.has(savedMode) ? savedMode : AppMode.HOME;
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(getSavedCategory);
  const [activeList, setActiveList] = useState<ExerciseItem[]>([]);
  const [rawHistory, setRawHistory] = useState<ExerciseItem[]>([]);
  const [recentNotes, setRecentNotes] = useState<NoteItem[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<InterviewItem[]>([]);
  const [todayTasks, setTodayTasks] = useState<StreakTask[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Quick Scratchpad
  const [scratchpad, setScratchpad] = useState(() => localStorage.getItem('lingosnap_scratchpad') || '');
  const [scratchSaved, setScratchSaved] = useState(false);

  // Focus Audio State on Home
  const [homeRainActive, setHomeRainActive] = useState(false);
  const [homeWhiteNoiseActive, setHomeWhiteNoiseActive] = useState(false);

  // Pomodoro timer state
  const [studyMinutes, setStudyMinutes] = useState(() => Number(localStorage.getItem('lingosnap_study_minutes') || 25));
  const [breakMinutes, setBreakMinutes] = useState(() => Number(localStorage.getItem('lingosnap_break_minutes') || 5));
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(() =>
    Number(localStorage.getItem('lingosnap_pomodoro_seconds_left') || 25 * 60)
  );
  const [pomodoroInitialSeconds, setPomodoroInitialSeconds] = useState(() =>
    Number(localStorage.getItem('lingosnap_pomodoro_initial_seconds') || 25 * 60)
  );
  const [pomodoroRunning, setPomodoroRunning] = useState(
    () => localStorage.getItem('lingosnap_pomodoro_running') === 'true'
  );
  const [pomodoroDeadline, setPomodoroDeadline] = useState(() =>
    Number(localStorage.getItem('lingosnap_pomodoro_deadline') || 0)
  );
  const [savingPomodoro, setSavingPomodoro] = useState(false);
  const [activeStreakTask, setActiveStreakTask] = useState<StreakTask | null>(() => {
    const saved = localStorage.getItem('lingosnap_active_streak_task');
    return saved ? (JSON.parse(saved) as StreakTask) : null;
  });
  const [streakRefreshKey, setStreakRefreshKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, ExerciseProgress>>({});
  const [exerciseFolders, setExerciseFolders] = useState<ExerciseFolder[]>([]);
  const [folderName, setFolderName] = useState('');
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set(['unfiled']));

  const [dashboardStats, setDashboardStats] = useState({
    vocaWords: 0,
    vocaDue: 0,
    notes: 0,
    interviewItems: 0,
    interviewReviewed: 0,
    pomodoroSessions: 0,
    pomodoroMinutes: 0,
    streakDone: 0,
    streakDoing: 0,
    streakTodo: 0,
  });

  useEffect(() => {
    if (persistentCategories.has(mode)) localStorage.setItem(LAST_CATEGORY_KEY, mode);
  }, [mode]);

  const handleScratchpadChange = (text: string) => {
    setScratchpad(text);
    localStorage.setItem('lingosnap_scratchpad', text);
    setScratchSaved(true);
    setTimeout(() => setScratchSaved(false), 1500);
  };

  const convertScratchpadToNote = async () => {
    if (!scratchpad.trim()) return;
    try {
      const firstLine = scratchpad.trim().split('\n')[0].replace(/^[#\-*\s]+/, '').slice(0, 40);
      const title = firstLine || 'Ghi chú từ Scratchpad';
      await saveNote({
        title,
        content: scratchpad,
        mode: 'markdown',
        tags: ['scratchpad'],
      });
      setScratchpad('');
      localStorage.removeItem('lingosnap_scratchpad');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      initData();
    } catch {
      setSaveStatus('error');
    }
  };

  const toggleHomeRain = () => {
    const next = !homeRainActive;
    setHomeRainActive(next);
    focusAudio.setRain(next, 0.4);
  };

  const toggleHomeWhiteNoise = () => {
    const next = !homeWhiteNoiseActive;
    setHomeWhiteNoiseActive(next);
    focusAudio.setWhiteNoise(next, 0.25);
  };

  const groupedLists = useMemo(() => {
    const groups: { [key: string]: VocabList } = {};
    rawHistory.forEach(item => {
      const listId = String(item.listId || 'default');
      if (!groups[listId]) {
        const timestamp = listId.startsWith('list_') ? parseInt(listId.split('_')[1]) : null;
        const timeStr = timestamp
          ? new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : 'Lưu trữ';

        groups[listId] = {
          id: listId,
          name:
            item.listName ||
            (listId === 'default' ? 'Bộ bài tập mặc định' : `Bài tập lúc ${timeStr}`),
          date: item.dateLearned,
          items: [],
          folderId: item.folderId || '',
        };
      }
      groups[listId].items.push(item);
    });
    return Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
  }, [rawHistory]);

  const dashboardCards = [
    {
      label: 'Ôn phỏng vấn',
      value: dashboardStats.interviewItems,
      sub: `${dashboardStats.interviewReviewed} đã ôn · ${dashboardStats.interviewItems - dashboardStats.interviewReviewed} cần ôn`,
      icon: 'fa-comments',
      target: AppMode.INTERVIEW,
      iconColor: 'text-violet-600',
    },
    {
      label: 'Sổ tay Note',
      value: dashboardStats.notes,
      sub: 'Markdown & Snippets',
      icon: 'fa-note-sticky',
      target: AppMode.NOTE,
      iconColor: 'text-blue-600',
    },
    {
      label: 'Kho từ vựng Voca',
      value: dashboardStats.vocaWords,
      sub: `${dashboardStats.vocaDue} từ đến hạn ôn`,
      icon: 'fa-book-open-reader',
      target: AppMode.VOCA,
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Pomodoro',
      value: dashboardStats.pomodoroSessions,
      sub: `${Math.round(dashboardStats.pomodoroMinutes / 60)}h tập trung`,
      icon: 'fa-fire',
      target: AppMode.POMODORO,
      iconColor: 'text-rose-600',
    },
    {
      label: 'Kế hoạch Streak',
      value: dashboardStats.streakDone,
      sub: `${dashboardStats.streakDoing} đang làm`,
      icon: 'fa-calendar-check',
      target: AppMode.STREAK,
      iconColor: 'text-amber-600',
    },
  ];

  const initData = async () => {
    setSyncing(true);
    try {
      const data = await fetchVocabulary();
      setRawHistory(data || []);

      const [vocaResult, noteResult, pomodoroResult, streakResult, foldersResult, progressResult, interviewResult] =
        await Promise.allSettled([
          fetchVocaWords(),
          fetchNotes(),
          fetchPomodoroSessions(),
          fetchStreakTasks(),
          fetchExerciseFolders(),
          fetchExerciseProgress(),
          fetchInterviewItems(),
        ]);

      const vocaWords = vocaResult.status === 'fulfilled' ? vocaResult.value : [];
      const notes = noteResult.status === 'fulfilled' ? noteResult.value : [];
      const pomodoros = pomodoroResult.status === 'fulfilled' ? pomodoroResult.value : [];
      const streakTasks = streakResult.status === 'fulfilled' ? streakResult.value : [];
      const interviewItems = interviewResult.status === 'fulfilled' ? interviewResult.value : [];

      setRecentNotes(notes.slice(0, 4));
      setRecentInterviews(interviewItems.slice(0, 4));

      const todayStr = new Date().toLocaleDateString('sv-SE');
      setTodayTasks(streakTasks.filter(t => t.studyDate === todayStr));

      if (foldersResult.status === 'fulfilled') setExerciseFolders(foldersResult.value);
      if (progressResult.status === 'fulfilled') {
        setExerciseProgress(Object.fromEntries(progressResult.value.map(item => [item.listId, item])));
      }

      const now = Date.now();
      const vocaDueCount = vocaWords.filter(w => !w.nextReviewAt || new Date(w.nextReviewAt).getTime() <= now).length;

      setDashboardStats({
        vocaWords: vocaWords.length,
        vocaDue: vocaDueCount,
        notes: notes.length,
        interviewItems: interviewItems.length,
        interviewReviewed: interviewItems.filter(i => i.reviewed).length,
        pomodoroSessions: pomodoros.length,
        pomodoroMinutes: pomodoros.reduce((sum, session) => sum + Number(session.minutes || 0), 0),
        streakDone: streakTasks.filter(task => task.status === 'done').length,
        streakDoing: streakTasks.filter(task => task.status === 'doing').length,
        streakTodo: streakTasks.filter(task => task.status === 'todo').length,
      });
    } catch (e) {
      console.error('Sync Error:', e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSignedIn(Boolean(data.session));
        setAuthChecked(true);
        if (data.session) initData();
      })
      .catch(error => {
        console.error('Auth session check error:', error);
        setSignedIn(false);
        setAuthChecked(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setAuthChecked(true);
      if (session) initData();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const resetPomodoro = () => {
    const taskToCancel = activeStreakTask;
    const nextSeconds = studyMinutes * 60;
    setPomodoroRunning(false);
    setPomodoroDeadline(0);
    setPomodoroSecondsLeft(nextSeconds);
    setActiveStreakTask(null);
    setStreakRefreshKey(key => key + 1);
    localStorage.setItem('lingosnap_pomodoro_running', 'false');
    localStorage.setItem('lingosnap_pomodoro_deadline', '0');
    localStorage.removeItem('lingosnap_active_streak_task');
    setPomodoroInitialSeconds(nextSeconds);
    localStorage.setItem('lingosnap_pomodoro_seconds_left', String(nextSeconds));
    localStorage.setItem('lingosnap_pomodoro_initial_seconds', String(nextSeconds));

    if (taskToCancel?.status === 'doing') {
      saveStreakTask({ ...taskToCancel, status: 'todo' })
        .then(() => setStreakRefreshKey(key => key + 1))
        .catch(error => console.error('Cancel streak task error:', error));
    }
  };

  const completeStreakTask = async (task = activeStreakTask) => {
    if (!task) return;
    const completedTask: StreakTask = { ...task, status: 'done' };
    await saveStreakTask(completedTask);
    setActiveStreakTask(null);
    setStreakRefreshKey(key => key + 1);
    localStorage.removeItem('lingosnap_active_streak_task');
  };

  const completePomodoro = async () => {
    if (savingPomodoro) return;
    setSavingPomodoro(true);
    setPomodoroRunning(false);
    setPomodoroDeadline(0);
    localStorage.setItem('lingosnap_pomodoro_running', 'false');
    localStorage.setItem('lingosnap_pomodoro_deadline', '0');

    focusAudio.playChime();

    try {
      const completedTask = activeStreakTask;
      const completedMinutes = completedTask
        ? Math.round((completedTask.durationHours || 0) * 60)
        : studyMinutes;
      await savePomodoroSession(completedMinutes, completedTask?.studyDate);
      await completeStreakTask(completedTask);
      const breakSeconds = breakMinutes * 60;
      setPomodoroSecondsLeft(breakSeconds);
      localStorage.setItem('lingosnap_pomodoro_seconds_left', String(breakSeconds));
      setSaveStatus('success');
      setShowCelebration(true);
      setTimeout(() => setSaveStatus('idle'), 2000);
      initData();
    } catch (error) {
      console.error('Pomodoro save error:', error);
      setSaveStatus('error');
    } finally {
      setSavingPomodoro(false);
    }
  };

  const togglePomodoro = () => {
    if (pomodoroRunning) {
      const remaining = Math.max(0, Math.ceil((pomodoroDeadline - Date.now()) / 1000));
      setPomodoroRunning(false);
      setPomodoroDeadline(0);
      setPomodoroSecondsLeft(remaining);
      localStorage.setItem('lingosnap_pomodoro_running', 'false');
      localStorage.setItem('lingosnap_pomodoro_deadline', '0');
      localStorage.setItem('lingosnap_pomodoro_seconds_left', String(remaining));
      return;
    }

    const defaultSeconds = studyMinutes * 60;
    const seconds = pomodoroSecondsLeft > 0 ? pomodoroSecondsLeft : defaultSeconds;
    const deadline = Date.now() + seconds * 1000;
    setPomodoroInitialSeconds(prev => prev || defaultSeconds);
    localStorage.setItem('lingosnap_pomodoro_initial_seconds', String(pomodoroInitialSeconds || defaultSeconds));
    setPomodoroRunning(true);
    setPomodoroDeadline(deadline);
    localStorage.setItem('lingosnap_pomodoro_running', 'true');
    localStorage.setItem('lingosnap_pomodoro_deadline', String(deadline));
    localStorage.setItem('lingosnap_pomodoro_seconds_left', String(seconds));
  };

  const startStreakTaskPomodoro = async (task: StreakTask) => {
    const runningTask: StreakTask = { ...task, status: 'doing' };
    setActiveStreakTask(runningTask);
    localStorage.setItem('lingosnap_active_streak_task', JSON.stringify(runningTask));
    await saveStreakTask(runningTask);
    const seconds = Math.max(1, Math.round((task.durationHours || studyMinutes / 60) * 3600));
    const deadline = Date.now() + seconds * 1000;
    setPomodoroSecondsLeft(seconds);
    setPomodoroInitialSeconds(seconds);
    setPomodoroDeadline(deadline);
    setPomodoroRunning(true);
    localStorage.setItem('lingosnap_pomodoro_seconds_left', String(seconds));
    localStorage.setItem('lingosnap_pomodoro_deadline', String(deadline));
    localStorage.setItem('lingosnap_pomodoro_initial_seconds', String(seconds));
    localStorage.setItem('lingosnap_pomodoro_running', 'true');
    setMode(AppMode.POMODORO);
  };

  const updatePomodoroSettings = (nextStudyMinutes: number, nextBreakMinutes: number) => {
    setStudyMinutes(nextStudyMinutes);
    setBreakMinutes(nextBreakMinutes);
    localStorage.setItem('lingosnap_study_minutes', String(nextStudyMinutes));
    localStorage.setItem('lingosnap_break_minutes', String(nextBreakMinutes));
    setPomodoroRunning(false);
    setPomodoroDeadline(0);
    setPomodoroSecondsLeft(nextStudyMinutes * 60);
    setPomodoroInitialSeconds(nextStudyMinutes * 60);
    localStorage.setItem('lingosnap_pomodoro_running', 'false');
    localStorage.setItem('lingosnap_pomodoro_deadline', '0');
    localStorage.setItem('lingosnap_pomodoro_seconds_left', String(nextStudyMinutes * 60));
    localStorage.setItem('lingosnap_pomodoro_initial_seconds', String(nextStudyMinutes * 60));
  };

  useEffect(() => {
    if (!pomodoroRunning || !pomodoroDeadline) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((pomodoroDeadline - Date.now()) / 1000));
      setPomodoroSecondsLeft(remaining);
      localStorage.setItem('lingosnap_pomodoro_seconds_left', String(remaining));
      if (remaining <= 0) completePomodoro();
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [pomodoroRunning, pomodoroDeadline, studyMinutes, breakMinutes, savingPomodoro]);
﻿  const handleDeleteList = async (listId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bộ bài tập này không?')) return;
    try {
      await deleteVocabularyList(listId);
      setRawHistory(prev => prev.filter(item => item.listId !== listId));
    } catch (error) {
      alert(error instanceof Error ? `Không thể xóa bộ bài tập: ${error.message}` : 'Không thể xóa bộ.');
    }
  };

  const handleRenameList = async (list: VocabList) => {
    const name = editingListName.trim();
    if (!name) return;

    try {
      if (name !== list.name) {
        await renameVocabularyList(list.id, name);
        setRawHistory(prev =>
          prev.map(item => (item.listId === list.id ? { ...item, listName: name } : item))
        );
      }
      setEditingListId(null);
    } catch (error) {
      alert(error instanceof Error ? `Không thể đổi tên: ${error.message}` : 'Không thể đổi tên.');
    }
  };

  const handleCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    try {
      const folder = await createExerciseFolder(name);
      setExerciseFolders(previous => [folder, ...previous]);
      setFolderName('');
    } catch (error) {
      alert(error instanceof Error ? `Không thể tạo thư mục: ${error.message}` : 'Không thể tạo thư mục.');
    }
  };

  const handleMoveListToFolder = async (listId: string, folderId: string | null) => {
    try {
      await moveVocabularyListToFolder(listId, folderId);
      setRawHistory(previous =>
        previous.map(item => (item.listId === listId ? { ...item, folderId: folderId || '' } : item))
      );
    } catch (error) {
      alert(error instanceof Error ? `Không thể chuyển bộ: ${error.message}` : 'Không thể chuyển.');
    } finally {
      setDraggedListId(null);
    }
  };

  const handleDeleteFolder = async (folder: ExerciseFolder) => {
    if (!confirm(`Xóa thư mục "${folder.name}"? Các bộ bài tập bên trong sẽ được chuyển ra ngoài.`)) return;
    try {
      await deleteExerciseFolder(folder.id);
      setExerciseFolders(previous => previous.filter(item => item.id !== folder.id));
      setRawHistory(previous =>
        previous.map(item => (item.folderId === folder.id ? { ...item, folderId: '' } : item))
      );
    } catch (error) {
      alert(error instanceof Error ? `Không thể xóa thư mục: ${error.message}` : 'Không thể xóa thư mục.');
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setSignedIn(false);
      setMode(AppMode.HOME);
    } catch (error) {
      alert(error instanceof Error ? `Không thể đăng xuất: ${error.message}` : 'Không thể đăng xuất.');
    }
  };

  const handleExerciseComplete = async (score: number, total: number) => {
    const listId = activeList[0]?.listId;
    if (!listId) return;
    try {
      const progress = await saveExerciseProgress(listId, score, total);
      setExerciseProgress(previous => ({ ...previous, [listId]: progress }));
    } catch (error) {
      console.error('Could not save exercise progress', error);
    }
  };

  if (!authChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <i className="fa-solid fa-terminal text-lg" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">LingoSnap</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">Đang khôi phục phiên làm việc...</p>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return <AuthGate onSignedIn={() => { setSignedIn(true); setAuthChecked(true); }} />;
  }

  const renderFolderSection = (
    title: string,
    folderId: string | null,
    lists: VocabList[],
    folder?: ExerciseFolder
  ) => {
    const treeId = folderId || 'unfiled';
    const expanded = expandedFolderIds.has(treeId);
    const toggle = () =>
      setExpandedFolderIds(previous => {
        const next = new Set(previous);
        if (next.has(treeId)) next.delete(treeId);
        else next.add(treeId);
        return next;
      });

    return (
      <section
        key={treeId}
        onDragOver={event => event.preventDefault()}
        onDrop={() => {
          if (draggedListId) handleMoveListToFolder(draggedListId, folderId);
        }}
        className={`overflow-hidden rounded-xl border transition ${
          draggedListId ? 'border-dashed border-blue-400 bg-blue-50/50' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={toggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <i
              className={`fa-solid fa-chevron-right text-[10px] text-slate-400 transition ${
                expanded ? 'rotate-90' : ''
              }`}
            />
            <i className="fa-solid fa-folder text-sm text-blue-600" />
            <span className="truncate text-xs font-bold text-slate-900">{title}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {lists.length}
            </span>
          </button>
          {folder && (
            <button
              onClick={() => handleDeleteFolder(folder)}
              title="Xóa thư mục"
              className="flex h-7 w-7 items-center justify-center text-slate-400 transition hover:text-rose-600"
            >
              <i className="fa-solid fa-trash text-xs" />
            </button>
          )}
        </div>
        {expanded && (
          <div className="border-t border-slate-100 bg-slate-50/70 p-2.5">
            <div className="space-y-2 border-l-2 border-slate-200 pl-3">
              {lists.length ? (
                lists.map(list => (
                  <div key={list.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-900">{list.name}</span>
                    <button
                      onClick={() => { setActiveList(list.items); setMode(AppMode.QUIZ); }}
                      className="rounded bg-slate-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-600"
                    >
                      Ôn
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-2 text-xs text-slate-400">Chưa có bài tập trong thư mục này.</p>
              )}
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header mode={mode} onNavigate={setMode} onSync={initData} onSignOut={handleSignOut} syncing={syncing} />

      {saveStatus !== 'idle' && (
        <div
          className={`fixed right-4 top-5 z-[80] rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-lg ${
            saveStatus === 'saving'
              ? 'bg-amber-600'
              : saveStatus === 'success'
              ? 'bg-emerald-600'
              : 'bg-rose-600'
          }`}
        >
          {saveStatus === 'saving'
            ? 'Đang lưu vào Supabase...'
            : saveStatus === 'success'
            ? 'Đã lưu thành công!'
            : 'Lỗi lưu dữ liệu'}
        </div>
      )}

      {/* Main Workspace Frame */}
      <main className="ml-[64px] min-h-screen px-4 py-5 sm:px-6 lg:ml-60 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[92rem] space-y-6">
          {/* Top Workspace Header */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  LingoSnap Workbench
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                  Personal Edition
                </span>
              </div>
              <h1 className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900">{getModeTitle(mode)}</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={initData}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <i className={`fa-solid fa-arrows-rotate text-xs ${syncing ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
                <span>{syncing ? 'Đang đồng bộ...' : 'Supabase Sync'}</span>
              </button>
            </div>
          </div>

          {/* HOME COMMAND CENTER */}
          {mode === AppMode.HOME && (
            <div className="space-y-6">
              {/* Review Due Banner */}
              {(dashboardStats.interviewItems - dashboardStats.interviewReviewed > 0 || dashboardStats.vocaDue > 0) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/70 p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                      <i className="fa-solid fa-bell text-sm" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-violet-800">
                        Nhiệm vụ ôn tập hôm nay
                      </h4>
                      <p className="text-xs text-violet-950 mt-0.5">
                        Bạn có <strong>{dashboardStats.interviewItems - dashboardStats.interviewReviewed} câu phỏng vấn</strong> cần luyện lại và <strong>{dashboardStats.vocaDue} từ vựng</strong> đến hạn ôn.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMode(AppMode.INTERVIEW)}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-700"
                    >
                      Ôn Phỏng Vấn
                    </button>
                    <button
                      onClick={() => setMode(AppMode.VOCA)}
                      className="rounded-lg bg-white border border-violet-200 px-3 py-1.5 text-xs font-bold text-violet-800 transition hover:bg-violet-100"
                    >
                      Ôn Từ Vựng
                    </button>
                  </div>
                </div>
              )}

              {/* Metric Cards Grid */}
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {dashboardCards.map(card => (
                  <button
                    key={card.label}
                    onClick={() => setMode(card.target)}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-slate-400 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900">
                        {card.label}
                      </span>
                      <div className={`grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-sm ${card.iconColor}`}>
                        <i className={`fa-solid ${card.icon}`} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-bold tracking-tight text-slate-900">
                        {card.value}
                      </div>
                      <div className="mt-1 truncate text-[11px] font-medium text-slate-400">
                        {card.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </section>

              {/* Study With Me & Scratchpad Section */}
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                {/* Focus & Study with me Hub */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Focus &amp; Study With Me</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Khởi động phiên tập trung và âm thanh thư giãn</p>
                    </div>
                    <button
                      onClick={() => setMode(AppMode.POMODORO)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Toàn màn hình
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div>
                      <div className="font-mono text-4xl font-bold text-slate-900 tracking-tight">
                        {Math.floor(pomodoroSecondsLeft / 60)}:{(pomodoroSecondsLeft % 60).toString().padStart(2, '0')}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {pomodoroRunning ? 'Đang trong phiên học tập trung' : 'Phiên 25 phút / nghỉ 5 phút'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePomodoro}
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold text-white transition ${
                          pomodoroRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        <i className={`fa-solid ${pomodoroRunning ? 'fa-pause' : 'fa-play'} text-xs`} />
                        <span>{pomodoroRunning ? 'Tạm dừng' : 'Bắt đầu Pomo'}</span>
                      </button>
                      <button
                        onClick={resetPomodoro}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Ambient Sounds Quick Toggle */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Âm thanh chạy nền (Offline Web Audio):</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={toggleHomeRain}
                        className={`flex items-center justify-center gap-2 rounded-lg p-2.5 text-xs font-semibold transition border ${
                          homeRainActive
                            ? 'border-blue-300 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <i className="fa-solid fa-cloud-rain text-xs text-blue-500" />
                        <span>{homeRainActive ? 'Tắt tiếng mưa' : 'Bật tiếng mưa 🌧️'}</span>
                      </button>
                      <button
                        onClick={toggleHomeWhiteNoise}
                        className={`flex items-center justify-center gap-2 rounded-lg p-2.5 text-xs font-semibold transition border ${
                          homeWhiteNoiseActive
                            ? 'border-violet-300 bg-violet-50 text-violet-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <i className="fa-solid fa-water text-xs text-violet-500" />
                        <span>{homeWhiteNoiseActive ? 'Tắt ồn trắng' : 'Bật ồn trắng 🌊'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Today's Tasks */}
                  {todayTasks.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-700 mb-2">Mục tiêu trong ngày hôm nay:</p>
                      <div className="space-y-1.5">
                        {todayTasks.map(task => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                          >
                            <span className="font-semibold text-slate-800">{task.subject}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              task.status === 'done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : task.status === 'doing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {task.status === 'done' ? 'Đã xong' : task.status === 'doing' ? 'Đang học' : 'Chưa xong'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Scratchpad (Instant local notes) */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-pen-clip text-slate-500 text-xs" />
                        <h3 className="text-sm font-bold text-slate-900">Scratchpad (Ghi chú nhanh)</h3>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {scratchSaved ? 'Đã tự lưu ✓' : 'Tự lưu tức thì'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ghi chép nhanh link, lệnh terminal hoặc ý tưởng bất chợt vào đây.
                    </p>
                  </div>

                  <textarea
                    value={scratchpad}
                    onChange={e => handleScratchpadChange(e.target.value)}
                    placeholder="Gõ nháp nhanh vào đây (tự động lưu vào trình duyệt)..."
                    rows={8}
                    className="w-full flex-1 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono text-slate-800 outline-none focus:border-slate-900 focus:bg-white resize-none"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      {scratchpad.length} ký tự
                    </span>
                    <button
                      onClick={convertScratchpadToNote}
                      disabled={!scratchpad.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50"
                    >
                      <i className="fa-solid fa-arrow-right-to-bracket text-xs" />
                      <span>Lưu thành Note chính thức</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Notes & Interview Questions */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Interview Questions */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Câu hỏi phỏng vấn gần đây</h3>
                    <button
                      onClick={() => setMode(AppMode.INTERVIEW)}
                      className="text-xs font-bold text-violet-600 hover:underline"
                    >
                      Tất cả ({dashboardStats.interviewItems})
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentInterviews.length === 0 ? (
                      <p className="py-4 text-xs text-slate-400 text-center">Chưa có câu hỏi phỏng vấn nào.</p>
                    ) : (
                      recentInterviews.map(item => (
                        <div
                          key={item.id}
                          onClick={() => setMode(AppMode.INTERVIEW)}
                          className="cursor-pointer rounded-lg border border-slate-100 p-3 hover:border-violet-300 hover:bg-violet-50/30 transition"
                        >
                          <div className="flex items-start gap-2">
                            <i className={`fa-solid ${item.reviewed ? 'fa-circle-check text-emerald-500' : 'fa-circle text-slate-300'} text-xs mt-0.5`} />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.question}</h4>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.answer ? item.answer.replace(/[*#>`]/g, '') : 'Chưa có lời giải'}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Notes */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Ghi chú gần đây</h3>
                    <button
                      onClick={() => setMode(AppMode.NOTE)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Tất cả ({dashboardStats.notes})
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentNotes.length === 0 ? (
                      <p className="py-4 text-xs text-slate-400 text-center">Chưa có ghi chú nào.</p>
                    ) : (
                      recentNotes.map(note => (
                        <div
                          key={note.id}
                          onClick={() => setMode(AppMode.NOTE)}
                          className="cursor-pointer rounded-lg border border-slate-100 p-3 hover:border-blue-300 hover:bg-blue-50/30 transition"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{note.title || 'Untitled'}</h4>
                            <span className="text-[9px] font-bold uppercase text-slate-400">{note.mode}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{note.content ? note.content.replace(/[*#>`]/g, '') : 'Trống'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPLICATION MODES */}
          {mode === AppMode.INTERVIEW && <InterviewDashboard />}
          {mode === AppMode.NOTE && <NoteDashboard />}
          {mode === AppMode.VOCA && <VocaDashboard />}
          {mode === AppMode.STREAK && (
            <StreakDashboard
              activeTaskId={activeStreakTask?.id || null}
              pomodoroRunning={pomodoroRunning}
              refreshKey={streakRefreshKey}
              onStartTask={startStreakTaskPomodoro}
              onCompleteActiveTask={() => completeStreakTask()}
            />
          )}
          {mode === AppMode.POMODORO && (
            <PomodoroDashboard
              secondsLeft={pomodoroSecondsLeft}
              running={pomodoroRunning}
              studyMinutes={studyMinutes}
              breakMinutes={breakMinutes}
              savingSession={savingPomodoro}
              onToggle={togglePomodoro}
              onReset={resetPomodoro}
              onUpdateSettings={updatePomodoroSettings}
            />
          )}

          {mode === AppMode.QUIZ && (
            <QuizContainer list={activeList} onExit={() => setMode(AppMode.HOME)} onComplete={handleExerciseComplete} />
          )}

          {mode === AppMode.PRONUNCIATION && (
            <PronunciationMode list={activeList} onNext={() => setMode(AppMode.QUIZ)} />
          )}

          {mode === AppMode.HISTORY && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Kho lưu trữ bài tập &amp; từ vựng</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Dữ liệu đồng bộ Supabase để ôn tập trên mọi thiết bị.</p>
                </div>
                <button
                  onClick={() => setMode(AppMode.HOME)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Về Dashboard
                </button>
              </div>

              {/* Folder Management Bar */}
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Thư mục bài tập</p>
                    <p className="mt-0.5 text-xs text-slate-500">Tạo thư mục theo chủ đề hoặc buổi học, kéo thả bài tập vào thư mục.</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={folderName}
                      onChange={event => setFolderName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') handleCreateFolder();
                      }}
                      placeholder="Ví dụ: Buổi 1, Reading Unit 2..."
                      className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium outline-none focus:border-slate-900 focus:bg-white"
                    />
                    <button
                      onClick={handleCreateFolder}
                      disabled={!folderName.trim()}
                      className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      <i className="fa-solid fa-folder-plus mr-1.5" />
                      Tạo thư mục
                    </button>
                  </div>
                </div>
              </section>

              {groupedLists.length === 0 && exerciseFolders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                  Chưa có bộ bài tập hoặc thư mục nào.
                </div>
              ) : (
                <div className="space-y-4">
                  {exerciseFolders.map(folder =>
                    renderFolderSection(
                      folder.name,
                      folder.id,
                      groupedLists.filter(list => list.folderId === folder.id),
                      folder
                    )
                  )}
                  {renderFolderSection('Chưa phân thư mục', null, groupedLists.filter(list => !list.folderId))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <FloatingPomodoro
        secondsLeft={pomodoroSecondsLeft}
        running={pomodoroRunning}
        initialSeconds={pomodoroInitialSeconds}
        onToggle={togglePomodoro}
        onReset={resetPomodoro}
      />
      <CelebrationOverlay show={showCelebration} onDone={() => setShowCelebration(false)} />
    </div>
  );
};

export default App;
