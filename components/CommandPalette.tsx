import React, { useEffect, useMemo, useState } from 'react';
import { AppMode, InterviewItem, NoteItem } from '../types';
import { fetchInterviewItems, fetchNotes } from '../services/supabaseService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (mode: AppMode) => void;
  onSelectNote?: (id: string) => void;
  onSelectInterview?: (id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectNote,
  onSelectInterview,
}) => {
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setLoading(true);
      Promise.all([fetchNotes(), fetchInterviewItems()])
        .then(([n, i]) => {
          setNotes(n);
          setInterviews(i);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const quickActions = useMemo(() => [
    { id: 'nav-home', label: 'Về Trang chủ', icon: 'fa-house', mode: AppMode.HOME, category: 'Điều hướng' },
    { id: 'nav-interview', label: 'Mở Ôn phỏng vấn', icon: 'fa-comments', mode: AppMode.INTERVIEW, category: 'Điều hướng' },
    { id: 'nav-note', label: 'Mở Sổ tay Note', icon: 'fa-note-sticky', mode: AppMode.NOTE, category: 'Điều hướng' },
    { id: 'nav-voca', label: 'Mở Từ vựng Voca', icon: 'fa-book-open-reader', mode: AppMode.VOCA, category: 'Điều hướng' },
    { id: 'nav-pomo', label: 'Mở Không gian Pomodoro', icon: 'fa-fire', mode: AppMode.POMODORO, category: 'Điều hướng' },
    { id: 'nav-streak', label: 'Mở Kế hoạch Streak', icon: 'fa-calendar-check', mode: AppMode.STREAK, category: 'Điều hướng' },
  ], []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return quickActions.map(a => ({ type: 'action', ...a }));
    }

    const matchedActions = quickActions
      .filter(a => a.label.toLowerCase().includes(q))
      .map(a => ({ type: 'action', ...a }));

    const matchedNotes = notes
      .filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 5)
      .map(n => ({
        type: 'note',
        id: n.id,
        label: n.title || 'Untitled note',
        sub: n.content ? n.content.replace(/[*#>`]/g, '').slice(0, 80) : '',
        icon: 'fa-file-lines',
        category: 'Ghi chú',
      }));

    const matchedInterviews = interviews
      .filter(i => i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q))
      .slice(0, 5)
      .map(i => ({
        type: 'interview',
        id: i.id,
        label: i.question,
        sub: i.answer ? i.answer.replace(/[*#>`]/g, '').slice(0, 80) : '',
        icon: 'fa-circle-question',
        category: 'Phỏng vấn',
      }));

    return [...matchedActions, ...matchedNotes, ...matchedInterviews];
  }, [query, quickActions, notes, interviews]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected) handleSelect(selected);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  const handleSelect = (item: any) => {
    if (item.type === 'action') {
      onNavigate(item.mode);
    } else if (item.type === 'note') {
      onNavigate(AppMode.NOTE);
      if (onSelectNote) onSelectNote(item.id);
    } else if (item.type === 'interview') {
      onNavigate(AppMode.INTERVIEW);
      if (onSelectInterview) onSelectInterview(item.id);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-xs p-4 sm:pt-20">
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <i className="fa-solid fa-magnifying-glass text-slate-400 text-sm" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm ghi chú, câu hỏi phỏng vấn, lệnh nhanh... (ESC để đóng)"
            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            autoFocus
          />
          <kbd className="hidden sm:inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {loading && (
            <div className="p-6 text-center text-xs text-slate-400">Đang tìm dữ liệu...</div>
          )}

          {!loading && searchResults.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              Không tìm thấy kết quả nào cho "{query}".
            </div>
          )}

          {!loading && searchResults.map((item: any, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id || item.label}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${
                  isSelected ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-xs`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold leading-tight">{item.label}</span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        isSelected ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  {item.sub && (
                    <p
                      className={`truncate text-[11px] mt-0.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {item.sub}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded bg-white px-1.5 py-0.5 border border-slate-200">↑</kbd> <kbd className="rounded bg-white px-1.5 py-0.5 border border-slate-200">↓</kbd> Di chuyển</span>
            <span><kbd className="rounded bg-white px-1.5 py-0.5 border border-slate-200">Enter</kbd> Chọn</span>
          </div>
          <span>LingoSnap Quick Palette</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
