import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BookRatings {
  [bookId: string]: { avg: number; count: number };
}

let cachedRatings: BookRatings | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

export function useBookRatings() {
  const [ratings, setRatings] = useState<BookRatings>(cachedRatings ?? {});
  const [loading, setLoading] = useState(!cachedRatings);

  useEffect(() => {
    if (cachedRatings && Date.now() - cacheTime < CACHE_TTL) {
      setRatings(cachedRatings);
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from('book_reviews')
        .select('book_id, rating');

      if (data) {
        const map: BookRatings = {};
        data.forEach(r => {
          if (!map[r.book_id]) map[r.book_id] = { avg: 0, count: 0 };
          map[r.book_id].count++;
          map[r.book_id].avg += r.rating;
        });
        Object.keys(map).forEach(k => {
          map[k].avg = map[k].avg / map[k].count;
        });
        cachedRatings = map;
        cacheTime = Date.now();
        setRatings(map);
      }
      setLoading(false);
    };

    load();
  }, []);

  return { ratings, loading };
}
