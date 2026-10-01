export type ExerciseType = 'VOCAB' | 'MATCHING' | 'FILL_BLANK' | 'REWRITE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ORDERING' | 'SHORT_ANSWER';

export interface ExerciseItem {
  id: string;
  listId: string;
  type: ExerciseType;
  instruction: string;
  question: string;
  answer: string;
  options?: string[];
  imageB64?: string;
  image_b64?: string;
  imageRegion?: { x: number; y: number; width: number; height: number };
  listName?: string;
  folderId?: string;
  dateLearned: string;
}

export interface VocabList {
  id: string;
  name: string;
  date: string;
  items: ExerciseItem[];
  folderId?: string;
}

export interface ExerciseProgress {
  listId: string;
  completedAt: string;
  score: number;
  total: number;
}

export interface ExerciseFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface PomodoroSession {
  id: string;
  completedAt: string;
  studyDate: string;
  minutes: number;
  category?: string;
  subject?: string;
  targetId?: string;
}

export interface VocaWord {
  id: string;
  word: string;
  meaning: string;
  ipa: string;
  example: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  intervalDays: number;
  easeFactor: number;
  folderId?: string;
}

export interface VocaFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  mode: 'markdown' | 'plain';
  tags: string[];
  folderId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InterviewDifficulty = 'junior' | 'middle' | 'senior';

export interface InterviewItem {
  id: string;
  question: string;
  answer: string;
  note: string;
  tags: string[];
  category?: string;
  difficulty?: InterviewDifficulty;
  masteryScore?: number;
  isFavorite?: boolean;
  lastPracticedAt?: string | null;
  nextReviewAt?: string;
  reviewCount?: number;
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum AppMode {
  HOME = 'HOME',
  CROP = 'CROP',
  PROCESSING = 'PROCESSING',
  EDITOR = 'EDITOR',
  QUIZ = 'QUIZ',
  PRONUNCIATION = 'PRONUNCIATION',
  HISTORY = 'HISTORY',
  VOCA = 'VOCA',
  NOTE = 'NOTE',
  INTERVIEW = 'INTERVIEW',
  POMODORO = 'POMODORO',
  STREAK = 'STREAK'
}

export interface QuizState {
  currentIndex: number;
  score: number;
  isFinished: boolean;
  userInput: string;
  selectedOption: string | null;
  feedback: 'correct' | 'incorrect' | null;
}
