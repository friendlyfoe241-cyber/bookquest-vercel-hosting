
-- 1. FIX PROFILE ECONOMY BYPASS
-- Drop the blanket UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create restricted UPDATE policy that only allows safe field changes
-- Using a trigger approach to prevent economy field tampering
CREATE OR REPLACE FUNCTION public.protect_profile_economy_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Preserve economy fields - users cannot change these directly
  NEW.coins := OLD.coins;
  NEW.xp := OLD.xp;
  NEW.level := OLD.level;
  NEW.streak := OLD.streak;
  NEW.streak_savers := OLD.streak_savers;
  NEW.total_quiz_points := OLD.total_quiz_points;
  NEW.best_quiz_streak := OLD.best_quiz_streak;
  NEW.quiz_streak := OLD.quiz_streak;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_economy
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_economy_fields();

-- Re-create the UPDATE policy (ownership check only, trigger protects fields)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create a SECURITY DEFINER function for legitimate economy updates (used by edge functions / server)
CREATE OR REPLACE FUNCTION public.update_profile_economy(
  p_user_id uuid,
  p_coins integer DEFAULT NULL,
  p_xp integer DEFAULT NULL,
  p_level integer DEFAULT NULL,
  p_streak integer DEFAULT NULL,
  p_streak_savers integer DEFAULT NULL,
  p_total_quiz_points integer DEFAULT NULL,
  p_best_quiz_streak integer DEFAULT NULL,
  p_quiz_streak integer DEFAULT NULL,
  p_last_read_date date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.profiles SET
    coins = COALESCE(p_coins, coins),
    xp = COALESCE(p_xp, xp),
    level = COALESCE(p_level, level),
    streak = COALESCE(p_streak, streak),
    streak_savers = COALESCE(p_streak_savers, streak_savers),
    total_quiz_points = COALESCE(p_total_quiz_points, total_quiz_points),
    best_quiz_streak = COALESCE(p_best_quiz_streak, best_quiz_streak),
    quiz_streak = COALESCE(p_quiz_streak, quiz_streak),
    last_read_date = COALESCE(p_last_read_date, last_read_date),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 2. FIX BOOKS OPEN INSERT
-- Drop the open INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert books" ON public.books;
-- No new INSERT policy for regular users - books are inserted via service role / dev panel edge function

-- 3. FIX USER CHALLENGES SELF-CLAIM
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own challenges" ON public.user_challenges;

-- Create restricted INSERT policy
CREATE POLICY "Users can insert own challenges"
ON public.user_challenges
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND progress = 0
  AND completed = false
  AND claimed = false
);

-- 4. FIX STORAGE BUCKET EXPOSURE
-- Make imported-illustrations private
UPDATE storage.buckets SET public = false WHERE id = 'imported-illustrations';

-- Drop any existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view illustrations" ON storage.objects;

-- Add owner-scoped policies
CREATE POLICY "Users can view own illustrations"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'imported-illustrations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own illustrations"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'imported-illustrations' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. FIX FRIEND PROFILE DATA EXPOSURE
-- Replace the broad friend SELECT policy with one that only shows safe fields
-- We use a view approach
DROP POLICY IF EXISTS "Friends can view profiles" ON public.profiles;

-- Create a limited friend visibility policy using a security definer function
CREATE OR REPLACE FUNCTION public.get_friend_profiles(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_id text,
  level integer,
  streak integer,
  xp integer,
  leaderboard_opt_in boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_id, p.level, p.streak, p.xp, p.leaderboard_opt_in
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND ((f.requester_id = p_user_id AND f.addressee_id = p.user_id)
      OR (f.addressee_id = p_user_id AND f.requester_id = p.user_id))
  );
$$;
