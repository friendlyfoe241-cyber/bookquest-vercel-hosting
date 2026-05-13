import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const GUEST_COINS_KEY = 'bookquest-guest-coins';

function getGuestCoins(): number {
  try {
    const val = localStorage.getItem(GUEST_COINS_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch { return 0; }
}

function setGuestCoins(coins: number) {
  try { localStorage.setItem(GUEST_COINS_KEY, String(coins)); } catch {}
}

/**
 * Hook that syncs coin balance from the backend for logged-in users,
 * and falls back to localStorage for guest users.
 */
export function useCoinSync() {
  const [coins, setCoinsState] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  const fetchCoins = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsGuest(true);
      setCoinsState(getGuestCoins());
      setLoaded(true);
      return;
    }
    setIsGuest(false);
    const { data } = await supabase
      .from('profiles')
      .select('coins')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setCoinsState((data as any).coins ?? 0);
    }
    setLoaded(true);
  }, []);

  const setCoins = useCallback((val: number | ((prev: number) => number)) => {
    setCoinsState(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      // Persist to localStorage for guests
      if (isGuest) setGuestCoins(newVal);
      return newVal;
    });
  }, [isGuest]);

  useEffect(() => {
    fetchCoins();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchCoins();
    });

    const onFocus = () => fetchCoins();
    window.addEventListener('focus', onFocus);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchCoins();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchCoins]);

  return { coins, setCoins, refreshCoins: fetchCoins, loaded, isGuest };
}
