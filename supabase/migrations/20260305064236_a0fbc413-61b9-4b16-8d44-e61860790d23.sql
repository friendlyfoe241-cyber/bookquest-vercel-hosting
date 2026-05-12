
-- Fix the leaderboard view to not be security definer
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard WITH (security_invoker = true) AS
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
