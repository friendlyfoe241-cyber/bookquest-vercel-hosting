import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

/**
 * Hook to track user authentication state for the discovery feature.
 * Note: Discovery now uses unlimited local book generation instead of server-side feed.
 */
export function useDiscoveryFeed() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id ?? null);
      } catch (error) {
        console.warn('Failed to fetch user:', error);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkUser();
  }, []);

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
    feedBookIds: [], // Deprecated - local generation is now used
    isLoggedIn: userId !== null,
    isLoading,
    getNextRefreshTime,
  };
}
