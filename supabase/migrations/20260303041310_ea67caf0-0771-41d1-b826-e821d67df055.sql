
-- Add leaderboard_opt_in to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT false;

-- Create a leaderboard view that's publicly readable
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  p.display_name,
  p.streak,
  p.level,
  COALESCE(ub.books_read, 0) AS books_read,
  COALESCE(ub.total_score, 0) AS total_score
FROM public.profiles p
LEFT JOIN (
  SELECT user_id, 
    COUNT(*) FILTER (WHERE read_at IS NOT NULL) AS books_read,
    COALESCE(SUM(quiz_score), 0) AS total_score
  FROM public.user_books
  GROUP BY user_id
) ub ON ub.user_id = p.user_id
WHERE p.leaderboard_opt_in = true;

-- Allow anyone (including anon) to read the leaderboard view
CREATE POLICY "Leaderboard is publicly readable"
ON public.profiles
FOR SELECT
USING (leaderboard_opt_in = true);
