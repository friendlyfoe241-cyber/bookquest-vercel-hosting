import { useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { toast } from 'sonner';

/**
 * Hook that checks on app load and shows relevant notifications:
 * - Streak at risk (last read was yesterday)
 * - New book recommendations
 */
export function useAppNotifications() {
  const { progress } = useApp();
  const hasNotified = useRef(false);

  useEffect(() => {
    if (hasNotified.current) return;
    hasNotified.current = true;

    // Small delay to let the app render first
    const timer = setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Streak at risk notification
      if (progress.streak > 0 && progress.lastReadDate === yesterday) {
        toast.warning(`🔥 ${progress.streak} day streak at risk!`, {
          description: 'Read a book today to keep your streak going!',
          duration: 8000,
          action: {
            label: 'Read Now',
            onClick: () => {
              window.location.href = '/library';
            },
          },
        });
      }

      // Streak broken notification
      if (progress.streak === 0 && progress.lastReadDate && progress.lastReadDate !== today && progress.lastReadDate !== yesterday) {
        toast.info('📚 Time to start a new streak!', {
          description: 'Read a book today to begin a new reading streak.',
          duration: 6000,
        });
      }

      // New book recommendations
      if (progress.likedBooks.length > 0) {
        const likedGenres = [...new Set(
          books.filter(b => progress.likedBooks.includes(b.id)).map(b => b.genre)
        )];
        const unreadRecommendations = books.filter(
          b => likedGenres.includes(b.genre) &&
            !progress.booksRead.includes(b.id) &&
            !progress.dislikedBooks.includes(b.id)
        );

        if (unreadRecommendations.length > 0 && progress.booksRead.length > 0) {
          const randomBook = unreadRecommendations[Math.floor(Math.random() * unreadRecommendations.length)];
          setTimeout(() => {
            toast(`📖 You might like "${randomBook.title}"`, {
              description: `A ${randomBook.genre.toLowerCase()} book we think you'll enjoy!`,
              duration: 6000,
              action: {
                label: 'Read',
                onClick: () => {
                  window.location.href = `/read/${randomBook.id}`;
                },
              },
            });
          }, 3000); // Stagger after streak notification
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);
}
