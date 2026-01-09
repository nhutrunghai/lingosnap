
import React, { useState } from 'react';
import { VocabItem } from '../types';

interface VocabEditorProps {
  initialList: VocabItem[];
  onSave: (list: VocabItem[]) => void;
  onCancel: () => void;
}

const VocabEditor: React.FC<VocabEditorProps> = ({ initialList, onSave, onCancel }) => {
  const [list, setList] = useState<VocabItem[]>(initialList);
  const currentListId = initialList.length > 0 ? initialList[0].listId : `list_${Date.now()}`;

  const updateItem = (id: string, field: 'english' | 'vietnamese', value: string) => {
    setList(list.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteItem = (id: string) => {
    setList(list.filter(item => item.id !== id));
  };

  const addNew = () => {
    setList([...list, {
      id: Math.random().toString(36).substr(2, 9),
      listId: currentListId,
      english: '',
      vietnamese: '',
      dateLearned: new Date().toLocaleDateString('vi-VN')
    }]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Kiểm tra từ vựng</h2>
        <button 
          onClick={addNew}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
        >
          <i className="fa-solid fa-plus"></i>
          <span>Thêm từ mới</span>
        </button>
      </div>

      <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto px-2">
        {list.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 bg-gray-50 rounded-xl group relative">
            <div className="w-full">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Tiếng Anh</label>
              <input 
                value={item.english}
                onChange={(e) => updateItem(item.id, 'english', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="English word..."
              />
            </div>
            <div className="w-full">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Tiếng Việt</label>
              <input 
                value={item.vietnamese}
                onChange={(e) => updateItem(item.id, 'vietnamese', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="Nghĩa tiếng Việt..."
              />
            </div>
            <button 
              onClick={() => deleteItem(item.id)}
              className="text-gray-400 hover:text-red-500 p-2 sm:mt-5"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
        <button 
          onClick={onCancel}
          className="px-6 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition"
        >
          Hủy bỏ
        </button>
        <button 
          onClick={() => onSave(list)}
          className="px-8 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
        >
          Lưu & Luyện tập
        </button>
      </div>
    </div>
  );
};

export default VocabEditor;
