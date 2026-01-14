
import React, { useState, useEffect, useRef } from 'react';
import { ExerciseItem, QuizState } from '../types';

interface QuizContainerProps {
  list: ExerciseItem[];
  onExit: () => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({ list, onExit }) => {
  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    score: 0,
    isFinished: false,
    userInput: '',
    selectedOption: null,
    feedback: null
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const currentItem = list[state.currentIndex];

  // Tự động focus vào ô input mỗi khi chuyển câu hỏi
  useEffect(() => {
    if (!state.isFinished && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.currentIndex, state.isFinished]);

  const checkAnswer = (input: string) => {
    if (state.feedback) return;

    const isCorrect = input.trim().toLowerCase() === currentItem.answer.trim().toLowerCase();
    setState(prev => ({
      ...prev,
      userInput: input,
      feedback: isCorrect ? 'correct' : 'incorrect',
      score: isCorrect ? prev.score + 1 : prev.score
    }));

    setTimeout(() => {
      if (state.currentIndex + 1 < list.length) {
        setState(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1,
          userInput: '',
          selectedOption: null,
          feedback: null
        }));
      } else {
        setState(prev => ({ ...prev, isFinished: true }));
      }
    }, 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkAnswer(state.userInput);
  };

  if (state.isFinished) {
    const percentage = Math.round((state.score / list.length) * 100);
    return (
      <div className="bg-white p-10 rounded-3xl shadow-2xl text-center space-y-6 animate-bounceIn max-w-lg mx-auto border border-gray-100">
        <div className="text-7xl mb-4">{percentage > 80 ? '🏆' : percentage > 50 ? '🥈' : '📚'}</div>
        <h2 className="text-3xl font-black text-gray-900">Kết quả bài tập</h2>
        <div className="text-xl font-medium text-gray-600">
          Bạn hoàn thành <span className="text-blue-600 font-bold">{state.score}/{list.length}</span> câu hỏi
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
        </div>
        <button 
          onClick={onExit}
          className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-xl"
        >
          Quay lại Trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center text-sm font-bold text-gray-400 uppercase tracking-tighter">
        <span>Câu {state.currentIndex + 1} / {list.length}</span>
        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">Điểm: {state.score}</span>
      </div>

      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden shadow-inner">
        <div 
          className="bg-gradient-to-r from-blue-400 to-blue-600 h-full transition-all duration-500" 
          style={{ width: `${((state.currentIndex + 1) / list.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-2xl border border-gray-100 space-y-8 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <i className="fa-solid fa-graduation-cap text-8xl"></i>
        </div>

        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest">
            {currentItem.type.replace('_', ' ')}
          </div>
          <p className="text-gray-500 font-medium italic">{currentItem.instruction}</p>
          <h3 className="text-3xl font-black text-gray-900 leading-tight">
            {currentItem.question.includes('____') ? (
               currentItem.question.split('____').map((part, i) => (
                 <React.Fragment key={i}>
                   {part}
                   {i === 0 && <span className="text-blue-600 border-b-4 border-blue-200 px-2 min-w-[60px] inline-block">{state.userInput || '...'}</span>}
                 </React.Fragment>
               ))
            ) : currentItem.question}
          </h3>
        </div>

        {/* UI for Multiple Choice or Matching */}
        {(currentItem.type === 'MULTIPLE_CHOICE' || currentItem.type === 'MATCHING') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentItem.options?.map((opt, idx) => (
              <button
                key={idx}
                disabled={!!state.feedback}
                onClick={() => checkAnswer(opt)}
                className={`p-5 rounded-2xl border-2 font-bold text-lg transition-all text-left flex items-center space-x-4
                  ${state.userInput === opt ? (state.feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') : 
                    'border-gray-100 hover:border-blue-400 hover:bg-blue-50 text-gray-700'}
                `}
              >
                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">{String.fromCharCode(65 + idx)}</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        )}

        {/* UI for Fill Blank or Rewrite */}
        {(currentItem.type === 'FILL_BLANK' || currentItem.type === 'REWRITE' || currentItem.type === 'VOCAB') && (
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <input 
              ref={inputRef}
              autoFocus
              value={state.userInput}
              onChange={(e) => setState(prev => ({ ...prev, userInput: e.target.value }))}
              disabled={!!state.feedback}
              className={`w-full p-5 text-2xl text-center rounded-2xl border-2 outline-none transition-all font-bold
                ${state.feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-700' : 
                  state.feedback === 'incorrect' ? 'border-red-500 bg-red-50 text-red-700' : 
                  'border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 shadow-sm'}
              `}
              placeholder="Nhập câu trả lời..."
            />
            
            {!state.feedback && (
              <button 
                type="submit"
                className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
              >
                Kiểm tra kết quả
              </button>
            )}
          </form>
        )}

        {state.feedback && (
          <div className={`text-center py-4 rounded-2xl animate-fadeIn ${state.feedback === 'correct' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {state.feedback === 'correct' ? (
              <div className="flex items-center justify-center space-x-2 font-black">
                <i className="fa-solid fa-circle-check text-2xl"></i>
                <span>TUYỆT VỜI! CHÍNH XÁC</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-2 font-black">
                  <i className="fa-solid fa-circle-xmark text-2xl"></i>
                  <span>CHƯA ĐÚNG RỒI</span>
                </div>
                <div className="font-bold">Đáp án đúng là: <span className="underline decoration-2">{currentItem.answer}</span></div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <button 
        onClick={onExit}
        className="text-gray-400 hover:text-red-500 w-full text-center text-sm font-bold transition-colors"
      >
        <i className="fa-solid fa-xmark mr-2"></i>Dừng luyện tập
      </button>
    </div>
  );
};

export default QuizContainer;
