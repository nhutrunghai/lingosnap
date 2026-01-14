
import React, { useState, useEffect, useMemo } from 'react';
import { AppMode, ExerciseItem, VocabList } from './types';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import VocabEditor from './components/VocabEditor';
import QuizContainer from './components/QuizContainer';
import PronunciationMode from './components/PronunciationMode';
import SettingsModal from './components/SettingsModal';
import { extractExercisesFromImage } from './services/geminiService';
import { fetchSheetData, saveToSheet, deleteListFromSheet } from './services/googleSheetsService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [activeList, setActiveList] = useState<ExerciseItem[]>([]);
  const [tempList, setTempList] = useState<ExerciseItem[]>([]);
  const [rawHistory, setRawHistory] = useState<ExerciseItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const groupedLists = useMemo(() => {
    const groups: { [key: string]: VocabList } = {};
    rawHistory.forEach(item => {
      const lid = String(item.listId || 'default');
      if (!groups[lid]) {
        const timestamp = lid.startsWith('list_') ? parseInt(lid.split('_')[1]) : null;
        const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : 'Lưu trữ';
        
        groups[lid] = {
          id: lid,
          name: lid === 'default' ? 'Bộ bài tập mặc định' : `Bài tập lúc ${timeStr}`,
          date: item.dateLearned,
          items: []
        };
      }
      groups[lid].items.push(item);
    });
    return Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
  }, [rawHistory]);

  const initData = async () => {
    setSyncing(true);
    try {
      const sheetData = await fetchSheetData();
      setRawHistory(sheetData as any || []);
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handleImageSelect = async (base64: string) => {
    setMode(AppMode.PROCESSING);
    try {
      const extracted = await extractExercisesFromImage(base64);
      const listId = `list_${Date.now()}`;
      const itemsWithListId = extracted.map(item => ({ 
        ...item, 
        listId
      }));
      setTempList(itemsWithListId);
      setMode(AppMode.EDITOR);
    } catch (error) {
      alert("Không thể quét ảnh. Vui lòng thử lại!");
      setMode(AppMode.HOME);
    }
  };

  const handleEditorComplete = async (finalList: ExerciseItem[]) => {
    setActiveList(finalList);
    setSaveStatus('saving');
    const success = await saveToSheet(finalList as any);
    if (success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      initData();
    } else {
      setSaveStatus('error');
    }
    setMode(AppMode.PRONUNCIATION);
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Xóa bài tập này vĩnh viễn?")) return;
    setRawHistory(prev => prev.filter(i => i.listId !== listId));
    await deleteListFromSheet(listId);
    initData();
  };

  return (
    <div className="min-h-screen pb-12 bg-[#f8fafc]">
      <Header 
        mode={mode} 
        onNavigate={setMode} 
        onSync={initData} 
        syncing={syncing} 
        onOpenSettings={() => setShowSettings(true)}
      />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {saveStatus !== 'idle' && (
        <div className={`fixed top-20 right-4 z-[60] px-5 py-3 rounded-2xl shadow-2xl text-white font-bold flex items-center space-x-3 animate-slideInRight
          ${saveStatus === 'saving' ? 'bg-orange-500' : saveStatus === 'success' ? 'bg-green-600' : 'bg-red-600'}
        `}>
          {saveStatus === 'saving' && <i className="fa-solid fa-spinner animate-spin"></i>}
          <span>{saveStatus === 'saving' ? 'Đang lưu vào Google Sheets...' : saveStatus === 'success' ? 'Đã lưu thành công!' : 'Lỗi lưu dữ liệu'}</span>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {mode === AppMode.HOME && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-3">
              <h1 className="text-5xl font-black text-gray-900 tracking-tighter">LingoSnap AI</h1>
              <p className="text-gray-500 text-lg font-medium">Chụp ảnh bài tập - AI giải quyết trong tích tắc</p>
            </div>
            
            <ImageUploader onImageSelect={handleImageSelect} />
            
            {groupedLists.length > 0 && (
              <div className="mt-12 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-gray-800">Bộ bài tập gần đây</h2>
                  <button onClick={() => setMode(AppMode.HISTORY)} className="text-blue-600 font-bold hover:underline">Tất cả ({groupedLists.length})</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedLists.slice(0, 4).map(list => (
                    <div key={list.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <h3 className="font-black text-xl text-gray-900">{list.name}</h3>
                          <p className="text-sm text-gray-400 font-bold">{list.date} • {list.items.length} câu hỏi</p>
                        </div>
                        <button onClick={() => handleDeleteList(list.id)} className="text-gray-200 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                      <button 
                        onClick={() => { setActiveList(list.items); setMode(AppMode.QUIZ); }}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-blue-600 transition-all shadow-lg"
                      >
                        Bắt đầu làm bài
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === AppMode.PROCESSING && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
            <div className="relative">
                <div className="w-20 h-20 border-8 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <i className="fa-solid fa-brain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 text-xl"></i>
            </div>
            <div className="space-y-2">
                <p className="text-2xl font-black text-gray-900 animate-pulse">AI ĐANG PHÂN TÍCH BÀI TẬP...</p>
                <p className="text-gray-500 font-medium">Nhận diện cấu hình: Nối từ, Điền từ, Trắc nghiệm</p>
            </div>
          </div>
        )}

        {mode === AppMode.EDITOR && (
          <VocabEditor initialList={tempList as any} onSave={handleEditorComplete as any} onCancel={() => setMode(AppMode.HOME)} />
        )}

        {mode === AppMode.QUIZ && (
          <QuizContainer list={activeList} onExit={() => setMode(AppMode.HOME)} />
        )}

        {mode === AppMode.PRONUNCIATION && (
          <PronunciationMode list={activeList as any} onNext={() => setMode(AppMode.QUIZ)} />
        )}

        {mode === AppMode.HISTORY && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-gray-900">Thư viện bài tập</h2>
              <button onClick={() => setMode(AppMode.HOME)} className="text-gray-500 font-bold hover:text-black transition">Quay lại</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {groupedLists.map((list) => (
                <div key={list.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex items-center justify-between group hover:shadow-md transition">
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-gray-900">{list.name}</h3>
                    <p className="text-sm text-gray-500 font-medium italic">
                      Dạng: {Array.from(new Set(list.items.map(i => i.type))).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => { setActiveList(list.items); setMode(AppMode.QUIZ); }}
                      className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition"
                    >
                      Làm bài
                    </button>
                    <button 
                      onClick={() => handleDeleteList(list.id)}
                      className="w-12 h-12 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
