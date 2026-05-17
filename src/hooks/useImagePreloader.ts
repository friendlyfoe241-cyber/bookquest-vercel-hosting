import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pageIllustrations } from '@/data/pageIllustrations';

// Module-level cache — persists for the session so re-visiting a book is instant
const imageCache = new Map<string, string>();

export function getImageCache() {
  return imageCache;
}

// Every page can have an image
export function shouldHaveImage(_difficulty: string, _pageIndex: number): boolean {
  return true;
}

interface Page {
  text: string;
  imageDescription?: string;
  qte?: unknown;
}

interface Book {
  id: string;
  difficulty: string;
  coverEmoji: string;
  coverColor: string;
  pages: Page[];
}

export function useImagePreloader(book: Book | null) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!book || started.current) return;
    started.current = true;

    const preload = async () => {
      const totalPages = book.pages.length;
      let loaded = 0;

      const tick = () => {
        loaded++;
        setProgress(Math.round((loaded / totalPages) * 100));
      };

      // Catalog books have short string IDs like "adv-1"
      // Imported books have UUIDs like "3f2a1b..."
      const isImported = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(book.id);

      const loadPage = async (page: Page, idx: number) => {
        const cacheKey = `${book.id}:${idx}`;

        // Already loaded this session — skip
        if (imageCache.has(cacheKey)) {
          tick();
          return;
        }

        // ── 1. Use bundled static image if one exists (catalog books only) ──
        const staticImage = !isImported
          ? pageIllustrations[book.id]?.[idx]
          : undefined;

        if (staticImage) {
          imageCache.set(cacheKey, staticImage);
          tick();
          return;
        }

        // ── 2. Call generate-illustration for pages without a static image ──
        try {
          const payload: Record<string, unknown> = {
            pageText:         page.text,
            imageDescription: page.imageDescription,
          };

          // For catalog books pass bookId + pageNumber so results are cached
          // in Supabase Storage and shared across all users
          if (!isImported) {
            payload.bookId     = book.id;
            payload.pageNumber = idx;
          }

          const { data, error } = await supabase.functions.invoke(
            'generate-illustration',
            { body: payload }
          );

          if (!error && data) {
            // `url`   → persistent Supabase Storage URL (catalog books)
            // `image` → base64 data URL (imported books or storage fallback)
            const imgSrc: string | null = data.url || data.image || null;
            if (imgSrc && typeof imgSrc === 'string' && imgSrc.length > 10) {
              imageCache.set(cacheKey, imgSrc);
            }
          }
        } catch (err) {
          // Generation failed — cachedImage stays null → gradient fallback shows
          console.warn(`Image generation failed for ${book.id} page ${idx}:`, err);
        }

        tick();
      };

      // 3 concurrent requests — fast enough, won't hammer Pollinations rate limits
      const tasks = book.pages.map((page, idx) => () => loadPage(page, idx));
      const concurrency = 3;
      for (let i = 0; i < tasks.length; i += concurrency) {
        await Promise.all(tasks.slice(i, i + concurrency).map(fn => fn()));
      }

      setReady(true);
    };

    preload();
  }, [book]);

  return { progress, ready, imageCache };
}
