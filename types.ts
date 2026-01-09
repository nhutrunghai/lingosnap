
export interface VocabItem {
  id: string;
  listId: string; // ID định danh bộ từ
  english: string;
  vietnamese: string;
  dateLearned: string;
}

export interface VocabList {
  id: string;
  name: string;
  date: string;
  items: VocabItem[];
}

export enum AppMode {
  HOME = 'HOME',
  PROCESSING = 'PROCESSING',
  EDITOR = 'EDITOR',
  QUIZ_EN = 'QUIZ_EN',
  QUIZ_VN = 'QUIZ_VN',
  PRONUNCIATION = 'PRONUNCIATION',
  HISTORY = 'HISTORY'
}

export interface QuizState {
  currentIndex: number;
  score: number;
  isFinished: boolean;
  userInput: string;
  feedback: 'correct' | 'incorrect' | null;
}
