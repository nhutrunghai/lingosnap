import React from 'react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  onNavigate: (mode: AppMode) => void;
  onSync: () => void;
  onSignOut: () => void;
  syncing: boolean;
}

const navSections = [
  {
    title: 'Tổng quan',
    items: [
      { mode: AppMode.HOME, label: 'Trang chủ', icon: 'fa-house' },
    ],
  },
  {
    title: 'Học tập & Ghi chép',
    items: [
      { mode: AppMode.INTERVIEW, label: 'Ôn phỏng vấn', icon: 'fa-comments' },
      { mode: AppMode.NOTE, label: 'Sổ tay Note', icon: 'fa-note-sticky' },
      { mode: AppMode.VOCA, label: 'Từ vựng Voca', icon: 'fa-book-open-reader' },
      { mode: AppMode.HISTORY, label: 'Kho bài tập', icon: 'fa-layer-group' },
    ],
  },
  {
    title: 'Năng suất',
    items: [
      { mode: AppMode.POMODORO, label: 'Pomodoro', icon: 'fa-fire' },
      { mode: AppMode.STREAK, label: 'Kế hoạch & Streak', icon: 'fa-calendar-check' },
    ],
  },
];

const Header: React.FC<HeaderProps> = ({ mode, onNavigate, onSync, onSignOut, syncing }) => {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[64px] border-r border-slate-200 bg-white text-slate-800 lg:w-60">
      <div className="flex h-full flex-col px-2.5 py-4 lg:px-3 lg:py-5">
        {/* Brand Header */}
        <button
          onClick={() => onNavigate(AppMode.HOME)}
          className="mb-6 flex items-center justify-center gap-3 rounded-lg p-1.5 transition hover:bg-slate-50 lg:justify-start"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
            <i className="fa-solid fa-terminal text-sm" />
          </div>
          <div className="hidden text-left lg:block">
            <div className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
              LingoSnap
            </div>
            <div className="text-[10px] font-semibold text-slate-400">Personal Workspace</div>
          </div>
        </button>

        {/* Navigation Groups */}
        <div className="flex-1 space-y-5 overflow-y-auto">
          {navSections.map(section => (
            <div key={section.title} className="space-y-1">
              <div className="hidden px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:block">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = mode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => onNavigate(item.mode)}
                      title={item.label}
                      className={`group flex w-full items-center justify-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold transition lg:justify-start ${
                        active
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <i
                        className={`fa-solid ${item.icon} text-sm lg:w-4 ${
                          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      />
                      <span className="hidden lg:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto space-y-1 border-t border-slate-100 pt-3">
          <button
            onClick={onSync}
            disabled={syncing}
            title="Đồng bộ dữ liệu Supabase"
            className="flex w-full items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 lg:justify-start"
          >
            <i
              className={`fa-solid fa-arrows-rotate text-sm lg:w-4 text-slate-400 ${
                syncing ? 'animate-spin text-blue-600' : ''
              }`}
            />
            <span className="hidden lg:inline">
              {syncing ? 'Đang đồng bộ...' : 'Đồng bộ Supabase'}
            </span>
          </button>

          <button
            onClick={onSignOut}
            title="Đăng xuất"
            className="flex w-full items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 lg:justify-start"
          >
            <i className="fa-solid fa-right-from-bracket text-sm lg:w-4" />
            <span className="hidden lg:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Header;
