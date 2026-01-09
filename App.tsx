
import React, { useState, useEffect, useMemo } from 'react';
import { AppMode, VocabItem, VocabList } from './types';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import VocabEditor from './components/VocabEditor';
import QuizContainer from './components/QuizContainer';
import PronunciationMode from './components/PronunciationMode';
import SettingsModal from './components/SettingsModal';
import { extractVocabFromImage } from './services/geminiService';
import { fetchSheetData, saveToSheet, deleteListFromSheet } from './services/googleSheetsService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [activeVocabList, setActiveVocabList] = useState<VocabItem[]>([]);
  const [tempList, setTempList] = useState<VocabItem[]>([]);
  const [rawHistory, setRawHistory] = useState<VocabItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
          name: lid === 'default' ? 'Bộ từ mặc định' : `Bộ từ lúc ${timeStr}`,
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
      setRawHistory(sheetData || []);
      if (sheetData && sheetData.length > 0) {
        localStorage.setItem('lingosnap_history_v2', JSON.stringify(sheetData));
      }
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handleSaveData = async (newList: VocabItem[]) => {
    setSaveStatus('saving');
    const success = await saveToSheet(newList);
    if (success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      await initData();
    } else {
      setSaveStatus('error');
    }
  };

  const handleImageSelect = async (base64: string) => {
    setIsLoading(true);
    setMode(AppMode.PROCESSING);
    try {
      const extracted = await extractVocabFromImage(base64);
      const listId = `list_${Date.now()}`;
      const itemsWithListId = extracted.map(item => ({ 
        ...item, 
        listId,
        dateLearned: new Date().toLocaleDateString('vi-VN')
      }));
      setTempList(itemsWithListId);
      setMode(AppMode.EDITOR);
    } catch (error) {
      alert("Không thể quét ảnh. Vui lòng thử lại!");
      setMode(AppMode.HOME);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditorComplete = (finalList: VocabItem[]) => {
    setActiveVocabList(finalList);
    handleSaveData(finalList);
    setMode(AppMode.PRONUNCIATION);
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Xóa bộ từ này vĩnh viễn?")) return;
    
    // Xóa ngay trên giao diện (Optimistic UI)
    const originalHistory = [...rawHistory];
    const filtered = rawHistory.filter(item => String(item.listId) !== String(listId));
    setRawHistory(filtered);

    setSaveStatus('saving');
    const success = await deleteListFromSheet(listId);
    
    if (success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      // Đợi một lát để Google Sheet cập nhật xong rồi mới tải lại
      setTimeout(initData, 1500);
    } else {
      setSaveStatus('error');
      setRawHistory(originalHistory); // Rollback nếu lỗi
      alert("Không thể kết nối để xóa trên Google Sheets.");
    }
  };

  const startQuizForList = (list: VocabItem[]) => {
    setActiveVocabList(list);
    setMode(AppMode.QUIZ_EN);
  };

  return (
    <div className="min-h-screen pb-12">
      <Header 
        mode={mode} 
        onNavigate={setMode} 
        onSync={initData} 
        syncing={syncing} 
        onOpenSettings={() => setShowSettings(true)}
      />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {saveStatus !== 'idle' && (
        <div className={`fixed top-20 right-4 z-[60] px-4 py-2 rounded-lg shadow-lg text-white font-medium flex items-center space-x-2 animate-slideInRight
          ${saveStatus === 'saving' ? 'bg-orange-500' : saveStatus === 'success' ? 'bg-green-600' : 'bg-red-600'}
        `}>
          {saveStatus === 'saving' && <i className="fa-solid fa-spinner animate-spin"></i>}
          <span>
            {saveStatus === 'saving' ? 'Đang cập nhật Google Sheets...' : 
             saveStatus === 'success' ? 'Thành công!' : 'Lỗi kết nối'}
          </span>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {mode === AppMode.HOME && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">LingoSnap</h1>
              <p className="text-gray-500">Quét ảnh, lưu trữ và học từ vựng mỗi ngày</p>
            </div>
            
            <ImageUploader onImageSelect={handleImageSelect} />
            
            {groupedLists.length > 0 ? (
              <div className="mt-12 space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-xl font-bold text-gray-800">Bộ từ vựng của bạn</h2>
                  <button onClick={() => setMode(AppMode.HISTORY)} className="text-blue-600 text-sm font-bold hover:underline">
                    Tất cả ({groupedLists.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedLists.slice(0, 4).map(list => (
                    <div key={list.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-800 truncate">{list.name}</h3>
                          <p className="text-xs text-gray-400 font-medium">{list.date} • {list.items.length} từ</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteList(list.id)}
                          className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                      <button 
                        onClick={() => startQuizForList(list.items)}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
                      >
                        Luyện tập ngay
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : !syncing && (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <i className="fa-solid fa-inbox text-4xl text-gray-200 mb-4 block"></i>
                <p className="text-gray-400 italic">Chưa có dữ liệu. Hãy tải ảnh lên để bắt đầu!</p>
              </div>
            )}
          </div>
        )}

        {mode === AppMode.PROCESSING && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium">AI đang "đọc" ảnh của bạn...</p>
          </div>
        )}

        {mode === AppMode.EDITOR && (
          <VocabEditor initialList={tempList} onSave={handleEditorComplete} onCancel={() => setMode(AppMode.HOME)} />
        )}

        {(mode === AppMode.QUIZ_EN || mode === AppMode.QUIZ_VN) && (
          <QuizContainer list={activeVocabList} type={mode === AppMode.QUIZ_EN ? 'en' : 'vn'} onExit={() => setMode(AppMode.HOME)} />
        )}

        {mode === AppMode.PRONUNCIATION && (
          <PronunciationMode list={activeVocabList} onNext={() => setMode(AppMode.QUIZ_EN)} />
        )}

        {mode === AppMode.HISTORY && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Tất cả bộ từ</h2>
              <button onClick={() => setMode(AppMode.HOME)} className="text-gray-500 hover:text-gray-800 font-bold">Quay lại</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {groupedLists.map((list) => (
                <div key={list.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 truncate">{list.name}</h3>
                    <p className="text-sm text-gray-500 truncate italic">
                      {list.items.map(i => i.english).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => startQuizForList(list.items)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
                    >
                      Học
                    </button>
                    <button 
                      onClick={() => handleDeleteList(list.id)}
                      className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
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
