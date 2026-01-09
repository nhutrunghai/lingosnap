
import React from 'react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  onNavigate: (mode: AppMode) => void;
  onSync: () => void;
  syncing: boolean;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ mode, onNavigate, onSync, syncing, onOpenSettings }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => onNavigate(AppMode.HOME)}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-bolt text-white text-xl"></i>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">LingoSnap</span>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <button 
            onClick={() => onNavigate(AppMode.HOME)}
            className={`text-sm font-medium ${mode === AppMode.HOME ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Trang chủ
          </button>
          <button 
            onClick={() => onNavigate(AppMode.HISTORY)}
            className={`text-sm font-medium ${mode === AppMode.HISTORY ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Bộ từ đã lưu
          </button>
        </nav>

        <div className="flex items-center space-x-2">
          <button 
            onClick={onSync}
            disabled={syncing}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Làm mới từ Sheet"
          >
            <i className={`fa-solid fa-arrows-rotate ${syncing ? 'animate-spin' : ''}`}></i>
          </button>
          <button 
            onClick={onOpenSettings}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition"
          >
            <i className="fa-solid fa-gear"></i>
            <span className="hidden sm:inline">Cấu hình</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
