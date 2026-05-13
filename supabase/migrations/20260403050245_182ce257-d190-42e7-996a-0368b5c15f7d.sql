
-- Add age_group to profiles
ALTER TABLE public.profiles
ADD COLUMN age_group text NOT NULL DEFAULT '12-17+';

-- Add age_group to books
ALTER TABLE public.books
ADD COLUMN age_group text NOT NULL DEFAULT '12-17+';

-- Index for filtering books by age group
CREATE INDEX idx_books_age_group ON public.books (age_group);
