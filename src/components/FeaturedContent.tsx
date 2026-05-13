import { useMemo } from 'react';
import { Book } from '@/types/book';
import { books } from '@/data/books';
import { publicDomainBooks } from '@/data/publicDomainBooks';
import { shortStories } from '@/data/shortStories';
import { bookCovers } from '@/data/bookCovers';
import { motion } from 'framer-motion';
import { Sparkles, Clock, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { forYouBooksForAge } from '@/utils/ageClassification';

interface FeaturedContentProps {
  onBookSelect: (book: Book) => void;
}

/** Deterministic weekly rotation based on current date */
function getWeeklyFeatured(allBooks: Book[], count: number): Book[] {
  const now = new Date();
  const weekNumber = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const seed = now.getFullYear() * 100 + weekNumber;
  
  const shuffled = [...allBooks];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.abs((seed * (i + 1) * 2654435761) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const FeaturedContent = ({ onBookSelect }: FeaturedContentProps) => {
  const { settings } = useApp();
  const allBooks = useMemo(() => forYouBooksForAge([...books, ...publicDomainBooks, ...shortStories], settings.ageGroup), [settings.ageGroup]);
  
  const featured = useMemo(() => getWeeklyFeatured(allBooks, 3), [allBooks]);
  const classics = useMemo(() => forYouBooksForAge(publicDomainBooks, settings.ageGroup).slice(0, 4), [settings.ageGroup]);
  const stories = useMemo(() => {
    return getWeeklyFeatured(forYouBooksForAge(shortStories, settings.ageGroup), 3);
  }, [settings.ageGroup]);

  const getDifficultyBadge = (d: string) => {
    if (d === 'beginner') return { label: '🌱 Beginner', cls: 'bg-green-500/20 text-green-400' };
    if (d === 'intermediate') return { label: '🌿 Medium', cls: 'bg-yellow-500/20 text-yellow-400' };
    return { label: '🔥 Expert', cls: 'bg-red-500/20 text-red-400' };
  };

  const BookCard = ({ book, index }: { book: Book; index: number }) => {
    const badge = getDifficultyBadge(book.difficulty);
    const cover = bookCovers[book.id];
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        onClick={() => onBookSelect(book)}
        className="flex-shrink-0 w-40 cursor-pointer group"
      >
        <div className={`w-full aspect-[3/4] rounded-2xl bg-gradient-to-br ${book.coverColor} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden relative`}>
          {cover ? (
            <img src={cover} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl">{book.coverEmoji}</span>
          )}
          {book.isPublicDomain && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-amber-500/90 text-white text-[10px] px-1.5 py-0.5">Classic</Badge>
            </div>
          )}
        </div>
        <p className="mt-2 text-sm font-semibold truncate">{book.title}</p>
        {book.author && <p className="text-xs text-muted-foreground truncate">{book.author}</p>}
        <div className="flex items-center gap-1 mt-1">
          <Badge className={`${badge.cls} text-[10px] px-1.5 py-0`}>{badge.label}</Badge>
          {book.estimatedReadingTime && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{book.estimatedReadingTime}m
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Weekly Featured */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Featured This Week</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {featured.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
        </div>
      </div>

      {/* Classic Literature */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm">Classic Literature</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {classics.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
        </div>
      </div>

      {/* Original Stories */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <h3 className="font-bold text-sm">Original Stories</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {stories.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
        </div>
      </div>
    </div>
  );
};

export default FeaturedContent;
