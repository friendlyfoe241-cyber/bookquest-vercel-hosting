import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReadingProgress {
  currentPage: number;
  totalPages: number;
  fontSize: number;
  completed: boolean;
  bookmarks: number[];
  highlights: { page: number; text: string; color: string }[];
}

export function useReadingProgress(bookId: string, totalPages: number) {
  const [progress, setProgress] = useState<ReadingProgress>({
    currentPage: 0,
    totalPages,
    fontSize: 16,
    completed: false,
    bookmarks: [],
    highlights: [],
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Load progress from DB
  useEffect(() => {
    if (!userId || !bookId) return;
    const load = async () => {
      const [{ data: prog }, { data: bmarks }, { data: hlights }] = await Promise.all([
        supabase.from('reading_progress').select('*').eq('user_id', userId).eq('book_id', bookId).maybeSingle(),
        supabase.from('bookmarks').select('page_number').eq('user_id', userId).eq('book_id', bookId),
        supabase.from('highlights').select('page_number, highlighted_text, color').eq('user_id', userId).eq('book_id', bookId),
      ]);
      setProgress(prev => ({
        ...prev,
        currentPage: prog?.current_page ?? prev.currentPage,
        fontSize: prog?.font_size ?? prev.fontSize,
        completed: prog?.completed ?? false,
        bookmarks: bmarks?.map(b => b.page_number) ?? [],
        highlights: hlights?.map(h => ({ page: h.page_number, text: h.highlighted_text, color: h.color })) ?? [],
      }));
    };
    load();
  }, [userId, bookId]);

  const syncProgress = useCallback(async (page: number, fontSize: number, completed: boolean) => {
    if (!userId) return;
    await supabase.from('reading_progress').upsert({
      user_id: userId,
      book_id: bookId,
      current_page: page,
      total_pages: totalPages,
      font_size: fontSize,
      completed,
      last_read_at: new Date().toISOString(),
    }, { onConflict: 'user_id,book_id' });
  }, [userId, bookId, totalPages]);

  const setFontSize = useCallback((size: number) => {
    setProgress(prev => ({ ...prev, fontSize: size }));
    syncProgress(progress.currentPage, size, progress.completed);
  }, [progress.currentPage, progress.completed, syncProgress]);

  const toggleBookmark = useCallback(async (page: number) => {
    const isBookmarked = progress.bookmarks.includes(page);
    if (isBookmarked) {
      setProgress(prev => ({ ...prev, bookmarks: prev.bookmarks.filter(p => p !== page) }));
      if (userId) {
        await supabase.from('bookmarks').delete().eq('user_id', userId).eq('book_id', bookId).eq('page_number', page);
      }
    } else {
      setProgress(prev => ({ ...prev, bookmarks: [...prev.bookmarks, page] }));
      if (userId) {
        await supabase.from('bookmarks').insert({ user_id: userId, book_id: bookId, page_number: page });
      }
    }
  }, [progress.bookmarks, userId, bookId]);

  const addHighlight = useCallback(async (page: number, text: string, color: string = 'yellow') => {
    setProgress(prev => ({ ...prev, highlights: [...prev.highlights, { page, text, color }] }));
    if (userId) {
      await supabase.from('highlights').insert({ user_id: userId, book_id: bookId, page_number: page, highlighted_text: text, color });
    }
  }, [userId, bookId]);

  const updatePage = useCallback((page: number) => {
    setProgress(prev => ({ ...prev, currentPage: page }));
    syncProgress(page, progress.fontSize, page >= totalPages - 1);
  }, [progress.fontSize, totalPages, syncProgress]);

  return {
    ...progress,
    setFontSize,
    toggleBookmark,
    addHighlight,
    updatePage,
    isBookmarked: (page: number) => progress.bookmarks.includes(page),
  };
}
