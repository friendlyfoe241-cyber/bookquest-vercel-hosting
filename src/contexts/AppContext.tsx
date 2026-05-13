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
  ageGroup: '12-17+',
};

const AppContext = createContext<AppContextType | null>(null);

function readStoredJson<T>(key: string): Partial<T> | null {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Invalid persisted value for ${key}`);
    }

    return parsed as Partial<T>;
  } catch (error) {
    console.error(`Failed to read persisted app state for ${key}:`, error);
    try {
      localStorage.removeItem(key);
    } catch (removeError) {
      console.error(`Failed to clear corrupted app state for ${key}:`, removeError);
    }
    return null;
  }
}

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

// For safe fields (display_name, theme_id, avatar_id, etc.)
async function syncProfileToDb(userId: string, updates: Record<string, unknown>) {
  const safeFields = ['display_name', 'avatar_id', 'theme_id', 'reading_level', 'leaderboard_opt_in', 'school_name', 'class_id', 'active_pet_id'];
  const safeUpdates: Record<string, unknown> = {};
  const economyUpdates: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (safeFields.includes(key)) {
      safeUpdates[key] = value;
    } else {
      economyUpdates[key] = value;
    }
  }
  
  if (Object.keys(safeUpdates).length > 0) {
    await supabase.from('profiles').update(safeUpdates).eq('user_id', userId);
  }
  
  if (Object.keys(economyUpdates).length > 0) {
    // Map to RPC parameter names
    const rpcParams: Record<string, unknown> = { p_user_id: userId };
    const fieldMap: Record<string, string> = {
      coins: 'p_coins', xp: 'p_xp', level: 'p_level', streak: 'p_streak',
      streak_savers: 'p_streak_savers', total_quiz_points: 'p_total_quiz_points',
      best_quiz_streak: 'p_best_quiz_streak', quiz_streak: 'p_quiz_streak',
      last_read_date: 'p_last_read_date',
    };
    for (const [key, value] of Object.entries(economyUpdates)) {
      if (fieldMap[key]) rpcParams[fieldMap[key]] = value;
    }
    await supabase.rpc('update_profile_economy', rpcParams as any);
  }
}

async function getAuthUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(() => {
    const parsed = readStoredJson<UserProgress>('bookquest-progress');
    return parsed ? { ...defaultProgress, ...parsed } : defaultProgress;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const parsed = readStoredJson<AppSettings>('bookquest-settings');
    return parsed ? { ...defaultSettings, ...parsed } : defaultSettings;
  });

  // Restore user data from database on auth
  useEffect(() => {
    const restoreFromDb = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setProgress(prev => ({
          ...prev,
          level: profile.level ?? prev.level,
          streak: profile.streak ?? prev.streak,
          lastReadDate: profile.last_read_date ?? prev.lastReadDate,
          readingLevel: (profile.reading_level as any) ?? prev.readingLevel,
          quizStreak: profile.quiz_streak ?? prev.quizStreak,
          bestQuizStreak: profile.best_quiz_streak ?? prev.bestQuizStreak,
          totalQuizPoints: profile.total_quiz_points ?? prev.totalQuizPoints,
          streakSavers: profile.streak_savers ?? prev.streakSavers,
        }));
        setSettings(prev => ({
          ...prev,
          onboarded: true,
          ageGroup: (profile.age_group as any) ?? prev.ageGroup,
          darkMode: (profile as any).dark_mode ?? prev.darkMode,
          accentColor: (profile as any).accent_color ?? prev.accentColor,
        }));
      }

      // Load user_books
      const { data: userBooks } = await supabase
        .from('user_books')
        .select('book_id, status, quiz_score, rating, qte_score')
        .eq('user_id', user.id);

      if (userBooks && userBooks.length > 0) {
        const liked: string[] = [];
        const disliked: string[] = [];
        const read: string[] = [];
        const quizScores: Record<string, number> = {};
        const bookRatings: Record<string, number> = {};
        const qteScores: Record<string, number> = {};

        for (const ub of userBooks) {
          if (ub.status === 'liked') liked.push(ub.book_id);
          if (ub.status === 'disliked') disliked.push(ub.book_id);
          if (ub.status === 'read') read.push(ub.book_id);
          if (ub.quiz_score != null) quizScores[ub.book_id] = ub.quiz_score;
          if (ub.rating != null) bookRatings[ub.book_id] = ub.rating;
          if (ub.qte_score != null) qteScores[ub.book_id] = ub.qte_score;
        }

        setProgress(prev => ({
          ...prev,
          likedBooks: liked.length > 0 ? liked : prev.likedBooks,
          dislikedBooks: disliked.length > 0 ? disliked : prev.dislikedBooks,
          booksRead: read.length > 0 ? read : prev.booksRead,
          quizScores: Object.keys(quizScores).length > 0 ? { ...prev.quizScores, ...quizScores } : prev.quizScores,
          bookRatings: Object.keys(bookRatings).length > 0 ? { ...prev.bookRatings, ...bookRatings } : prev.bookRatings,
          qteScores: Object.keys(qteScores).length > 0 ? { ...prev.qteScores, ...qteScores } : prev.qteScores,
        }));
      }
    };

    restoreFromDb();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') restoreFromDb();
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    // Persist display settings to database
    getAuthUserId().then(uid => {
      if (!uid) return;
      const dbUpdates: Record<string, unknown> = {};
      if (updates.darkMode !== undefined) dbUpdates.dark_mode = updates.darkMode;
      if (updates.accentColor !== undefined) dbUpdates.accent_color = updates.accentColor;
      if (updates.ageGroup !== undefined) dbUpdates.age_group = updates.ageGroup;
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('profiles').update(dbUpdates).eq('user_id', uid).then(() => {});
      }
    });
  };

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
