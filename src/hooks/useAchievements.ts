import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { achievements, AchievementStats } from '@/data/achievements';
import { supabase } from '@/integrations/supabase/client';

export function useAchievements() {
  const { progress } = useApp();
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const loadReviewCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from('book_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setReviewCount(count ?? 0);
      }
    };
    loadReviewCount();
  }, []);

  const stats: AchievementStats = useMemo(() => {
    const readBookIds = progress.booksRead;
    const readBooks = books.filter(b => readBookIds.includes(b.id));
    const genresExplored = new Set(readBooks.map(b => b.genre)).size;

    const perfectQuizzes = Object.entries(progress.quizScores).filter(([bookId, score]) => {
      const book = books.find(b => b.id === bookId);
      return book && score === book.quiz.length;
    }).length;

    const totalQuizScore = Object.values(progress.quizScores).reduce((sum, s) => sum + s, 0);

    return {
      booksRead: readBookIds.length,
      streak: progress.streak,
      totalQuizScore,
      perfectQuizzes,
      likedBooks: progress.likedBooks.length,
      reviewsWritten: reviewCount,
      genresExplored,
    };
  }, [progress, reviewCount]);

  const unlocked = achievements.filter(a => a.requirement(stats));
  const locked = achievements.filter(a => !a.requirement(stats));

  return { stats, unlocked, locked, all: achievements };
}
