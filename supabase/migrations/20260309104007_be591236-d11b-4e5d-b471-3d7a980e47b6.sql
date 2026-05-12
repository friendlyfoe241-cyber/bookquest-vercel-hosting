
-- Add quiz/streak fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quiz_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS best_quiz_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_quiz_points integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_savers integer NOT NULL DEFAULT 0;

-- Imported books table
CREATE TABLE public.imported_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content_text text NOT NULL,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  quiz jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_emoji text NOT NULL DEFAULT '📖',
  genre text NOT NULL DEFAULT 'Adventure',
  difficulty text NOT NULL DEFAULT 'beginner',
  status text NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own imported books" ON public.imported_books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own imported books" ON public.imported_books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own imported books" ON public.imported_books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own imported books" ON public.imported_books FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for imported book illustrations
INSERT INTO storage.buckets (id, name, public) VALUES ('imported-illustrations', 'imported-illustrations', true);

CREATE POLICY "Users can upload illustrations" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'imported-illustrations');
CREATE POLICY "Anyone can view illustrations" ON storage.objects FOR SELECT USING (bucket_id = 'imported-illustrations');
