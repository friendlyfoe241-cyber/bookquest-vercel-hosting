import { useState, useMemo, useRef, useEffect } from 'react';
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
import { Heart, X, Sparkles, Search, ThumbsDown, Clock, Check } from 'lucide-react';
import { useDiscoveryFeed } from '@/hooks/useDiscoveryFeed';
import { filterBooksByAge } from '@/utils/ageClassification';
import { useToast } from '@/hooks/use-toast';

/** Get books with smart prioritization: unread > read, then by genre preference */
function getRandomBooks(
  allBooks: Book[],
  likedBooks: string[],
  dislikedBooks: string[],
  likedGenres: string[],
  readBooks: string[],
  seed: number,
  count: number = 5
): Book[] {
  // Allow reappearance if preferences change, but exclude books already actively disliked
  const unseen = allBooks.filter(b => !dislikedBooks.includes(b.id));
  if (unseen.length === 0) return [];

  const shuffle = (arr: Book[], s: number) => {
    const c = [...arr];
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.abs((s * (i + 1) * 2654435761) % (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  };

  // Prioritize unread books first
  const unreadPref = unseen.filter(b => !readBooks.includes(b.id) && likedGenres.includes(b.genre));
  const unreadDisc = unseen.filter(b => !readBooks.includes(b.id) && !likedGenres.includes(b.genre));
  const readPref = unseen.filter(b => readBooks.includes(b.id) && likedGenres.includes(b.genre));
  const readDisc = unseen.filter(b => readBooks.includes(b.id) && !likedGenres.includes(b.genre));

  const sp = shuffle(unreadPref, seed);
  const sd = shuffle(unreadDisc, seed + 1);
  const rp = shuffle(readPref, seed + 4);
  const rd = shuffle(readDisc, seed + 5);

  const pc = likedGenres.length > 0 ? Math.min(Math.round(count * 0.7), sp.length) : 0;
  const dc = Math.min(count - pc, sd.length);
  const result = [...sp.slice(0, pc), ...sd.slice(0, dc)];

  // Fill remaining slots from read books if needed
  if (result.length < count) {
    const rpc = likedGenres.length > 0 ? Math.min(Math.round((count - result.length) * 0.7), rp.length) : 0;
    const rdc = Math.min(count - result.length - rpc, rd.length);
    result.push(...rp.slice(0, rpc), ...rd.slice(0, rdc));
  }

  if (result.length < count) {
    const rem = unseen.filter(b => !result.includes(b));
    result.push(...shuffle(rem, seed + 2).slice(0, count - result.length));
  }

  return shuffle(result, seed + 3).slice(0, count);
}

const Discovery = () => {
  const { progress, settings, likeBook, dislikeBook } = useApp();
  const { toast } = useToast();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [swipedIds, setSwipedIds] = useState<string[]>([]);
  const [pendingLikeBook, setPendingLikeBook] = useState<Book | null>(null);
  const [allDiscoveryBooks, setAllDiscoveryBooks] = useState<Book[]>([]);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { feedBookIds, isLoggedIn, isLoading, getNextRefreshTime } = useDiscoveryFeed();

  // Session-based seed: new random set each time the component mounts (login/refresh)
  const sessionSeed = useRef(Math.floor(Math.random() * 1000000));
  // Counter for generating more books
  const bookBatchCounter = useRef(0);

  const allBooks = useMemo(() => filterBooksByAge([...books, ...publicDomainBooks, ...shortStories, ...expandedBooks], settings.ageGroup), [settings.ageGroup]);

  const likedGenres = [...new Set(
    allBooks.filter(b => progress.likedBooks.includes(b.id)).map(b => b.genre)
  )];

  // Initialize and manage unlimited discovery books
  useEffect(() => {
    const readBooks = progress.likedBooks.concat(progress.dislikedBooks).concat(swipedIds);
    const initialBooks = getRandomBooks(allBooks, progress.likedBooks, progress.dislikedBooks, likedGenres, readBooks, sessionSeed.current, 5);
    setAllDiscoveryBooks(initialBooks);
  }, []);

  // Generate more books when reaching the end
  const generateMoreBooks = () => {
    const readBooks = progress.likedBooks.concat(progress.dislikedBooks).concat(swipedIds);
    const newBatch = getRandomBooks(
      allBooks,
      progress.likedBooks,
      progress.dislikedBooks,
      likedGenres,
      readBooks,
      sessionSeed.current + bookBatchCounter.current,
      5
    );
    bookBatchCounter.current++;
    setAllDiscoveryBooks(prev => [...prev, ...newBatch]);
  };

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return allDiscoveryBooks.filter(b =>
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
  }, [searchQuery, swipedIds, allDiscoveryBooks, progress.likedBooks, progress.dislikedBooks]);

  // Check if we need to generate more books
  useEffect(() => {
    if (!searchQuery.trim() && filteredBooks.length <= 2 && allDiscoveryBooks.length > 0) {
      generateMoreBooks();
    }
  }, [filteredBooks.length, searchQuery, allDiscoveryBooks.length]);

  const isSearchMode = searchQuery.trim().length > 0;

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (pendingLikeBook) {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setPendingLikeBook(null);
        toastTimeoutRef.current = null;
      }, 4000);
    }
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [pendingLikeBook]);

  const handleSwipe = (book: Book, direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Show like confirmation toast
      setPendingLikeBook(book);
    } else {
      // Dislike immediately
      dislikeBook(book.id);
      setSwipedIds(prev => [...prev, book.id]);
    }
  };

  const confirmLike = (book: Book) => {
    likeBook(book.id);
    setSwipedIds(prev => [...prev, book.id]);
    setPendingLikeBook(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };

  const openBook = (book: Book) => {
    likeBook(book.id);
    setPendingLikeBook(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    navigate(`/read/${book.id}`);
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
    // Check if truly exhausted (all books have been seen/disliked)
    const allSeenOrDisliked = allDiscoveryBooks.length === 0 || 
      allDiscoveryBooks.every(b => progress.likedBooks.includes(b.id) || progress.dislikedBooks.includes(b.id) || swipedIds.includes(b.id));
    
    if (allSeenOrDisliked && !isSearchMode) {
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
          <h2 className="font-display text-3xl mb-2">How did you finish all the books :-:</h2>
          <p className="text-muted-foreground mb-4 text-center">
            More coming soon though.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/foryou')} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity">
              My Books →
            </button>
            <button onClick={() => navigate('/browse')} className="bg-muted text-foreground px-5 py-2.5 rounded-2xl font-semibold hover:bg-accent transition-colors">
              Browse
            </button>
          </div>
        </div>
      );
    }

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
        <h2 className="font-display text-3xl mb-2">No books found</h2>
        <p className="text-muted-foreground mb-4 text-center">
          Try adjusting your search or filters.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setSearchQuery('')} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity">
            Clear Search
          </button>
          <button onClick={() => navigate('/browse')} className="bg-muted text-foreground px-5 py-2.5 rounded-2xl font-semibold hover:bg-accent transition-colors">
            Browse
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

      {/* Like confirmation toast */}
      {pendingLikeBook && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-20 left-4 right-4 z-50 bg-primary text-primary-foreground rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-sm">Added to liked! Open and read?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openBook(pendingLikeBook)}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Open
              </button>
              <button
                onClick={() => confirmLike(pendingLikeBook)}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <h2 className="font-display text-2xl mb-1 mt-12">Your Picks</h2>
      <p className="text-muted-foreground mb-1 text-sm">Swipe right to like, left to pass</p>

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

      <p className="text-xs text-muted-foreground mt-4">{filteredBooks.length} books to explore</p>
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
