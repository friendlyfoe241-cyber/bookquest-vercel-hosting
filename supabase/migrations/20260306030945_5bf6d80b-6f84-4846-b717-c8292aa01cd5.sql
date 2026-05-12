
-- Fix profiles RLS: Drop restrictive policies and recreate as permissive
-- so users can see own profile OR leaderboard participants OR friends' profiles

DROP POLICY IF EXISTS "Leaderboard is publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Permissive: users can see their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Permissive: anyone can see leaderboard-opted-in profiles
CREATE POLICY "Leaderboard profiles are readable"
ON public.profiles FOR SELECT
USING (leaderboard_opt_in = true);

-- Permissive: friends can see each other's profiles
CREATE POLICY "Friends can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = user_id) OR
        (f.addressee_id = auth.uid() AND f.requester_id = user_id)
      )
  )
);

-- Fix user_books: allow friends to see each other's reading activity
CREATE POLICY "Friends can view book activity"
ON public.user_books FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = user_id) OR
        (f.addressee_id = auth.uid() AND f.requester_id = user_id)
      )
  )
);

-- Also allow searching profiles by name for friend requests (authenticated users)
CREATE POLICY "Authenticated users can search profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
