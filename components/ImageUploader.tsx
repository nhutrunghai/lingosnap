import React, { useCallback, useEffect } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      if (event.target?.result) onImageSelect(event.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let index = 0; index < items.length; index += 1) {
      if (!items[index].type.includes('image')) continue;
      const blob = items[index].getAsFile();
      if (!blob) continue;

      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) onImageSelect(event.target.result as string);
      };
      reader.readAsDataURL(blob);
    }
  }, [onImageSelect]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return (
    <button
      type="button"
      className="group relative w-full overflow-hidden rounded-3xl border border-white/70 bg-white p-5 text-left shadow-xl shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-2xl sm:p-5 lg:p-5"
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-100 blur-2xl transition group-hover:bg-cyan-100" />
      <div className="relative grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-950 text-white shadow-lg shadow-slate-200">
          <i className="fa-solid fa-camera-retro text-lg" />
        </div>
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-blue-500">AI scan</div>
          <h3 className="text-xl font-black tracking-tight text-slate-950">Tải ảnh hoặc dán bài tập</h3>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">Chọn ảnh, kéo thả hoặc nhấn Ctrl + V. AI sẽ tách từ vựng, câu hỏi và đáp án để bạn chỉnh sửa trước khi lưu.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-200">
          <i className="fa-solid fa-plus" />
          Thêm ảnh
        </div>
      </div>
    </button>
  );
};

export default ImageUploader;

