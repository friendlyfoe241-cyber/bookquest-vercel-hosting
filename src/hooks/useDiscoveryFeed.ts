import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface FeedItem {
  book_id: string;
  position: number;
  shown: boolean;
  feed_date: string;
}

function getCurrentDateKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function getCurrentHourKey(): string {
  const now = new Date();
  return `${getCurrentDateKey()}T${String(now.getUTCHours()).padStart(2, '0')}`;
}

export function useDiscoveryFeed() {
  const [userId, setUserId] = useState<string | null>(null);
  const [hourKey, setHourKey] = useState(getCurrentHourKey);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Refresh hour key every minute to detect hour changes
  useEffect(() => {
    const interval = setInterval(() => {
      const newKey = getCurrentHourKey();
      if (newKey !== hourKey) setHourKey(newKey);
    }, 60_000);
    return () => clearInterval(interval);
  }, [hourKey]);

  const dateKey = getCurrentDateKey();

  const query = useQuery({
    queryKey: ['discovery-feed', userId, hourKey],
    queryFn: async (): Promise<FeedItem[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('discovery_feed')
        .select('book_id, position, shown, feed_date')
        .eq('user_id', userId)
        .eq('feed_date', dateKey)
        .order('position');

      if (error) {
        console.warn('Discovery feed query failed, falling back to local books', error.message);
        return [];
      }
      return (data as FeedItem[]) || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const getNextRefreshTime = (): string => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    const diff = nextHour.getTime() - now.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m`;
  };

  return {
    feedBookIds: query.data?.map(f => f.book_id) ?? [],
    isLoggedIn: userId !== null,
    isLoading: query.isLoading,
    hourKey,
    getNextRefreshTime,
  };
}
