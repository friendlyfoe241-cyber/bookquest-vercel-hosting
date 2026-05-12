-- 1. Drop the overly broad profile search policy
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

-- 2. Create a SECURITY DEFINER function for safe profile search
CREATE OR REPLACE FUNCTION public.search_profiles_by_name(query text)
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name
  FROM public.profiles p
  WHERE p.display_name ILIKE '%' || query || '%'
  LIMIT 10;
$$;

-- 3. Add validation trigger for quiz_score bounds (0-10)
CREATE OR REPLACE FUNCTION public.validate_user_books_scores()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.quiz_score IS NOT NULL AND (NEW.quiz_score < 0 OR NEW.quiz_score > 10) THEN
    RAISE EXCEPTION 'quiz_score must be between 0 and 10';
  END IF;
  IF NEW.qte_score IS NOT NULL AND (NEW.qte_score < 0 OR NEW.qte_score > 10) THEN
    RAISE EXCEPTION 'qte_score must be between 0 and 10';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_scores_before_insert_update
  BEFORE INSERT OR UPDATE ON public.user_books
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_books_scores();