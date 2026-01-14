
import React, { useState } from 'react';
import { ExerciseItem, ExerciseType } from '../types';

interface VocabEditorProps {
  initialList: ExerciseItem[];
  onSave: (list: ExerciseItem[]) => void;
  onCancel: () => void;
}

const VocabEditor: React.FC<VocabEditorProps> = ({ initialList, onSave, onCancel }) => {
  const [list, setList] = useState<ExerciseItem[]>(initialList);
  const currentListId = initialList.length > 0 ? initialList[0].listId : `list_${Date.now()}`;

  const updateItem = (id: string, field: keyof ExerciseItem, value: any) => {
    setList(list.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateOption = (id: string, optIndex: number, newValue: string) => {
    setList(list.map(item => {
      if (item.id === id && item.options) {
        const newOptions = [...item.options];
        newOptions[optIndex] = newValue;
        return { ...item, options: newOptions };
      }
      return item;
    }));
  };

  const addOption = (id: string) => {
    setList(list.map(item => {
      if (item.id === id) {
        return { ...item, options: [...(item.options || []), ""] };
      }
      return item;
    }));
  };

  const removeOption = (id: string, optIndex: number) => {
    setList(list.map(item => {
      if (item.id === id && item.options) {
        return { ...item, options: item.options.filter((_, i) => i !== optIndex) };
      }
      return item;
    }));
  };

  const deleteItem = (id: string) => {
    setList(list.filter(item => item.id !== id));
  };

  const handleAddNew = () => {
    const newItem: ExerciseItem = {
      id: Math.random().toString(36).substr(2, 9),
      listId: currentListId,
      type: 'VOCAB',
      instruction: 'Dịch từ vựng',
      question: '',
      answer: '',
      options: [],
      dateLearned: new Date().toLocaleDateString('vi-VN')
    };
    setList([...list, newItem]);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-6 md:p-10 animate-slideUp max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-black text-gray-900">Kiểm tra nội dung AI</h2>
            <p className="text-gray-500 font-medium italic mt-1">Dữ liệu bài tập đa dạng đang được đồng bộ</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition flex items-center shadow-lg shadow-blue-100"
        >
          <i className="fa-solid fa-plus mr-2"></i> Thêm bài tập
        </button>
      </div>

      <div className="space-y-8 mb-10 max-h-[65vh] overflow-y-auto px-2 scrollbar-hide">
        {list.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
             <i className="fa-solid fa-file-circle-exclamation text-4xl text-gray-300 mb-4 block"></i>
             <p className="text-gray-400">Danh sách trống. Hãy thêm bài tập mới.</p>
          </div>
        ) : list.map((item, idx) => (
          <div key={item.id} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-5 group relative hover:border-blue-200 transition-colors">
            <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 flex items-center justify-center font-black bg-blue-600 text-white rounded-xl text-xs">#{idx + 1}</span>
                  <select 
                      value={item.type}
                      onChange={(e) => updateItem(item.id, 'type', e.target.value as ExerciseType)}
                      className="text-xs font-black bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 text-blue-700 cursor-pointer rounded-xl px-4 py-2"
                  >
                      <option value="FILL_BLANK">ĐIỀN CHỖ TRỐNG</option>
                      <option value="MATCHING">NỐI TỪ / CẶP</option>
                      <option value="MULTIPLE_CHOICE">TRẮC NGHIỆM</option>
                      <option value="REWRITE">VIẾT LẠI CÂU</option>
                      <option value="VOCAB">TỪ VỰNG CƠ BẢN</option>
                  </select>
                </div>
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="w-10 h-10 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl flex items-center justify-center transition-all"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Hướng dẫn thực hiện</label>
                    <input 
                        value={item.instruction}
                        onChange={(e) => updateItem(item.id, 'instruction', e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-bold transition-all"
                        placeholder="Ví dụ: Nối từ với nghĩa đúng"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Đáp án chính xác</label>
                    <input 
                        value={item.answer}
                        onChange={(e) => updateItem(item.id, 'answer', e.target.value)}
                        className="w-full px-5 py-3 rounded-2xl bg-green-50 border-transparent focus:bg-white focus:ring-2 focus:ring-green-500 text-sm font-bold text-green-700 transition-all"
                        placeholder="Đáp án đúng..."
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Nội dung câu hỏi / Câu mẫu</label>
                <textarea 
                    value={item.question}
                    onChange={(e) => updateItem(item.id, 'question', e.target.value)}
                    rows={2}
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                    placeholder="Nhập câu hỏi hoặc từ tiếng Anh (Dùng ____ cho chỗ trống)"
                />
            </div>

            {/* PHẦN CHỈNH SỬA OPTIONS (Dành cho Trắc nghiệm hoặc Nối từ) */}
            {(item.type === 'MULTIPLE_CHOICE' || item.type === 'MATCHING') && (
              <div className="p-5 bg-blue-50/50 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-blue-600 uppercase tracking-wider">Các lựa chọn (Lưu ý: Phải bao gồm cả đáp án đúng)</label>
                  <button 
                    onClick={() => addOption(item.id)}
                    className="text-[10px] font-black text-blue-600 bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-600 hover:text-white transition"
                  >
                    + THÊM LỰA CHỌN
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(item.options || []).map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-blue-100 shadow-sm">
                      <span className="text-[10px] font-bold text-blue-300 w-4">{String.fromCharCode(65 + oIdx)}</span>
                      <input 
                        value={opt}
                        onChange={(e) => updateOption(item.id, oIdx, e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs font-bold outline-none"
                        placeholder={`Lựa chọn ${oIdx + 1}`}
                      />
                      <button onClick={() => removeOption(item.id, oIdx)} className="text-gray-300 hover:text-red-500 p-1">
                        <i className="fa-solid fa-circle-minus"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-gray-100">
        <button 
          onClick={onCancel}
          className="px-8 py-4 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 transition order-2 sm:order-1"
        >
          Hủy bỏ
        </button>
        <button 
          onClick={() => onSave(list)}
          className="px-12 py-4 rounded-2xl bg-gray-900 text-white font-black hover:bg-blue-600 shadow-2xl shadow-gray-200 transition-all active:scale-95 order-1 sm:order-2"
        >
          Lưu dữ liệu & Luyện tập
        </button>
      </div>
    </div>
  );
};

export default VocabEditor;
