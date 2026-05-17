import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pageIllustrations } from '@/data/pageIllustrations';

// How many pages to load before opening the book
const EAGER_PAGES = 2;

// Module-level cache — persists for the session so re-visiting is instant
const imageCache = new Map<string, string>();

export function getImageCache() {
  return imageCache;
}

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
  const [progress, setProgress]       = useState(0);
  const [ready, setReady]             = useState(false);
  // Increments every time a new image arrives — causes Reader to re-render
  // and pick up the newly cached image for background-loaded pages
  const [loadedCount, setLoadedCount] = useState(0);

  const started  = useRef(false);
  const readySet = useRef(false);

  useEffect(() => {
    if (!book || started.current) return;
    started.current = true;

    const totalPages  = book.pages.length;
    let   eagerLoaded = 0;   // pages loaded so far (for progress bar)
    let   totalLoaded = 0;

    const isImported = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(book.id);

    const loadPage = async (page: Page, idx: number) => {
      const cacheKey = `${book.id}:${idx}`;

      if (imageCache.has(cacheKey)) {
        return; // already cached from a previous visit
      }

      // ── 1. Bundled static image (fast, no network) ───────────────────────
      const staticImage = !isImported
        ? pageIllustrations[book.id]?.[idx]
        : undefined;

      if (staticImage) {
        imageCache.set(cacheKey, staticImage);
        setLoadedCount(c => c + 1);
        return;
      }

      // ── 2. Generate via edge function (Pollinations + Storage cache) ─────
      try {
        const payload: Record<string, unknown> = {
          pageText:         page.text,
          imageDescription: page.imageDescription,
        };
        if (!isImported) {
          payload.bookId     = book.id;
          payload.pageNumber = idx;
        }

        const { data, error } = await supabase.functions.invoke(
          'generate-illustration',
          { body: payload }
        );

        if (!error && data) {
          const imgSrc: string | null = data.url || data.image || null;
          if (imgSrc && typeof imgSrc === 'string' && imgSrc.length > 10) {
            imageCache.set(cacheKey, imgSrc);
            setLoadedCount(c => c + 1); // triggers Reader re-render
          }
        }
      } catch (err) {
        console.warn(`Image generation failed for ${book.id} page ${idx}:`, err);
      }
    };

    const run = async () => {
      // ── Phase 1: load first EAGER_PAGES pages, then open the book ────────
      const eagerPages = book.pages.slice(0, EAGER_PAGES);
      await Promise.all(eagerPages.map((page, idx) => loadPage(page, idx)));

      eagerLoaded = EAGER_PAGES;
      totalLoaded = EAGER_PAGES;
      setProgress(Math.round((eagerLoaded / totalPages) * 100));

      if (!readySet.current) {
        readySet.current = true;
        setReady(true); // ← book opens here, after just 2 pages
      }

      // ── Phase 2: load remaining pages in the background ──────────────────
      // Run 2 at a time so we don't hammer the API
      const remaining = book.pages.slice(EAGER_PAGES);
      const concurrency = 2;

      for (let i = 0; i < remaining.length; i += concurrency) {
        const batch = remaining.slice(i, i + concurrency);
        await Promise.all(
          batch.map((page, batchIdx) => {
            const realIdx = EAGER_PAGES + i + batchIdx;
            return loadPage(page, realIdx).then(() => {
              totalLoaded++;
              setProgress(Math.round((totalLoaded / totalPages) * 100));
            });
          })
        );
      }
    };

    run();
  }, [book]);

  return { progress, ready, loadedCount, imageCache };
}
