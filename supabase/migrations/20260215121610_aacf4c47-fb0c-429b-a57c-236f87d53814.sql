
-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  reading_level TEXT NOT NULL DEFAULT 'beginner' CHECK (reading_level IN ('beginner', 'reader')),
  streak INT NOT NULL DEFAULT 0,
  last_read_date DATE,
  level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Books catalog (stores all books including dynamically added ones)
CREATE TABLE public.books (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT NOT NULL CHECK (genre IN ('Adventure', 'Fantasy', 'Animals', 'Action')),
  summary TEXT NOT NULL,
  cover_color TEXT NOT NULL,
  cover_emoji TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate')),
  pages JSONB NOT NULL DEFAULT '[]',
  quiz JSONB NOT NULL DEFAULT '[]',
  batch INT NOT NULL DEFAULT 0, -- which batch this book belongs to (0 = original)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Books are readable by everyone" ON public.books FOR SELECT USING (true);

-- User book interactions (likes, dislikes, read status, ratings, quiz scores)
CREATE TABLE public.user_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unseen' CHECK (status IN ('unseen', 'liked', 'disliked', 'read')),
  quiz_score INT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  qte_score INT DEFAULT 0,
  discovered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own book data" ON public.user_books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own book data" ON public.user_books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own book data" ON public.user_books FOR UPDATE USING (auth.uid() = user_id);

-- Discovery feed tracking (which books to show next)
CREATE TABLE public.discovery_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  shown BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  feed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id, feed_date)
);

ALTER TABLE public.discovery_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed" ON public.discovery_feed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feed" ON public.discovery_feed FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feed" ON public.discovery_feed FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Reader'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_books_updated_at BEFORE UPDATE ON public.user_books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
