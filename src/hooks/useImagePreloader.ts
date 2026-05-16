import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// In-memory cache for the current session (avoids redundant fetches)
const imageCache = new Map<string, string>();

export function getImageCache() {
  return imageCache;
}

// All pages get an illustration
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

      // Catalog books have fixed string IDs (e.g. "adv-1")
      // Imported books have UUIDs
      const isImported = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(book.id);

      const loadPage = async (page: Page, idx: number) => {
        const cacheKey = `${book.id}:${idx}`;

        // Already in memory — skip network call
        if (imageCache.has(cacheKey)) {
          tick();
          return;
        }

        try {
          const payload: Record<string, unknown> = {
            pageText:         page.text,
            imageDescription: page.imageDescription,
          };

          // For catalog books, pass bookId + pageNumber so the edge function
          // checks Supabase Storage first and stores the result for all users
          if (!isImported) {
            payload.bookId     = book.id;
            payload.pageNumber = idx;
          }

          const { data, error } = await supabase.functions.invoke('generate-illustration', {
            body: payload,
          });

          if (!error) {
            // `url`   → persistent Storage URL (catalog books)
            // `image` → base64 data URL (imported books / storage fallback)
            const imgSrc = data?.url || data?.image;
            if (imgSrc) {
              imageCache.set(cacheKey, imgSrc);
              try {
                const img = new Image();
                img.src = imgSrc;
                await img.decode().catch(() => {});
              } catch { /* ignore */ }
            }
          }
        } catch (err) {
          console.error(`Failed to preload page ${idx}:`, err);
        }

        tick();
      };

      // Run 3 pages concurrently — enough for speed, won't hammer Pollinations
      const pageTasks = book.pages.map((page, idx) => () => loadPage(page, idx));
      const concurrency = 3;

      for (let i = 0; i < pageTasks.length; i += concurrency) {
        await Promise.all(pageTasks.slice(i, i + concurrency).map(fn => fn()));
      }

      setReady(true);
    };

    preload();
  }, [book]);

  return { progress, ready, imageCache };
}
