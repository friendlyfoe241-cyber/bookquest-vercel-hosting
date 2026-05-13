
-- Function to award coins for pages read, preventing duplicates
CREATE OR REPLACE FUNCTION public.award_reading_coins(
  p_user_id uuid,
  p_book_id text,
  p_page_number integer,
  p_total_pages integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_max_page integer;
  pages_to_reward integer;
  current_coins integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get the highest page already tracked for this book
  SELECT current_page INTO current_max_page
  FROM public.reading_progress
  WHERE user_id = p_user_id AND book_id = p_book_id;

  IF current_max_page IS NULL THEN
    current_max_page := -1;
  END IF;

  -- Only reward for new pages beyond what was already tracked
  IF p_page_number <= current_max_page THEN
    RETURN 0;
  END IF;

  pages_to_reward := p_page_number - current_max_page;

  -- Update coins
  UPDATE public.profiles
  SET coins = coins + pages_to_reward,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Upsert reading progress
  INSERT INTO public.reading_progress (user_id, book_id, current_page, total_pages, last_read_at)
  VALUES (p_user_id, p_book_id, p_page_number, p_total_pages, now())
  ON CONFLICT (user_id, book_id)
    DO UPDATE SET current_page = GREATEST(reading_progress.current_page, EXCLUDED.current_page),
                  total_pages = EXCLUDED.total_pages,
                  last_read_at = now(),
                  updated_at = now();

  -- Return coins awarded
  RETURN pages_to_reward;
END;
$$;

-- Add unique constraint on reading_progress for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reading_progress_user_book_unique'
  ) THEN
    ALTER TABLE public.reading_progress
    ADD CONSTRAINT reading_progress_user_book_unique UNIQUE (user_id, book_id);
  END IF;
END $$;
