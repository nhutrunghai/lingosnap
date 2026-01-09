
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const savedUrl = localStorage.getItem('lingosnap_script_url') || '';
    setUrl(savedUrl);
  }, []);

  const handleSave = () => {
    localStorage.setItem('lingosnap_script_url', url);
    onClose();
    window.location.reload(); // Refresh để áp dụng config mới
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <i className="fa-solid fa-link mr-2 text-blue-600"></i>
            Cấu hình Google Sheets
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Dán link <strong>Web App URL</strong> từ bước <b>Deploy</b> trong Google Apps Script vào đây để ứng dụng có thể ghi dữ liệu vào Sheet.
          </p>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Google Apps Script URL</label>
            <input 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-800 mb-2">Cách lấy link này:</h4>
            <ol className="text-xs text-blue-700 space-y-2 list-decimal ml-4">
              <li>Mở Sheet, chọn <b>Tiện ích mở rộng</b> &gt; <b>Apps Script</b>.</li>
              <li>Dán đoạn code được cung cấp trước đó vào.</li>
              <li>Nhấn <b>Triển khai (Deploy)</b> &gt; <b>Tạm mới (New Deployment)</b>.</li>
              <li>Chọn loại là <b>Ứng dụng web (Web App)</b>.</li>
              <li>Phần "Người có quyền truy cập" chọn <b>Bất kỳ ai (Anyone)</b>.</li>
              <li>Copy link kết quả vào ô trên.</li>
            </ol>
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition"
          >
            Đóng
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
          >
            Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
