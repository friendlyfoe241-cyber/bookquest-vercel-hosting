
-- Track daily login claims
CREATE TABLE public.daily_login_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  consecutive_day integer NOT NULL DEFAULT 1,
  coins_awarded integer NOT NULL DEFAULT 0,
  special_reward text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, claim_date)
);

ALTER TABLE public.daily_login_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.daily_login_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims" ON public.daily_login_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add login_streak to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_claim date;

-- Add coins_earned to user_books to track coins already earned per book
ALTER TABLE public.user_books ADD COLUMN IF NOT EXISTS coins_earned integer NOT NULL DEFAULT 0;
