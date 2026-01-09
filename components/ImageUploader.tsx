
import React, { useCallback, useEffect } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelect(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                onImageSelect(event.target.result as string);
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    }
  }, [onImageSelect]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return (
    <div 
      className="relative border-2 border-dashed border-gray-300 rounded-2xl p-12 bg-white hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer group"
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload" 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange} 
      />
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition">
          <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-700">Tải ảnh hoặc dán nội dung</p>
          <p className="text-sm text-gray-500">Kéo thả ảnh vào đây, chọn tệp hoặc nhấn Ctrl + V</p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
