import React, { useRef, useState } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedBase64: string) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCrop, onCancel }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setDragStart({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || !cropBox || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
    const currentY = Math.min(Math.max(0, event.clientY - rect.top), rect.height);

    setCropBox({
      x: Math.min(dragStart.x, currentX),
      y: Math.min(dragStart.y, currentY),
      w: Math.abs(dragStart.x - currentX),
      h: Math.abs(dragStart.y - currentY),
    });
  };

  const handlePointerUp = () => {
    setDragStart(null);
  };

  const executeCrop = () => {
    if (!cropBox || !imageRef.current) return;
    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = cropBox.w * scaleX;
    canvas.height = cropBox.h * scaleY;

    ctx.drawImage(
      image,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      cropBox.w * scaleX,
      cropBox.h * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    onCrop(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-xl">
      <div className="text-center">
        <h3 className="text-lg font-black text-slate-950">Cắt vùng chứa câu hỏi</h3>
        <p className="text-xs font-semibold text-slate-500 mt-1">Kéo thả chuột trên ảnh để chọn phần bài tập muốn ôn tập.</p>
      </div>

      <div
        className="relative select-none overflow-hidden rounded-xl border border-slate-200"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="To crop"
          className="max-h-[60vh] max-w-full object-contain pointer-events-none"
        />
        {cropBox && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20"
            style={{ left: cropBox.x, top: cropBox.y, width: cropBox.w, height: cropBox.h }}
          />
        )}
      </div>

      <div className="flex w-full gap-3">
        <button onClick={onCancel} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-black text-slate-600">Hủy</button>
        <button onClick={executeCrop} disabled={!cropBox || cropBox.w < 10} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">Cắt & Xử lý</button>
      </div>
    </div>
  );
};

export default ImageCropper;
