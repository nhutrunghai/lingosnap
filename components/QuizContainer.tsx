
import React, { useState } from 'react';
import { VocabItem, QuizState } from '../types';

interface QuizContainerProps {
  list: VocabItem[];
  type: 'en' | 'vn';
  onExit: () => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({ list, type, onExit }) => {
  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    score: 0,
    isFinished: false,
    userInput: '',
    feedback: null
  });

  const currentItem = list[state.currentIndex];
  const question = type === 'en' ? currentItem.vietnamese : currentItem.english;
  const answer = type === 'en' ? currentItem.english : currentItem.vietnamese;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.feedback) return;

    const isCorrect = state.userInput.trim().toLowerCase() === answer.toLowerCase();
    setState(prev => ({
      ...prev,
      feedback: isCorrect ? 'correct' : 'incorrect',
      score: isCorrect ? prev.score + 1 : prev.score
    }));

    setTimeout(() => {
      if (state.currentIndex + 1 < list.length) {
        setState(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1,
          userInput: '',
          feedback: null
        }));
      } else {
        setState(prev => ({ ...prev, isFinished: true }));
      }
    }, 1500);
  };

  if (state.isFinished) {
    const percentage = Math.round((state.score / list.length) * 100);
    return (
      <div className="bg-white p-12 rounded-2xl shadow-xl text-center space-y-6 animate-bounceIn">
        <div className="text-6xl mb-4">
          {percentage > 70 ? '🎉' : '💪'}
        </div>
        <h2 className="text-3xl font-bold">Hoàn thành bài tập!</h2>
        <div className="text-gray-600">
          Bạn đạt được <span className="text-blue-600 font-bold">{state.score}/{list.length}</span> câu đúng ({percentage}%)
        </div>
        <button 
          onClick={onExit}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center text-sm font-medium text-gray-500">
        <span>Câu hỏi {state.currentIndex + 1} / {list.length}</span>
        <span>Điểm: {state.score}</span>
      </div>

      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-blue-600 h-full transition-all duration-500" 
          style={{ width: `${((state.currentIndex + 1) / list.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 space-y-8">
        <div className="text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            {type === 'en' ? 'Dịch sang tiếng Anh' : 'Dịch sang tiếng Việt'}
          </p>
          <h3 className="text-4xl font-bold text-gray-900 leading-tight">{question}</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            autoFocus
            value={state.userInput}
            onChange={(e) => setState(prev => ({ ...prev, userInput: e.target.value }))}
            disabled={!!state.feedback}
            className={`w-full p-4 text-xl text-center rounded-xl border-2 outline-none transition-all
              ${state.feedback === 'correct' ? 'border-green-500 bg-green-50' : 
                state.feedback === 'incorrect' ? 'border-red-500 bg-red-50' : 
                'border-gray-200 focus:border-blue-500 shadow-inner'}
            `}
            placeholder="Nhập câu trả lời của bạn..."
          />
          
          {state.feedback && (
            <div className={`text-center font-bold animate-fadeIn ${state.feedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
              {state.feedback === 'correct' ? (
                <div className="flex items-center justify-center space-x-2">
                  <i className="fa-solid fa-check-circle"></i>
                  <span>Chính xác!</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-center space-x-2">
                    <i className="fa-solid fa-circle-xmark"></i>
                    <span>Sai rồi. Đáp án là:</span>
                  </div>
                  <div className="text-lg underline">{answer}</div>
                </div>
              )}
            </div>
          )}

          {!state.feedback && (
            <button 
              type="submit"
              className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-transform active:scale-95"
            >
              Kiểm tra
            </button>
          )}
        </form>
      </div>
      
      <button 
        onClick={onExit}
        className="text-gray-400 hover:text-gray-600 w-full text-center text-sm font-medium"
      >
        Dừng bài tập
      </button>
    </div>
  );
};

export default QuizContainer;
