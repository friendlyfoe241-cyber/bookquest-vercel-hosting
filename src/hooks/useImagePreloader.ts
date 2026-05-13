import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { bookCovers } from '@/data/bookCovers';
import { pageIllustrations } from '@/data/pageIllustrations';

// Shared image cache across Reader sessions
const imageCache = new Map<string, string>();

export function getImageCache() {
  return imageCache;
}

// Expert: page 0, then every 3 (0,3,6,9,...)
// Beginner/Intermediate: every page
export function shouldHaveImage(difficulty: string, pageIndex: number): boolean {
  return true; // every page for all difficulty levels
}

interface Book {
  id: string;
  difficulty: string;
  coverEmoji: string;
  coverColor: string;
  pages: { text: string; imageDescription?: string; qte?: any }[];
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

      const promises = book.pages.map(async (page, idx) => {
        const cacheKey = `${book.id}:${idx}`;

        if (imageCache.has(cacheKey)) {
          tick();
          return;
        }

        // Check static illustrations first
        const staticIlls = pageIllustrations[book.id];
        if (staticIlls && staticIlls[idx]) {
          imageCache.set(cacheKey, staticIlls[idx]);
          try {
            const img = new Image();
            img.src = staticIlls[idx];
            await img.decode().catch(() => {});
          } catch {}
          tick();
          return;
        }

        // Check if this page should have an image based on difficulty
        if (!shouldHaveImage(book.difficulty, idx)) {
          // No image needed for this page
          tick();
          return;
        }

        // Generate via Pollinations for ALL difficulty levels
        try {
          const { data, error } = await supabase.functions.invoke('generate-illustration', {
            body: { pageText: page.text, bookId: book.id, pageNumber: idx },
          });
          if (!error && data?.image) {
            imageCache.set(cacheKey, data.image);
            try {
              const img = new Image();
              img.src = data.image;
              await img.decode().catch(() => {});
            } catch {}
          }
        } catch (err) {
          console.error(`Failed to preload page ${idx}:`, err);
        }
        tick();
      });

      // Run 3 at a time
      const concurrency = 3;
      for (let i = 0; i < promises.length; i += concurrency) {
        await Promise.all(promises.slice(i, i + concurrency));
      }

      setReady(true);
    };

    preload();
  }, [book]);

  return { progress, ready, imageCache };
}
