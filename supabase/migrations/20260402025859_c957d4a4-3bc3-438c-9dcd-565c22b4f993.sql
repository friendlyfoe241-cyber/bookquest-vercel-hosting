
-- Add school/class metadata to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_id text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_id text NOT NULL DEFAULT 'default';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_id text NOT NULL DEFAULT 'default';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_pet_id text DEFAULT NULL;

-- Schools table (predefined list)
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text,
  country text DEFAULT 'US',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schools are readable by everyone" ON public.schools FOR SELECT TO public USING (true);

-- Shop items table
CREATE TABLE public.shop_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'theme',
  price integer NOT NULL DEFAULT 100,
  rarity text NOT NULL DEFAULT 'common',
  xp_boost numeric(3,2) DEFAULT 1.0,
  boost_duration_hours integer DEFAULT NULL,
  icon text NOT NULL DEFAULT '🎨',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop items are readable by everyone" ON public.shop_items FOR SELECT TO public USING (true);

-- User purchases / inventory
CREATE TABLE public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES public.shop_items(id),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  equipped boolean NOT NULL DEFAULT false,
  expires_at timestamptz DEFAULT NULL,
  UNIQUE(user_id, item_id)
);
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inventory" ON public.user_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON public.user_inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON public.user_inventory FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- XP log for timeframe-based leaderboard
CREATE TABLE public.xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount integer NOT NULL,
  source text NOT NULL DEFAULT 'reading',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xp_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own xp log" ON public.xp_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp log" ON public.xp_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Index for leaderboard queries
CREATE INDEX idx_xp_log_user_created ON public.xp_log(user_id, created_at);
CREATE INDEX idx_xp_log_created ON public.xp_log(created_at);
CREATE INDEX idx_profiles_school ON public.profiles(school_name);
CREATE INDEX idx_profiles_class ON public.profiles(school_name, class_id);

-- Daily/weekly challenges
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'daily',
  target_value integer NOT NULL DEFAULT 1,
  xp_reward integer NOT NULL DEFAULT 50,
  coin_reward integer NOT NULL DEFAULT 10,
  icon text NOT NULL DEFAULT '⭐',
  active_from date NOT NULL DEFAULT CURRENT_DATE,
  active_until date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges are readable by everyone" ON public.challenges FOR SELECT TO public USING (true);

CREATE TABLE public.user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own challenges" ON public.user_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON public.user_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON public.user_challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Leaderboard function for timeframe-scoped queries
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  scope text DEFAULT 'global',
  timeframe text DEFAULT 'lifetime',
  requesting_user_id uuid DEFAULT NULL,
  user_school text DEFAULT NULL,
  user_class text DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  xp bigint,
  streak integer,
  level integer,
  avatar_id text,
  last_activity timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date timestamptz;
BEGIN
  -- Determine start date based on timeframe
  IF timeframe = 'week' THEN
    start_date := date_trunc('week', now());
  ELSIF timeframe = 'month' THEN
    start_date := date_trunc('month', now());
  ELSIF timeframe = 'year' THEN
    start_date := date_trunc('year', now());
  ELSE
    start_date := '1970-01-01'::timestamptz;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    COALESCE(SUM(xl.xp_amount), 0)::bigint AS xp,
    p.streak,
    p.level,
    p.avatar_id,
    MAX(xl.created_at) AS last_activity
  FROM public.profiles p
  LEFT JOIN public.xp_log xl ON xl.user_id = p.user_id AND xl.created_at >= start_date
  WHERE
    p.leaderboard_opt_in = true
    AND (
      (scope = 'global')
      OR (scope = 'school' AND p.school_name = user_school)
      OR (scope = 'class' AND p.school_name = user_school AND p.class_id = user_class)
      OR (scope = 'friends' AND requesting_user_id IS NOT NULL AND (
        p.user_id = requesting_user_id
        OR EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND ((f.requester_id = requesting_user_id AND f.addressee_id = p.user_id)
              OR (f.addressee_id = requesting_user_id AND f.requester_id = p.user_id))
        )
      ))
    )
  GROUP BY p.user_id, p.display_name, p.streak, p.level, p.avatar_id
  ORDER BY xp DESC, p.streak DESC, last_activity DESC NULLS LAST
  LIMIT 100;
END;
$$;
