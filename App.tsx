import React, { useEffect, useMemo, useState } from 'react';
import { AppMode, ExerciseItem, VocabList } from './types';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import VocabEditor from './components/VocabEditor';
import QuizContainer from './components/QuizContainer';
import PronunciationMode from './components/PronunciationMode';
import PomodoroDashboard from './components/PomodoroDashboard';
import AuthGate from './components/AuthGate';
import { extractExercisesFromImage } from './services/geminiService';
import { deleteVocabularyList, fetchVocabulary, isSupabaseConfigured, saveVocabularyList, supabase } from './services/supabaseService';

const getModeTitle = (mode: AppMode) => {
  if (mode === AppMode.HISTORY) return 'Thư viện học tập';
  if (mode === AppMode.POMODORO) return 'Pomodoro streak';
  if (mode === AppMode.EDITOR) return 'Chỉnh sửa dữ liệu';
  if (mode === AppMode.QUIZ) return 'Luyện tập';
  if (mode === AppMode.PRONUNCIATION) return 'Phát âm';
  return 'Dashboard cá nhân';
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [activeList, setActiveList] = useState<ExerciseItem[]>([]);
  const [tempList, setTempList] = useState<ExerciseItem[]>([]);
  const [rawHistory, setRawHistory] = useState<ExerciseItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [signedIn, setSignedIn] = useState(!isSupabaseConfigured);

  const groupedLists = useMemo(() => {
    const groups: { [key: string]: VocabList } = {};
    rawHistory.forEach(item => {
      const listId = String(item.listId || 'default');
      if (!groups[listId]) {
        const timestamp = listId.startsWith('list_') ? parseInt(listId.split('_')[1]) : null;
        const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Lưu trữ';

        groups[listId] = {
          id: listId,
          name: listId === 'default' ? 'Bộ bài tập mặc định' : `Bài tập lúc ${timeStr}`,
          date: item.dateLearned,
          items: []
        };
      }
      groups[listId].items.push(item);
    });
    return Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
  }, [rawHistory]);

  const totalQuestions = rawHistory.length;
  const totalTypes = new Set(rawHistory.map(item => item.type)).size;

  const initData = async () => {
    setSyncing(true);
    try {
      const data = await fetchVocabulary();
      setRawHistory(data || []);
    } catch (e) {
      console.error('Sync Error:', e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      if (data.session) initData();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      if (session) initData();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleImageSelect = async (base64: string) => {
    setMode(AppMode.PROCESSING);
    try {
      const extracted = await extractExercisesFromImage(base64);
      const listId = `list_${Date.now()}`;
      setTempList(extracted.map(item => ({ ...item, listId })));
      setMode(AppMode.EDITOR);
    } catch (error) {
      alert('Không thể quét ảnh. Vui lòng thử lại!');
      setMode(AppMode.HOME);
    }
  };

  const handleEditorComplete = async (finalList: ExerciseItem[]) => {
    setActiveList(finalList);
    setSaveStatus('saving');
    try {
      const success = await saveVocabularyList(finalList);
      setSaveStatus(success ? 'success' : 'error');
      if (success) {
        setTimeout(() => setSaveStatus('idle'), 2000);
        initData();
      }
    } catch {
      setSaveStatus('error');
    }
    setMode(AppMode.PRONUNCIATION);
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Xóa bài tập này vĩnh viễn?')) return;
    setRawHistory(prev => prev.filter(item => item.listId !== listId));
    await deleteVocabularyList(listId);
    initData();
  };

  if (!signedIn) {
    return <AuthGate onSignedIn={() => setSignedIn(true)} />;
  }

  const renderListCard = (list: VocabList, compact = false) => (
    <article key={list.id} className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-xl shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl sm:p-5">
      <div className="absolute -right-10 -top-7 h-28 w-28 rounded-full bg-indigo-100 blur-2xl transition group-hover:bg-cyan-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
            <i className="fa-solid fa-book-open" />
          </div>
          <h3 className="truncate text-lg font-black tracking-tight text-slate-950">{list.name}</h3>
          <p className="mt-2 text-sm font-bold text-slate-400">{list.date} • {list.items.length} câu hỏi</p>
          {!compact && <p className="mt-3 text-sm font-semibold text-slate-500">Dạng: {Array.from(new Set(list.items.map(item => item.type))).join(', ')}</p>}
        </div>
        <button onClick={() => handleDeleteList(list.id)} className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-slate-300 transition hover:bg-red-50 hover:text-red-500">
          <i className="fa-solid fa-trash-can" />
        </button>
      </div>
      <button onClick={() => { setActiveList(list.items); setMode(AppMode.QUIZ); }} className="relative z-10 mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-2.5 text-sm font-black text-white transition hover:bg-blue-600">
        <i className="fa-solid fa-play" />
        Bắt đầu ôn tập
      </button>
    </article>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32rem),linear-gradient(135deg,#f8fafc,#eef2ff)] text-slate-950">
      <Header mode={mode} onNavigate={setMode} onSync={initData} syncing={syncing} />

      {saveStatus !== 'idle' && (
        <div className={`fixed right-4 top-5 z-[80] rounded-2xl px-4 py-2.5 font-black text-white shadow-2xl ${saveStatus === 'saving' ? 'bg-orange-500' : saveStatus === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {saveStatus === 'saving' ? 'Đang lưu vào Supabase...' : saveStatus === 'success' ? 'Đã lưu thành công!' : 'Lỗi lưu dữ liệu'}
        </div>
      )}

      <main className="ml-[68px] min-h-screen px-4 py-5 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-500">LingoSnap workspace</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{getModeTitle(mode)}</h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-2.5 text-white">
              <i className="fa-solid fa-database text-cyan-300" />
              <span className="text-sm font-black">Supabase sync</span>
            </div>
          </div>

          {mode === AppMode.HOME && (
            <div className="space-y-6">
              <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-2xl shadow-slate-300 sm:p-5 lg:p-7">
                  <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
                  <div className="absolute bottom-0 right-8 hidden text-[8rem] text-white/5 lg:block"><i className="fa-solid fa-brain" /></div>
                  <div className="relative max-w-2xl">
                    <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-200">Học từ vựng bằng ảnh</p>
                    <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">Quét bài tập, lưu từ vựng, ôn lại mọi lúc.</h2>
                    <p className="mt-5 text-base font-semibold leading-7 text-slate-300">Giao diện mới dạng dashboard, dữ liệu đồng bộ trên laptop và điện thoại qua Supabase.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-200/60"><div className="text-2xl font-black">{groupedLists.length}</div><div className="mt-1 text-sm font-bold text-slate-400">Bộ đã lưu</div></div>
                  <div className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-200/60"><div className="text-2xl font-black">{totalQuestions}</div><div className="mt-1 text-sm font-bold text-slate-400">Câu hỏi</div></div>
                  <div className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-200/60"><div className="text-2xl font-black">{totalTypes}</div><div className="mt-1 text-sm font-bold text-slate-400">Dạng bài</div></div>
                  <button onClick={() => setMode(AppMode.POMODORO)} className="rounded-3xl bg-gradient-to-br from-orange-500 to-rose-500 p-5 text-left text-white shadow-xl shadow-orange-200 transition hover:-translate-y-1"><div className="text-2xl font-black"><i className="fa-solid fa-fire" /></div><div className="mt-1 text-sm font-black">Giữ streak</div></button>
                </div>
              </section>

              <ImageUploader onImageSelect={handleImageSelect} />

              <section className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight">Bộ bài tập gần đây</h2>
                    <p className="text-sm font-semibold text-slate-500">Chọn một bộ để bắt đầu ôn tập ngay.</p>
                  </div>
                  <button onClick={() => setMode(AppMode.HISTORY)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-blue-600 shadow-lg shadow-slate-200/60">Tất cả</button>
                </div>
                {groupedLists.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-7 text-center font-bold text-slate-400">Chưa có dữ liệu. Hãy tải ảnh bài tập đầu tiên.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{groupedLists.slice(0, 6).map(list => renderListCard(list, true))}</div>
                )}
              </section>
            </div>
          )}

          {mode === AppMode.PROCESSING && (
            <div className="grid min-h-[55vh] place-items-center rounded-3xl bg-white shadow-xl shadow-slate-200/60">
              <div className="text-center">
                <div className="relative mx-auto mb-6 h-24 w-24"><div className="absolute inset-0 rounded-full border-8 border-blue-100 border-t-blue-600 animate-spin" /><i className="fa-solid fa-brain absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg text-blue-600" /></div>
                <p className="text-xl font-black">AI đang phân tích bài tập...</p>
                <p className="mt-2 font-semibold text-slate-500">Nhận diện dạng bài và tạo danh sách chỉnh sửa.</p>
              </div>
            </div>
          )}

          {mode === AppMode.EDITOR && <VocabEditor initialList={tempList} onSave={handleEditorComplete} onCancel={() => setMode(AppMode.HOME)} />}
          {mode === AppMode.QUIZ && <QuizContainer list={activeList} onExit={() => setMode(AppMode.HOME)} />}
          {mode === AppMode.PRONUNCIATION && <PronunciationMode list={activeList} onNext={() => setMode(AppMode.QUIZ)} />}
          {mode === AppMode.POMODORO && <PomodoroDashboard />}

          {mode === AppMode.HISTORY && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight">Tất cả bộ từ đã lưu</h2>
                  <p className="mt-2 font-semibold text-slate-500">Dữ liệu được đồng bộ để bạn ôn trên mọi thiết bị.</p>
                </div>
                <button onClick={() => setMode(AppMode.HOME)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-lg shadow-slate-200/60">Về dashboard</button>
              </div>
              {groupedLists.length === 0 ? (
                <div className="rounded-3xl bg-white p-7 text-center font-bold text-slate-400 shadow-xl shadow-slate-200/60">Chưa có bộ từ nào.</div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{groupedLists.map(list => renderListCard(list))}</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

