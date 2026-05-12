import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Flame, BookOpen, ArrowLeft, Crown, Medal, Users, School, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Scope = 'friends' | 'class' | 'school' | 'global';
type Timeframe = 'week' | 'month' | 'year' | 'lifetime';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  xp: number;
  streak: number;
  level: number;
  avatar_id: string;
  last_activity: string | null;
}

const SCOPES: { key: Scope; label: string; icon: typeof Globe }[] = [
  { key: 'friends', label: 'Friends', icon: Users },
  { key: 'class', label: 'Class', icon: BookOpen },
  { key: 'school', label: 'School', icon: School },
  { key: 'global', label: 'Global', icon: Globe },
];

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'lifetime', label: 'Lifetime' },
];

const Leaderboard = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('global');
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [userId, setUserId] = useState<string | null>(null);
  const [userSchool, setUserSchool] = useState<string | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [scope, timeframe, userId, userSchool, userClass]);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('leaderboard_opt_in, school_name, class_id')
        .eq('user_id', user.id)
        .single();
      setOptedIn(profile?.leaderboard_opt_in ?? false);
      setUserSchool((profile as any)?.school_name ?? null);
      setUserClass((profile as any)?.class_id ?? null);
    }
  };

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_leaderboard', {
      scope,
      timeframe,
      requesting_user_id: userId,
      user_school: userSchool,
      user_class: userClass,
    });
    if (!error && data) {
      setEntries(data as unknown as LeaderboardEntry[]);
    }
    setLoading(false);
  }, [scope, timeframe, userId, userSchool, userClass]);

  const toggleOptIn = async () => {
    if (!userId) return;
    const newVal = !optedIn;
    setOptedIn(newVal);
    await supabase.from('profiles').update({ leaderboard_opt_in: newVal }).eq('user_id', userId);
    loadLeaderboard();
  };

  const getRankDisplay = (i: number) => {
    if (i === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (i === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (i === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>;
  };

  const currentUserRank = entries.findIndex(e => e.user_id === userId);

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="font-display text-3xl text-primary flex items-center justify-center gap-2">
            <Trophy className="w-7 h-7" /> Leaderboard
          </h1>
          <p className="text-xs text-muted-foreground">Compete with readers around the world.</p>
        </div>
        <div className="w-9" /> {/* spacer */}
      </div>

      {/* Segmented controls */}
      <div className="flex gap-2 mb-3">
        {/* Scope selector */}
        <div className="flex-1 bg-card rounded-2xl p-1 border border-border flex">
          {SCOPES.map(s => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                scope === s.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {/* Timeframe selector */}
        <div className="flex-1 bg-card rounded-2xl p-1 border border-border flex">
          {TIMEFRAMES.map(t => (
            <button
              key={t.key}
              onClick={() => setTimeframe(t.key)}
              className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                timeframe === t.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opt-in / Auth prompts */}
      {userId && !optedIn && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm border border-border"
        >
          <div>
            <p className="font-semibold text-sm">Join the Leaderboard</p>
            <p className="text-xs text-muted-foreground">Show your stats publicly</p>
          </div>
          <button
            onClick={toggleOptIn}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Join
          </button>
        </motion.div>
      )}

      {!userId && (
        <div className="bg-card rounded-2xl p-4 mb-4 text-center shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Sign in to join the leaderboard!</p>
          <button onClick={() => navigate('/auth')} className="text-primary font-semibold text-sm mt-1 hover:underline">
            Sign In →
          </button>
        </div>
      )}

      {/* Scope-specific messages */}
      {scope === 'class' && !userClass && userId && (
        <div className="bg-card rounded-2xl p-4 mb-4 text-center border border-border">
          <p className="text-sm text-muted-foreground">Set your school and class in Settings to see your class leaderboard.</p>
        </div>
      )}
      {scope === 'school' && !userSchool && userId && (
        <div className="bg-card rounded-2xl p-4 mb-4 text-center border border-border">
          <p className="text-sm text-muted-foreground">Set your school in Settings to see your school leaderboard.</p>
        </div>
      )}

      {/* Your rank */}
      {currentUserRank >= 0 && (
        <div className="bg-primary/10 rounded-2xl p-3 mb-4 flex items-center gap-3 border border-primary/20">
          <div className="w-8 flex justify-center">{getRankDisplay(currentUserRank)}</div>
          <div className="flex-1">
            <p className="font-bold text-sm">You</p>
            <p className="text-xs text-muted-foreground">Rank #{currentUserRank + 1}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg text-primary">{entries[currentUserRank].xp}</p>
            <p className="text-[10px] text-muted-foreground">XP</p>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
            ))}
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No participants yet. Be the first!</p>
          </motion.div>
        ) : (
          <motion.div key={`${scope}-${timeframe}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-2">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  entry.user_id === userId ? 'ring-2 ring-primary/50' : ''
                } ${
                  i === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                  i === 1 ? 'bg-gray-300/10 border-gray-300/30' :
                  i === 2 ? 'bg-amber-700/10 border-amber-700/30' : 'bg-card border-border'
                }`}
              >
                <div className="w-8 flex justify-center">{getRankDisplay(i)}</div>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                  {entry.avatar_id === 'default' ? '📖' :
                   entry.avatar_id === 'avatar-knight' ? '⚔️' :
                   entry.avatar_id === 'avatar-wizard' ? '🧙' :
                   entry.avatar_id === 'avatar-dragon' ? '🐉' :
                   entry.avatar_id === 'avatar-astronaut' ? '👨‍🚀' :
                   entry.avatar_id === 'avatar-pirate' ? '🏴‍☠️' : '📖'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {entry.user_id === userId ? 'You' : (entry.display_name || 'Anonymous Reader')}
                  </p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">Lv.{entry.level}</span>
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {entry.streak}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg text-primary">{entry.xp.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">XP</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leaderboard;
