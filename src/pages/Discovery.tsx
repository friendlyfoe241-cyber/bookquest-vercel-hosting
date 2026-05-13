import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { publicDomainBooks } from '@/data/publicDomainBooks';
import { shortStories } from '@/data/shortStories';
import { expandedBooks } from '@/data/expandedBooks';
import { bookCovers } from '@/data/bookCovers';
import { Book } from '@/types/book';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Heart, X, Sparkles, Search, ThumbsDown, Clock } from 'lucide-react';
import { useDiscoveryFeed } from '@/hooks/useDiscoveryFeed';
import { filterBooksByAge } from '@/utils/ageClassification';

/** Pick exactly 5 random books using a session seed */
function getRandomBooks(
  allBooks: Book[],
  likedBooks: string[],
  dislikedBooks: string[],
  likedGenres: string[],
  seed: number
): Book[] {
  const unseen = allBooks.filter(b => !likedBooks.includes(b.id) && !dislikedBooks.includes(b.id));
  if (unseen.length === 0) return [];

  const shuffle = (arr: Book[], s: number) => {
    const c = [...arr];
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.abs((s * (i + 1) * 2654435761) % (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  };

  const pref = unseen.filter(b => likedGenres.includes(b.genre));
  const disc = unseen.filter(b => !likedGenres.includes(b.genre));
  const sp = shuffle(pref, seed), sd = shuffle(disc, seed + 1);
  const pc = likedGenres.length > 0 ? Math.min(Math.round(5 * 0.7), sp.length) : 0;
  const dc = Math.min(5 - pc, sd.length);
  const fpc = Math.min(5 - dc, sp.length);
  const daily = [...sp.slice(0, fpc), ...sd.slice(0, dc)].slice(0, 5);
  if (daily.length < 5) {
    const rem = unseen.filter(b => !daily.includes(b));
    daily.push(...shuffle(rem, seed + 2).slice(0, 5 - daily.length));
  }
  return shuffle(daily, seed + 3).slice(0, 5);
}

const Discovery = () => {
  const { progress, settings, likeBook, dislikeBook } = useApp();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [swipedIds, setSwipedIds] = useState<string[]>([]);
  const { feedBookIds, isLoggedIn, isLoading, getNextRefreshTime } = useDiscoveryFeed();

  // Session-based seed: new random set each time the component mounts (login/refresh)
  const sessionSeed = useRef(Math.floor(Math.random() * 1000000));
  // Lock the initial liked/disliked lists at mount time so dailyBooks doesn't recompute on swipe
  const initialLiked = useRef(progress.likedBooks);
  const initialDisliked = useRef(progress.dislikedBooks);

  const allBooks = useMemo(() => filterBooksByAge([...books, ...publicDomainBooks, ...shortStories, ...expandedBooks], settings.ageGroup), [settings.ageGroup]);

  const likedGenres = [...new Set(
    allBooks.filter(b => initialLiked.current.includes(b.id)).map(b => b.genre)
  )];

  const dailyBooks = useMemo(() => {
    // Try server-side feed first, always fall back to local random selection
    if (isLoggedIn && feedBookIds.length > 0) {
      const mapped = feedBookIds
        .map(id => allBooks.find(b => b.id === id))
        .filter((b): b is Book => !!b);
      if (mapped.length > 0) return mapped.slice(0, 5);
    }
    return getRandomBooks(allBooks, initialLiked.current, initialDisliked.current, likedGenres, sessionSeed.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, feedBookIds, allBooks]);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return dailyBooks.filter(b =>
        !swipedIds.includes(b.id) &&
        !progress.likedBooks.includes(b.id) &&
        !progress.dislikedBooks.includes(b.id)
      );
    }
    const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return books.filter(book => {
      const searchable = `${book.title} ${book.genre} ${book.summary}`.toLowerCase();
      return words.every(w => searchable.includes(w));
    });
  }, [searchQuery, swipedIds, dailyBooks, progress.likedBooks, progress.dislikedBooks]);

  const isSearchMode = searchQuery.trim().length > 0;

  const handleSwipe = (book: Book, direction: 'left' | 'right') => {
    if (direction === 'right') likeBook(book.id);
    else dislikeBook(book.id);
    setSwipedIds(prev => [...prev, book.id]);
  };

  const getBookStatus = (bookId: string) => {
    if (progress.likedBooks.includes(bookId)) return 'liked';
    if (progress.dislikedBooks.includes(bookId)) return 'disliked';
    return null;
  };

  const refreshLabel = isLoggedIn ? getNextRefreshTime() : (() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  })();

  if (isSearchMode) {
    return (
      <div className="min-h-screen flex flex-col p-4 bg-background">
        <h2 className="font-display text-2xl mb-4">Discover Books</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search all books..." className="pl-10 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filteredBooks.map(book => {
            const status = getBookStatus(book.id);
            const cover = bookCovers[book.id];
            return (
              <motion.div key={book.id} className={`rounded-2xl overflow-hidden shadow-md relative cursor-pointer ${status === 'disliked' ? 'opacity-60' : ''}`}
                whileTap={{ scale: 0.97 }} onClick={() => navigate(`/read/${book.id}`)}>
                {cover ? (
                  <img src={cover} alt={book.title} className="w-full aspect-[3/4] object-cover" />
                ) : (
                  <div className={`w-full aspect-[3/4] bg-gradient-to-br ${book.coverColor} flex items-center justify-center`}>
                    <span className="text-5xl">{book.coverEmoji}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 p-3 text-white">
                  <h3 className="font-display text-sm mb-1">{book.title}</h3>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px]">{book.genre}</Badge>
                    {status === 'liked' && <Heart className="w-3 h-3 text-red-400 fill-red-400" />}
                    {status === 'disliked' && <ThumbsDown className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {filteredBooks.length === 0 && <p className="text-center text-muted-foreground mt-8">No books found</p>}
      </div>
    );
  }

  if (isLoggedIn && isLoading && feedBookIds.length === 0) {
    // Only show loading for a brief moment; local books always available as fallback
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <Sparkles className="w-12 h-12 text-primary animate-pulse mb-4" />
        <p className="text-muted-foreground">Loading your picks...</p>
      </div>
    );
  }

  if (filteredBooks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <div className="absolute top-4 left-4 right-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search all books..." className="pl-10 rounded-2xl" />
          </div>
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Sparkles className="w-16 h-16 text-primary mb-4 mx-auto" />
        </motion.div>
        <h2 className="font-display text-3xl mb-2">{isLoggedIn ? "This Hour's Done!" : "All Done!"}</h2>
        <p className="text-muted-foreground mb-4 text-center">
          {isLoggedIn
            ? "You've seen this hour's picks. New books are curated for you every hour!"
            : "You've seen all picks! Check your liked books or browse the library."}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Clock className="w-4 h-4" />
          <span>New books in {refreshLabel}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/foryou')} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity">
            My Books →
          </button>
          <button onClick={() => navigate('/library')} className="bg-muted text-foreground px-5 py-2.5 rounded-2xl font-semibold hover:bg-accent transition-colors">
            Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-4 left-4 right-4 z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search all books..." className="pl-10 rounded-2xl" />
        </div>
      </div>

      <h2 className="font-display text-2xl mb-1 mt-12">Your Picks</h2>
      <p className="text-muted-foreground mb-1 text-sm">Swipe right to like, left to pass</p>
      {isLoggedIn && (
        <p className="text-xs text-muted-foreground/70 mb-4 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Refreshes in {refreshLabel}
        </p>
      )}

      <div className="relative w-72 h-96">
        <AnimatePresence>
          {filteredBooks.slice(0, 3).map((book, i) => (
            <SwipeCard key={book.id} book={book} index={i} onSwipe={(dir) => handleSwipe(book, dir)} isTop={i === 0} />
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-6 mt-6">
        <button onClick={() => filteredBooks[0] && handleSwipe(filteredBooks[0], 'left')}
          className="w-14 h-14 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors">
          <X className="w-6 h-6 text-destructive" />
        </button>
        <button onClick={() => filteredBooks[0] && handleSwipe(filteredBooks[0], 'right')}
          className="w-14 h-14 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
          <Heart className="w-6 h-6 text-primary" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">{filteredBooks.length} of 5 picks remaining</p>
    </div>
  );
};

function SwipeCard({ book, index, onSwipe, isTop }: { book: Book; index: number; onSwipe: (dir: 'left' | 'right') => void; isTop: boolean }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);
  const cover = bookCovers[book.id];

  return (
    <motion.div className="absolute inset-0" style={{ zIndex: 3 - index }}
      initial={{ scale: 1 - index * 0.05, y: index * 8 }}
      animate={{ scale: 1 - index * 0.05, y: index * 8 }}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.3 } }}>
      <motion.div className="w-full h-full rounded-3xl overflow-hidden p-6 flex flex-col items-center justify-between cursor-grab active:cursor-grabbing shadow-xl relative"
        style={isTop ? { x, rotate } : {}}
        drag={isTop ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={(_, info) => {
          if (info.offset.x > 100) onSwipe('right');
          else if (info.offset.x < -100) onSwipe('left');
        }}>
        {cover ? (
          <img src={cover} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${book.coverColor}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {isTop && (
          <>
            <motion.div className="absolute top-6 right-6 z-10 bg-primary text-primary-foreground px-3 py-1 rounded-xl font-bold text-sm rotate-12"
              style={{ opacity: likeOpacity }}>LIKE ❤️</motion.div>
            <motion.div className="absolute top-6 left-6 z-10 bg-destructive text-destructive-foreground px-3 py-1 rounded-xl font-bold text-sm -rotate-12"
              style={{ opacity: passOpacity }}>PASS ✋</motion.div>
          </>
        )}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          {!cover && <span className="text-7xl">{book.coverEmoji}</span>}
        </div>
        <div className="relative z-10 text-center text-white">
          <h3 className="font-display text-2xl mb-1 drop-shadow-md">{book.title}</h3>
          {book.teaser && (
            <p className="text-xs text-white/80 mb-2 px-2 line-clamp-2 drop-shadow">{book.teaser}</p>
          )}
          <div className="flex gap-1.5 justify-center">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">{book.genre}</Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px]">
              {book.difficulty === 'beginner' ? '🌱' : book.difficulty === 'intermediate' ? '🌿' : '🔥'} {book.difficulty}
            </Badge>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Discovery;
