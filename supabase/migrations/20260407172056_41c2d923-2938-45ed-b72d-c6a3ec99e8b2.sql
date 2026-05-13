
ALTER TABLE public.profiles ADD COLUMN dark_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN accent_color text NOT NULL DEFAULT '262 83% 58%';
