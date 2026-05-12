-- Add validation trigger for review_text length and rating range
CREATE OR REPLACE FUNCTION public.validate_book_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.review_text) > 500 THEN
    RAISE EXCEPTION 'review_text must be 500 characters or less';
  END IF;
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF NEW.display_name IS NOT NULL AND char_length(NEW.display_name) > 50 THEN
    RAISE EXCEPTION 'display_name must be 50 characters or less';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_review_before_insert_update
  BEFORE INSERT OR UPDATE ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_book_review();