import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProgress, AppSettings, ACCENT_COLORS } from '@/types/book';
import { supabase } from '@/integrations/supabase/client';

interface AppContextType {
  progress: UserProgress;
  settings: AppSettings;
  updateProgress: (updates: Partial<UserProgress>) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setActiveTheme: (themeKey: string | null) => void;
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
  { title: 'Tiny Reader',       scoreNeeded: 0   },
  { title: 'Bookworm',          scoreNeeded: 10  },
  { title: 'Story Explorer',    scoreNeeded: 25  },
  { title: 'Reading Champion',  scoreNeeded: 50  },
  { title: 'Book Master',       scoreNeeded: 100 },
];

const defaultProgress: UserProgress = {
  booksRead: [], quizScores: {}, bookRatings: {}, likedBooks: [], dislikedBooks: [],
  level: 0, streak: 0, lastReadDate: null, readingLevel: 'beginner',
  qteScores: {}, quizStreak: 0, bestQuizStreak: 0, totalQuizPoints: 0, streakSavers: 0,
};

const defaultSettings: AppSettings = {
  darkMode: false,
  accentColor: `${ACCENT_COLORS[1].hue} ${ACCENT_COLORS[1].saturation}% ${ACCENT_COLORS[1].lightness}%`,
  onboarded: false,
  ageGroup: '12-17+',
  activeTheme: undefined,
};

const AppContext = createContext<AppContextType | null>(null);

// ── Storage helpers ───────────────────────────────────────────────────────────

function readStoredJson<T>(key: string): Partial<T> | null {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Partial<T>;
  } catch {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return null;
  }
}

function clearUserLocalStorage() {
  try {
    localStorage.removeItem('bookquest-progress');
    localStorage.removeItem('bookquest-settings');
    localStorage.removeItem('bookquest-uid');
  } catch { /* ignore */ }
}

function getStoredUid(): string | null {
  try { return localStorage.getItem('bookquest-uid'); } catch { return null; }
}
function setStoredUid(uid: string) {
  try { localStorage.setItem('bookquest-uid', uid); } catch { /* ignore */ }
}

// ── Database sync helpers ─────────────────────────────────────────────────────

async function syncBookToDb(userId: string, bookId: string, updates: Record<string, unknown>) {
  const { data: existing } = await supabase
    .from('user_books').select('id')
    .eq('user_id', userId).eq('book_id', bookId).maybeSingle();
  if (existing) {
    await supabase.from('user_books').update(updates).eq('id', existing.id);
  } else {
    await supabase.from('user_books').insert({ user_id: userId, book_id: bookId, ...updates });
  }
}

async function syncProfileDisplayToDb(userId: string, updates: Record<string, unknown>) {
  const allowed = ['display_name', 'avatar_id', 'theme_id', 'reading_level',
    'leaderboard_opt_in', 'school_name', 'class_id', 'active_pet_id',
    'dark_mode', 'accent_color', 'age_group'];
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.includes(k)) safe[k] = v;
  }
  if (Object.keys(safe).length > 0) {
    await supabase.from('profiles').update(safe).eq('user_id', userId);
  }
}

async function syncProfileEconomyToDb(userId: string, updates: Record<string, unknown>) {
  const fieldMap: Record<string, string> = {
    coins: 'p_coins', xp: 'p_xp', level: 'p_level', streak: 'p_streak',
    streak_savers: 'p_streak_savers', total_quiz_points: 'p_total_quiz_points',
    best_quiz_streak: 'p_best_quiz_streak', quiz_streak: 'p_quiz_streak',
    last_read_date: 'p_last_read_date',
  };
  const rpcParams: Record<string, unknown> = { p_user_id: userId };
  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key]) rpcParams[fieldMap[key]] = value;
  }
  if (Object.keys(rpcParams).length > 1) {
    await supabase.rpc('update_profile_economy', rpcParams as any);
  }
}

async function getAuthUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // FIX 1: initialise directly from localStorage so the app is never blank on load
  const [progress, setProgress] = useState<UserProgress>(() => {
    const cached = readStoredJson<UserProgress>('bookquest-progress');
    return cached ? { ...defaultProgress, ...cached } : defaultProgress;
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const cached = readStoredJson<AppSettings>('bookquest-settings');
    return cached ? { ...defaultSettings, ...cached } : defaultSettings;
  });

  const restoreFromDb = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // FIX 2: if a DIFFERENT user logs in, wipe the previous user's cached data first
    const storedUid = getStoredUid();
    if (storedUid && storedUid !== user.id) {
      clearUserLocalStorage();
      setProgress(defaultProgress);
      setSettings(defaultSettings);
    }
    setStoredUid(user.id);

    // ── Profile ───────────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('user_id', user.id).single();

    if (profile) {
      setProgress(prev => ({
        ...prev,
        // FIX 3: use Math.max so DB 0 never overwrites a higher localStorage value
        // (handles migration from old system where DB was always 0)
        level:           Math.max(profile.level          ?? 0,  prev.level),
        streak:          Math.max(profile.streak         ?? 0,  prev.streak),
        quizStreak:      Math.max(profile.quiz_streak    ?? 0,  prev.quizStreak),
        bestQuizStreak:  Math.max(profile.best_quiz_streak ?? 0, prev.bestQuizStreak),
        totalQuizPoints: Math.max(profile.total_quiz_points ?? 0, prev.totalQuizPoints),
        streakSavers:    Math.max(profile.streak_savers  ?? 0,  prev.streakSavers),
        // For non-numeric fields, DB wins only if it has a real value
        lastReadDate:    profile.last_read_date ?? prev.lastReadDate,
        readingLevel:    (profile.reading_level as any) ?? prev.readingLevel,
      }));
      setSettings(prev => ({
        ...prev,
        onboarded:   true,
        ageGroup:    (profile.age_group    as any) ?? prev.ageGroup,
        darkMode:    (profile as any).dark_mode    ?? prev.darkMode,
        accentColor: (profile as any).accent_color ?? prev.accentColor,
        activeTheme: (profile as any).theme_id     ?? prev.activeTheme,
      }));
    } else {
      // Profile exists in auth but not yet in DB — still mark as onboarded
      setSettings(prev => ({ ...prev, onboarded: true }));
    }

    // ── User books ────────────────────────────────────────────────────────────
    const { data: userBooks } = await supabase
      .from('user_books').select('book_id, status, quiz_score, rating, qte_score')
      .eq('user_id', user.id);

    if (userBooks && userBooks.length > 0) {
      const liked: string[] = [], disliked: string[] = [], read: string[] = [];
      const quizScores: Record<string, number> = {};
      const bookRatings: Record<string, number> = {};
      const qteScores: Record<string, number> = {};

      for (const ub of userBooks) {
        if (ub.status === 'liked')    liked.push(ub.book_id);
        if (ub.status === 'disliked') disliked.push(ub.book_id);
        if (ub.status === 'read')     read.push(ub.book_id);
        if (ub.quiz_score != null) quizScores[ub.book_id]  = ub.quiz_score;
        if (ub.rating     != null) bookRatings[ub.book_id] = ub.rating;
        if (ub.qte_score  != null) qteScores[ub.book_id]   = ub.qte_score;
      }

      setProgress(prev => ({
        ...prev,
        // Merge DB lists with localStorage lists (union, DB wins on conflicts)
        likedBooks:    liked.length    > 0 ? liked    : prev.likedBooks,
        dislikedBooks: disliked.length > 0 ? disliked : prev.dislikedBooks,
        booksRead:     read.length     > 0 ? read     : prev.booksRead,
        quizScores:    { ...prev.quizScores,  ...quizScores },
        bookRatings:   { ...prev.bookRatings, ...bookRatings },
        qteScores:     { ...prev.qteScores,   ...qteScores },
      }));
    }
  }, []);

  useEffect(() => {
    restoreFromDb();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // SIGNED_IN fires on every token refresh — just re-sync from DB
        restoreFromDb();
      }
      // FIX 4: do NOT wipe on SIGNED_OUT — that event fires during token refreshes too.
      // User switching is handled in restoreFromDb by comparing stored UIDs.
      // Actual logout is handled by the logout button (which clears state directly).
    });

    return () => subscription.unsubscribe();
  }, [restoreFromDb]);

  // Keep localStorage in sync (it's a fast-load cache; DB is source of truth)
  useEffect(() => {
    localStorage.setItem('bookquest-progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('bookquest-settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.darkMode);
    document.documentElement.style.setProperty('--accent-hsl', settings.accentColor);
    if (settings.activeTheme) {
      document.documentElement.setAttribute('data-theme', settings.activeTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [settings]);

  // ── Updaters ────────────────────────────────────────────────────────────────

  const updateProgress = (updates: Partial<UserProgress>) =>
    setProgress(prev => ({ ...prev, ...updates }));

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    getAuthUserId().then(uid => {
      if (!uid) return;
      const dbUpdates: Record<string, unknown> = {};
      if (updates.darkMode    !== undefined) dbUpdates.dark_mode    = updates.darkMode;
      if (updates.accentColor !== undefined) dbUpdates.accent_color = updates.accentColor;
      if (updates.ageGroup    !== undefined) dbUpdates.age_group    = updates.ageGroup;
      if (Object.keys(dbUpdates).length > 0) syncProfileDisplayToDb(uid, dbUpdates);
    });
  }, []);

  const likeBook = useCallback((bookId: string) => {
    setProgress(prev => ({
      ...prev,
      likedBooks:    [...prev.likedBooks.filter(id => id !== bookId), bookId],
      dislikedBooks: prev.dislikedBooks.filter(id => id !== bookId),
    }));
    getAuthUserId().then(uid => { if (uid) syncBookToDb(uid, bookId, { status: 'liked' }); });
  }, []);

  const dislikeBook = useCallback((bookId: string) => {
    setProgress(prev => ({
      ...prev,
      dislikedBooks: [...prev.dislikedBooks.filter(id => id !== bookId), bookId],
      likedBooks:    prev.likedBooks.filter(id => id !== bookId),
    }));
    getAuthUserId().then(uid => { if (uid) syncBookToDb(uid, bookId, { status: 'disliked' }); });
  }, []);

  const undislikeBook = useCallback((bookId: string) => {
    setProgress(prev => ({ ...prev, dislikedBooks: prev.dislikedBooks.filter(id => id !== bookId) }));
    getAuthUserId().then(uid => { if (uid) syncBookToDb(uid, bookId, { status: 'unseen' }); });
  }, []);

  const markBookRead = useCallback((bookId: string) => {
    const today = new Date().toISOString().split('T')[0];
    let newStreak = 1;
    let earnedSaver = 0;
    const XP_PER_BOOK = 10;

    setProgress(prev => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      newStreak = prev.lastReadDate === today     ? prev.streak
                : prev.lastReadDate === yesterday ? prev.streak + 1
                : 1;
      earnedSaver = newStreak > 0 && newStreak % 7 === 0 ? 1 : 0;
      return {
        ...prev,
        booksRead:    prev.booksRead.includes(bookId) ? prev.booksRead : [...prev.booksRead, bookId],
        streak:       newStreak,
        lastReadDate: today,
        streakSavers: prev.streakSavers + earnedSaver,
      };
    });

    getAuthUserId().then(async uid => {
      if (!uid) return;
      syncBookToDb(uid, bookId, { status: 'read', read_at: new Date().toISOString() });
      await supabase.from('xp_log').insert({ user_id: uid, xp_amount: XP_PER_BOOK, source: 'book_read' });
      const { data: profile } = await supabase.from('profiles').select('xp').eq('user_id', uid).single();
      syncProfileEconomyToDb(uid, {
        streak: newStreak, last_read_date: today,
        xp: ((profile as any)?.xp ?? 0) + XP_PER_BOOK,
      });
    });
  }, []);

  const saveQuizScore = useCallback((bookId: string, score: number, _total: number) => {
    const points = score * 3;
    let newTotal = 0;
    setProgress(prev => {
      newTotal = prev.totalQuizPoints + points;
      return { ...prev, quizScores: { ...prev.quizScores, [bookId]: score }, totalQuizPoints: newTotal };
    });
    getAuthUserId().then(async uid => {
      if (!uid) return;
      syncBookToDb(uid, bookId, { quiz_score: score });
      if (points > 0) {
        await supabase.from('xp_log').insert({ user_id: uid, xp_amount: points, source: 'quiz' });
      }
      const { data: profile } = await supabase.from('profiles').select('xp').eq('user_id', uid).single();
      syncProfileEconomyToDb(uid, {
        total_quiz_points: newTotal,
        xp: ((profile as any)?.xp ?? 0) + points,
      });
    });
  }, []);

  const addQuizStreak = useCallback((correct: boolean) => {
    setProgress(prev => {
      if (correct) {
        const newStreak = prev.quizStreak + 1;
        return { ...prev, quizStreak: newStreak, bestQuizStreak: Math.max(newStreak, prev.bestQuizStreak) };
      }
      return { ...prev, quizStreak: 0 };
    });
  }, []);

  const rateBook = useCallback((bookId: string, rating: number) => {
    setProgress(prev => ({ ...prev, bookRatings: { ...prev.bookRatings, [bookId]: rating } }));
    getAuthUserId().then(uid => { if (uid) syncBookToDb(uid, bookId, { rating }); });
  }, []);

  const getUserLevel = () => {
    const readingScore = progress.booksRead.length * 5 + progress.totalQuizPoints;
    let current = LEVELS[0];
    for (const level of LEVELS) { if (readingScore >= level.scoreNeeded) current = level; }
    const idx  = LEVELS.indexOf(current);
    const next = LEVELS[idx + 1];
    return { level: idx, title: current.title, booksNeeded: next ? next.scoreNeeded - readingScore : 0, score: readingScore };
  };

  const checkStreak = () => {
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (progress.lastReadDate !== today && progress.lastReadDate !== yesterday) {
      if (progress.streakSavers > 0) {
        setProgress(prev => ({ ...prev, streakSavers: prev.streakSavers - 1, lastReadDate: yesterday }));
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

  const setActiveTheme = useCallback((themeKey: string | null) => {
    setSettings(prev => ({ ...prev, activeTheme: themeKey ?? undefined }));
    getAuthUserId().then(uid => {
      if (!uid) return;
      syncProfileDisplayToDb(uid, { theme_id: themeKey });
    });
  }, []);

  return (
    <AppContext.Provider value={{
      progress, settings, updateProgress, updateSettings,
      setActiveTheme,
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
