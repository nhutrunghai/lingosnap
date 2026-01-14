
export type ExerciseType = 'VOCAB' | 'MATCHING' | 'FILL_BLANK' | 'REWRITE' | 'MULTIPLE_CHOICE';

export interface ExerciseItem {
  id: string;
  listId: string;
  type: ExerciseType;
  instruction: string; // Hướng dẫn bài tập (ví dụ: "Điền am/is/are")
  question: string;    // Nội dung câu hỏi
  answer: string;      // Đáp án đúng
  options?: string[];  // Các lựa chọn (cho trắc nghiệm hoặc nối từ)
  dateLearned: string;
}

export interface VocabList {
  id: string;
  name: string;
  date: string;
  items: ExerciseItem[];
}

export enum AppMode {
  HOME = 'HOME',
  PROCESSING = 'PROCESSING',
  EDITOR = 'EDITOR',
  QUIZ = 'QUIZ',
  PRONUNCIATION = 'PRONUNCIATION',
  HISTORY = 'HISTORY'
}

export interface QuizState {
  currentIndex: number;
  score: number;
  isFinished: boolean;
  userInput: string;
  selectedOption: string | null;
  feedback: 'correct' | 'incorrect' | null;
}
