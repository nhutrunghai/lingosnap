export type ExerciseType = 'VOCAB' | 'MATCHING' | 'FILL_BLANK' | 'REWRITE' | 'MULTIPLE_CHOICE';

export interface ExerciseItem {
  id: string;
  listId: string;
  type: ExerciseType;
  instruction: string;
  question: string;
  answer: string;
  options?: string[];
  dateLearned: string;
}

export interface VocabList {
  id: string;
  name: string;
  date: string;
  items: ExerciseItem[];
}

export interface PomodoroSession {
  id: string;
  completedAt: string;
  studyDate: string;
  minutes: number;
}

export enum AppMode {
  HOME = 'HOME',
  PROCESSING = 'PROCESSING',
  EDITOR = 'EDITOR',
  QUIZ = 'QUIZ',
  PRONUNCIATION = 'PRONUNCIATION',
  HISTORY = 'HISTORY',
  POMODORO = 'POMODORO'
}

export interface QuizState {
  currentIndex: number;
  score: number;
  isFinished: boolean;
  userInput: string;
  selectedOption: string | null;
  feedback: 'correct' | 'incorrect' | null;
}
