import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, UserPlus, UserCheck, Users, X, Check, Search, BookOpen, Flame, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface FriendProfile {
  user_id: string;
  display_name: string | null;
  streak: number;
  level: number;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
}

interface FriendWithProfile extends Friendship {
  profile?: FriendProfile;
}

const Friends = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, FriendProfile>>({});
  const [friendActivity, setFriendActivity] = useState<Record<string, { books_read: number; total_score: number }>>({});
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUserId(user.id);
    loadFriendships(user.id);
  };

  const loadFriendships = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

    const ships = (data ?? []) as Friendship[];
    setFriendships(ships);

    // Load profiles for all friend IDs
    const friendIds = ships.map(f => f.requester_id === uid ? f.addressee_id : f.requester_id);
    if (friendIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name, streak, level')
        .in('user_id', friendIds);

      const profileMap: Record<string, FriendProfile> = {};
      (profs ?? []).forEach(p => { profileMap[p.user_id] = p; });
      setProfiles(profileMap);

      // Load activity for accepted friends
      const acceptedIds = ships
        .filter(f => f.status === 'accepted')
        .map(f => f.requester_id === uid ? f.addressee_id : f.requester_id);

      if (acceptedIds.length > 0) {
        const { data: activity } = await supabase
          .from('user_books')
          .select('user_id, read_at, quiz_score')
          .in('user_id', acceptedIds);

        const actMap: Record<string, { books_read: number; total_score: number }> = {};
        (activity ?? []).forEach(a => {
          if (!actMap[a.user_id]) actMap[a.user_id] = { books_read: 0, total_score: 0 };
          if (a.read_at) actMap[a.user_id].books_read++;
          if (a.quiz_score) actMap[a.user_id].total_score += a.quiz_score;
        });
        setFriendActivity(actMap);
      }
    }

    setLoading(false);
  };

  const sendRequest = async () => {
    if (!userId || !searchEmail.trim()) return;
    setSearching(true);

    // Use secure RPC function that only returns user_id and display_name
    const { data: rpcResults } = await supabase
      .rpc('search_profiles_by_name', { query: searchEmail.trim() });
    
    const matchedProfiles = (rpcResults ?? []).filter(
      (p: { user_id: string; display_name: string }) => p.user_id !== userId
    );

    if (!matchedProfiles || matchedProfiles.length === 0) {
      toast.error('No users found with that name');
      setSearching(false);
      return;
    }

    // If exactly one match, send request directly
    if (matchedProfiles.length === 1) {
      const targetId = matchedProfiles[0].user_id;

      // Check if friendship already exists
      const existing = friendships.find(
        f => (f.requester_id === userId && f.addressee_id === targetId) ||
             (f.requester_id === targetId && f.addressee_id === userId)
      );
      if (existing) {
        toast.error('Already connected with this user');
        setSearching(false);
        return;
      }

      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: userId, addressee_id: targetId });

      if (error) toast.error('Failed to send request');
      else {
        toast.success(`Friend request sent to ${matchedProfiles[0].display_name}!`);
        setSearchEmail('');
        loadFriendships(userId);
      }
    } else {
      // Show as a list to pick from
      toast.info(`Found ${matchedProfiles.length} users. Try a more specific name.`);
    }

    setSearching(false);
  };

  const acceptRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) toast.error('Failed to accept');
    else {
      toast.success('Friend added! 🎉');
      if (userId) loadFriendships(userId);
    }
  };

  const declineOrRemove = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) toast.error('Failed to remove');
    else {
      toast.success('Removed');
      if (userId) loadFriendships(userId);
    }
  };

  const acceptedFriends = friendships.filter(f => f.status === 'accepted');
  const pendingRequests = friendships.filter(
    f => f.status === 'pending' && f.addressee_id === userId
  );
  const sentRequests = friendships.filter(
    f => f.status === 'pending' && f.requester_id === userId
  );

  const getFriendId = (f: Friendship) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id;

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-3xl text-primary flex items-center gap-2">
          <Users className="w-7 h-7" /> Friends
        </h1>
      </div>

      {/* Add friend */}
      <div className="bg-card rounded-2xl p-4 mb-6 border border-border shadow-sm">
        <p className="text-sm font-semibold mb-2">Add a Friend</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              placeholder="Search by name..."
              className="pl-10 rounded-xl"
              onKeyDown={e => e.key === 'Enter' && sendRequest()}
            />
          </div>
          <Button onClick={sendRequest} disabled={searching} className="rounded-xl">
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'friends' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Friends ({acceptedFriends.length})
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors relative ${
            tab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Requests
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : tab === 'friends' ? (
        acceptedFriends.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No friends yet. Search for readers above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {acceptedFriends.map((f, i) => {
              const friendId = getFriendId(f);
              const profile = profiles[friendId];
              const activity = friendActivity[friendId];
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {(profile?.display_name || 'R')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{profile?.display_name || 'Reader'}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {activity?.books_read ?? 0} books</span>
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {profile?.streak ?? 0} streak</span>
                      <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {activity?.total_score ?? 0} pts</span>
                    </div>
                  </div>
                  <button onClick={() => declineOrRemove(f.id)} className="p-2 hover:bg-destructive/10 rounded-xl transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {/* Incoming requests */}
          {pendingRequests.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Incoming</p>
              {pendingRequests.map(f => {
                const profile = profiles[f.requester_id];
                return (
                  <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {(profile?.display_name || 'R')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{profile?.display_name || 'Reader'}</p>
                      <p className="text-xs text-muted-foreground">Wants to be friends</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => acceptRequest(f.id)} className="p-2 bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors">
                        <Check className="w-4 h-4 text-primary" />
                      </button>
                      <button onClick={() => declineOrRemove(f.id)} className="p-2 hover:bg-destructive/10 rounded-xl transition-colors">
                        <X className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Sent requests */}
          {sentRequests.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sent</p>
              {sentRequests.map(f => {
                const profile = profiles[f.addressee_id];
                return (
                  <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-2 opacity-70">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {(profile?.display_name || 'R')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{profile?.display_name || 'Reader'}</p>
                      <p className="text-xs text-muted-foreground">Pending...</p>
                    </div>
                    <button onClick={() => declineOrRemove(f.id)} className="p-2 hover:bg-destructive/10 rounded-xl transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {pendingRequests.length === 0 && sentRequests.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No pending requests</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Friends;
