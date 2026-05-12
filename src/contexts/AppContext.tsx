import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProgress, AppSettings, ACCENT_COLORS } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';

interface AppContextType {
  progress: UserProgress;
  settings: AppSettings;
  updateProgress: (updates: Partial<UserProgress>) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  likeBook: (bookId: string) => void;
  dislikeBook: (bookId: string) => void;
  undislikeBook: (bookId: string) => void;
  markBookRead: (bookId: string) => void;
  saveQuizScore: (bookId: string, score: number, total: number) => void;
  rateBook: (bookId: string, rating: number) => void;
  getUserLevel: () => { level: number; title: string; booksNeeded: number; score: number };
  checkStreak: () => void;
  addQuizStreak: (correct: boolean) => void;
  useStreakSaver: () => boolean;
}

const LEVELS = [
  { title: 'Tiny Reader', scoreNeeded: 0 },
  { title: 'Bookworm', scoreNeeded: 10 },
  { title: 'Story Explorer', scoreNeeded: 25 },
  { title: 'Reading Champion', scoreNeeded: 50 },
  { title: 'Book Master', scoreNeeded: 100 },
];

const defaultProgress: UserProgress = {
  booksRead: [],
  quizScores: {},
  bookRatings: {},
  likedBooks: [],
  dislikedBooks: [],
  level: 0,
  streak: 0,
  lastReadDate: null,
  readingLevel: 'beginner',
  qteScores: {},
  quizStreak: 0,
  bestQuizStreak: 0,
  totalQuizPoints: 0,
  streakSavers: 0,
};

const defaultSettings: AppSettings = {
  darkMode: false,
  accentColor: `${ACCENT_COLORS[1].hue} ${ACCENT_COLORS[1].saturation}% ${ACCENT_COLORS[1].lightness}%`,
  onboarded: false,
};

const AppContext = createContext<AppContextType | null>(null);

async function syncBookToDb(userId: string, bookId: string, updates: Record<string, unknown>) {
  const { data: existing } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle();
  if (existing) {
    await supabase.from('user_books').update(updates).eq('id', existing.id);
  } else {
    await supabase.from('user_books').insert({ user_id: userId, book_id: bookId, ...updates });
  }
}

async function syncProfileToDb(userId: string, updates: Record<string, unknown>) {
  await supabase.from('profiles').update(updates).eq('user_id', userId);
}

async function getAuthUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('bookquest-progress');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultProgress, ...parsed };
    }
    return defaultProgress;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('bookquest-settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('bookquest-progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('bookquest-settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.darkMode);
    document.documentElement.style.setProperty('--accent-hsl', settings.accentColor);
  }, [settings]);

  const updateProgress = (updates: Partial<UserProgress>) =>
    setProgress(prev => ({ ...prev, ...updates }));

  const updateSettings = (updates: Partial<AppSettings>) =>
    setSettings(prev => ({ ...prev, ...updates }));

  const likeBook = useCallback((bookId: string) => {
    setProgress(prev => ({
      ...prev,
      likedBooks: [...prev.likedBooks.filter(id => id !== bookId), bookId],
      dislikedBooks: prev.dislikedBooks.filter(id => id !== bookId),
    }));
    getAuthUserId().then(uid => {
      if (uid) syncBookToDb(uid, bookId, { status: 'liked' });
    });
  }, []);

  const dislikeBook = useCallback((bookId: string) => {
    setProgress(prev => ({
      ...prev,
      dislikedBooks: [...prev.dislikedBooks.filter(id => id !== bookId), bookId],
      likedBooks: prev.likedBooks.filter(id => id !== bookId),
    }));
    getAuthUserId().then(uid => {
      if (uid) syncBookToDb(uid, bookId, { status: 'disliked' });
    });
  }, []);

  const undislikeBook = useCallback((bookId: string) => {
    setProgress(prev => ({
      ...prev,
      dislikedBooks: prev.dislikedBooks.filter(id => id !== bookId),
    }));
    getAuthUserId().then(uid => {
      if (uid) syncBookToDb(uid, bookId, { status: 'unseen' });
    });
  }, []);

  const markBookRead = useCallback((bookId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setProgress(prev => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = prev.lastReadDate === today ? prev.streak
        : prev.lastReadDate === yesterday ? prev.streak + 1 : 1;
      // Award streak saver every 7-day login streak
      const earnedSaver = newStreak > 0 && newStreak % 7 === 0 ? 1 : 0;
      return {
        ...prev,
        booksRead: prev.booksRead.includes(bookId) ? prev.booksRead : [...prev.booksRead, bookId],
        streak: newStreak,
        lastReadDate: today,
        streakSavers: prev.streakSavers + earnedSaver,
      };
    });
    getAuthUserId().then(uid => {
      if (uid) {
        syncBookToDb(uid, bookId, { status: 'read', read_at: new Date().toISOString() });
        const booksCount = progress.booksRead.includes(bookId) ? progress.booksRead.length : progress.booksRead.length + 1;
        const readingScore = booksCount * 5 + progress.totalQuizPoints;
        let levelIdx = 0;
        for (const level of LEVELS) {
          if (readingScore >= level.scoreNeeded) levelIdx = LEVELS.indexOf(level);
        }
        syncProfileToDb(uid, {
          streak: progress.streak,
          last_read_date: today,
          level: levelIdx,
        });
      }
    });
  }, [progress.booksRead, progress.streak, progress.totalQuizPoints]);

  const saveQuizScore = useCallback((bookId: string, score: number, total: number) => {
    const points = score * 3; // 3 points per correct answer
    setProgress(prev => ({
      ...prev,
      quizScores: { ...prev.quizScores, [bookId]: score },
      totalQuizPoints: prev.totalQuizPoints + points,
    }));
    getAuthUserId().then(uid => {
      if (uid) {
        syncBookToDb(uid, bookId, { quiz_score: score });
        syncProfileToDb(uid, { total_quiz_points: progress.totalQuizPoints + points });
      }
    });
  }, [progress.totalQuizPoints]);

  const addQuizStreak = useCallback((correct: boolean) => {
    setProgress(prev => {
      if (correct) {
        const newStreak = prev.quizStreak + 1;
        return {
          ...prev,
          quizStreak: newStreak,
          bestQuizStreak: Math.max(newStreak, prev.bestQuizStreak),
        };
      }
      return { ...prev, quizStreak: 0 };
    });
  }, []);

  const rateBook = useCallback((bookId: string, rating: number) => {
    setProgress(prev => ({
      ...prev,
      bookRatings: { ...prev.bookRatings, [bookId]: rating },
    }));
    getAuthUserId().then(uid => {
      if (uid) syncBookToDb(uid, bookId, { rating });
    });
  }, []);

  const getUserLevel = () => {
    const booksCount = progress.booksRead.length;
    const readingScore = booksCount * 5 + progress.totalQuizPoints;
    let current = LEVELS[0];
    for (const level of LEVELS) {
      if (readingScore >= level.scoreNeeded) current = level;
    }
    const idx = LEVELS.indexOf(current);
    const next = LEVELS[idx + 1];
    return {
      level: idx,
      title: current.title,
      booksNeeded: next ? next.scoreNeeded - readingScore : 0,
      score: readingScore,
    };
  };

  const checkStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (progress.lastReadDate !== today && progress.lastReadDate !== yesterday) {
      // Check if user has a streak saver
      if (progress.streakSavers > 0) {
        // Auto-use streak saver
        setProgress(prev => ({
          ...prev,
          streakSavers: prev.streakSavers - 1,
          lastReadDate: yesterday, // pretend they read yesterday
        }));
      } else {
        setProgress(prev => ({ ...prev, streak: 0 }));
      }
    }
  };

  const useStreakSaver = useCallback((): boolean => {
    if (progress.streakSavers <= 0) return false;
    setProgress(prev => ({
      ...prev,
      streakSavers: prev.streakSavers - 1,
      lastReadDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    }));
    return true;
  }, [progress.streakSavers]);

  return (
    <AppContext.Provider value={{
      progress, settings, updateProgress, updateSettings,
      likeBook, dislikeBook, undislikeBook, markBookRead,
      saveQuizScore, rateBook, getUserLevel, checkStreak,
      addQuizStreak, useStreakSaver,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
