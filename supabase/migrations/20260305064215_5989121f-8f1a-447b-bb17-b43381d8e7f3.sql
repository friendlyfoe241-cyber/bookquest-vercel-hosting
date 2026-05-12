
-- Create book_reviews table
CREATE TABLE public.book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  display_name text NOT NULL DEFAULT 'Reader',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (guests too)
CREATE POLICY "Reviews are publicly readable"
ON public.book_reviews
FOR SELECT
USING (true);

-- Logged-in users can insert their own review
CREATE POLICY "Users can insert own reviews"
ON public.book_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own review
CREATE POLICY "Users can update own reviews"
ON public.book_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own review
CREATE POLICY "Users can delete own reviews"
ON public.book_reviews
FOR DELETE
USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_book_reviews_updated_at
BEFORE UPDATE ON public.book_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
