export interface BookPage {
  text: string;
  imageDescription: string;
  qte?: QTEEvent;
}

export interface QTEEvent {
  type: 'tap' | 'swipe' | 'mash' | 'choice' | 'maze' | 'reaction' | 'puzzle';
  prompt: string;
  targetCount?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  choices?: { text: string; correct: boolean }[];
  timeLimit: number;
  successText: string;
  failText: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  type: 'mcq' | 'truefalse';
}

export interface Book {
  id: string;
  title: string;
  genre: 'Adventure' | 'Fantasy' | 'Animals' | 'Action';
  summary: string;
  teaser?: string;
  coverColor: string;
  coverEmoji: string;
  pages: BookPage[];
  quiz: QuizQuestion[];
  difficulty: 'beginner' | 'intermediate' | 'experienced';
  isImported?: boolean;
}

export interface UserProgress {
  booksRead: string[];
  quizScores: Record<string, number>;
  bookRatings: Record<string, number>;
  likedBooks: string[];
  dislikedBooks: string[];
  level: number;
  streak: number;
  lastReadDate: string | null;
  readingLevel: 'beginner' | 'reader' | 'experienced';
  qteScores: Record<string, number>;
  quizStreak: number;
  bestQuizStreak: number;
  totalQuizPoints: number;
  streakSavers: number;
}

export interface AppSettings {
  darkMode: boolean;
  accentColor: string;
  onboarded: boolean;
}

export type AccentColor = {
  name: string;
  hue: number;
  saturation: number;
  lightness: number;
};

export const ACCENT_COLORS: AccentColor[] = [
  { name: 'Coral', hue: 12, saturation: 85, lightness: 60 },
  { name: 'Ocean', hue: 205, saturation: 78, lightness: 50 },
  { name: 'Forest', hue: 145, saturation: 63, lightness: 42 },
  { name: 'Sunny', hue: 45, saturation: 93, lightness: 55 },
  { name: 'Purple', hue: 270, saturation: 67, lightness: 55 },
  { name: 'Pink', hue: 330, saturation: 75, lightness: 60 },
];
