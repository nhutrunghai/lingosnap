
import React from 'react';
// Changed VocabItem to ExerciseItem to fix the missing export error
import { ExerciseItem } from '../types';

interface PronunciationModeProps {
  // Changed VocabItem to ExerciseItem to match the active list type from App.tsx
  list: ExerciseItem[];
  onNext: () => void;
}

const PronunciationMode: React.FC<PronunciationModeProps> = ({ list, onNext }) => {
  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800">Luyện phát âm</h2>
        <p className="text-gray-500 mt-2">Nghe cách phát âm chuẩn của các từ bạn vừa quét</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-200 transition group">
            <div className="space-y-1">
              {/* Updated to use question and answer instead of the deprecated english and vietnamese properties */}
              <h4 className="text-xl font-bold text-blue-600">{item.question}</h4>
              <p className="text-sm text-gray-400 font-medium italic">{item.answer}</p>
            </div>
            {/* Speak the question text when clicked */}
            <button 
              onClick={() => speak(item.question)}
              className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition shadow-sm"
              title="Phát âm"
            >
              <i className="fa-solid fa-volume-high"></i>
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={onNext}
          className="px-12 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 transition group"
        >
          Bắt đầu Kiểm tra <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition"></i>
        </button>
      </div>
    </div>
  );
};

export default PronunciationMode;
