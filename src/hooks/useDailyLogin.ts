import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDailyReward, DailyReward } from '@/utils/coinEconomy';

interface DailyLoginState {
  claimed: boolean;
  reward: DailyReward | null;
  streak: number;
  loading: boolean;
  claim: () => Promise<void>;
}

export function useDailyLogin(): DailyLoginState {
  const [claimed, setClaimed] = useState(true); // default true to avoid flash
  const [reward, setReward] = useState<DailyReward | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const today = new Date().toISOString().split('T')[0];

    // Check if already claimed today
    const { data: todayClaim } = await supabase
      .from('daily_login_claims')
      .select('*')
      .eq('user_id', user.id)
      .eq('claim_date', today)
      .maybeSingle();

    if (todayClaim) {
      setClaimed(true);
      setStreak(todayClaim.consecutive_day);
      setLoading(false);
      return;
    }

    // Get profile for last_login_claim
    const { data: profile } = await supabase
      .from('profiles')
      .select('login_streak, last_login_claim')
      .eq('user_id', user.id)
      .maybeSingle();

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastClaim = (profile as any)?.last_login_claim;
    const currentStreak = lastClaim === yesterday
      ? ((profile as any)?.login_streak ?? 0) + 1
      : 1;

    const dailyReward = getDailyReward(currentStreak);
    setReward(dailyReward);
    setStreak(currentStreak);
    setClaimed(false);
    setLoading(false);
  };

  const claim = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !reward) return;

    const today = new Date().toISOString().split('T')[0];

    // Insert claim
    await supabase.from('daily_login_claims').insert({
      user_id: user.id,
      claim_date: today,
      consecutive_day: streak,
      coins_awarded: reward.coins,
      special_reward: reward.specialReward ?? null,
    } as any);

    // Update profile coins and streak
    await supabase.rpc('update_profile_economy', {
      p_user_id: user.id,
      p_coins: (await supabase.from('profiles').select('coins').eq('user_id', user.id).single()).data?.coins + reward.coins,
    } as any);

    // Update login streak on profile
    await supabase.from('profiles').update({
      login_streak: streak,
      last_login_claim: today,
    } as any).eq('user_id', user.id);

    // If special pet reward
    if (reward.specialReward) {
      // Check if they already have it
      const { data: existing } = await supabase
        .from('user_inventory')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', reward.specialReward)
        .maybeSingle();
      if (!existing) {
        await supabase.from('user_inventory').insert({
          user_id: user.id,
          item_id: reward.specialReward,
          equipped: false,
        });
      }
    }

    setClaimed(true);
  }, [reward, streak]);

  return { claimed, reward, streak, loading, claim };
}
