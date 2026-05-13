import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface DynamicPageImageProps {
  bookId: string;
  pageNumber: number;
  pageText: string;
  fallbackImage: string | null;
  coverEmoji: string;
  coverColor: string;
  imageDescription?: string;
}

// In-memory cache keyed by bookId:pageNumber
const imageCache = new Map<string, string>();

const DynamicPageImage = ({
  bookId,
  pageNumber,
  pageText,
  fallbackImage,
  coverEmoji,
  coverColor,
  imageDescription,
}: DynamicPageImageProps) => {
  const cacheKey = `${bookId}:${pageNumber}`;
  const [imageUrl, setImageUrl] = useState<string | null>(imageCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(!imageCache.has(cacheKey));
  const [error, setError] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (imageCache.has(cacheKey)) {
      setImageUrl(imageCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    if (requested.current) return;
    requested.current = true;

    const generate = async () => {
      try {
        setLoading(true);
        setError(false);

        const { data, error: fnError } = await supabase.functions.invoke('generate-illustration', {
          body: { pageText, bookId, pageNumber },
        });

        if (fnError || !data?.image) {
          throw new Error(fnError?.message || 'No image returned');
        }

        imageCache.set(cacheKey, data.image);
        setImageUrl(data.image);
      } catch (err) {
        console.error('Dynamic image generation failed:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [cacheKey, pageText, bookId, pageNumber]);

  if (loading) {
    return (
      <div className="w-full max-h-[45vh] sm:max-h-[50vh] aspect-video rounded-2xl overflow-hidden mb-4 shadow-lg flex-shrink-0">
        <Skeleton className="w-full h-full" />
        <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          ✨ Generating illustration...
        </p>
      </div>
    );
  }

  if (error || !imageUrl) {
    // Fallback: use static image or emoji
    if (fallbackImage) {
      return (
        <img
          src={fallbackImage}
          alt={imageDescription || 'Page illustration'}
          className="w-full max-h-[45vh] sm:max-h-[50vh] rounded-2xl object-cover mb-4 shadow-lg flex-shrink-0"
        />
      );
    }
    return (
      <div className={`w-full max-h-[45vh] sm:max-h-[50vh] aspect-square rounded-2xl bg-gradient-to-br ${coverColor} mb-4 flex items-center justify-center shadow-lg flex-shrink-0`}>
        <span className="text-6xl sm:text-7xl">{coverEmoji}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={imageDescription || 'AI-generated illustration'}
      className="w-full max-h-[45vh] sm:max-h-[50vh] rounded-2xl object-cover mb-4 shadow-lg flex-shrink-0"
    />
  );
};

export default DynamicPageImage;
