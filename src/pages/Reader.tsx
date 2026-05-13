import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { publicDomainBooks } from '@/data/publicDomainBooks';
import { shortStories } from '@/data/shortStories';
import { expandedBooks } from '@/data/expandedBooks';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import QTEOverlay from '@/components/QTEOverlay';
import MazeGame from '@/components/MazeGame';
import ReactionGame from '@/components/ReactionGame';
import PuzzleGame from '@/components/PuzzleGame';
import BookLoadingScreen from '@/components/reader/BookLoadingScreen';
import ReaderPage from '@/components/reader/ReaderPage';
import { useImagePreloader, getImageCache, shouldHaveImage } from '@/hooks/useImagePreloader';

const allBooks = [...books, ...publicDomainBooks, ...shortStories, ...expandedBooks];

const Reader = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { markBookRead } = useApp();

  const book = allBooks.find(b => b.id === bookId) || (() => {
    try {
      const imported = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      return imported.find((b: any) => b.id === bookId) || null;
    } catch { return null; }
  })();

  const { progress, ready } = useImagePreloader(book);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [showQTE, setShowQTE] = useState(false);
  const [qteResults, setQteResults] = useState<Record<number, boolean>>({});

  const page = book?.pages[currentPage];

  // Track current page from scroll position
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !ready) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const pageHeight = container.clientHeight;
        const newPage = Math.round(container.scrollTop / pageHeight);
        setCurrentPage(prev => {
          if (prev !== newPage && newPage >= 0 && newPage < (book?.pages.length || 0)) {
            return newPage;
          }
          return prev;
        });
        ticking = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [ready, book?.pages.length]);

  // QTE trigger
  useEffect(() => {
    if (!ready || !page) return;
    if (page.qte && qteResults[currentPage] === undefined) {
      const timer = setTimeout(() => setShowQTE(true), 800);
      return () => clearTimeout(timer);
    }
  }, [currentPage, page?.qte, qteResults, ready]);

  // Loading / not found
  if (!book) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Book not found.</p>
      </div>
    );
  }

  if (!ready) {
    return <BookLoadingScreen book={book} progress={progress} />;
  }

  const handleQTEComplete = (success: boolean) => {
    setQteResults(prev => {
      const updated = { ...prev, [currentPage]: success };
      const passed = Object.values(updated).filter(Boolean).length;
      const total = Object.values(updated).length;
      localStorage.setItem(`bookquest-qte-${book.id}`, JSON.stringify({ passed, total }));
      return updated;
    });
    setShowQTE(false);
  };

  const handleFinish = () => {
    markBookRead(book.id);
    navigate(`/quiz/${book.id}`);
  };

  const handleExit = () => {
    navigate(-1);
  };

  const cache = getImageCache();
  const progressPercent = ((currentPage + 1) / book.pages.length) * 100;

  return (
    <div className="h-dvh bg-background flex flex-col relative select-none overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-3 bg-background/80 backdrop-blur-md border-b border-border safe-area-top z-30 flex-shrink-0">
        <button
          onClick={handleExit}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="Exit book"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate text-foreground">{book.title}</h2>
          <p className="text-xs text-muted-foreground">
            Page {currentPage + 1} of {book.pages.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted flex-shrink-0 z-20">
        <motion.div className="h-full bg-primary" animate={{ width: `${progressPercent}%` }} />
      </div>

      {/* Snap-scroll pages container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {book.pages.map((p: any, i: number) => {
          const cacheKey = `${book.id}:${i}`;
          const pageHasImage = shouldHaveImage(book.difficulty, i);
          const cachedImage = pageHasImage ? (cache.get(cacheKey) || null) : null;

          return (
            <ReaderPage
              key={i}
              page={p}
              pageIndex={i}
              book={book}
              cachedImage={cachedImage}
              qteResult={qteResults[i]}
              isLastPage={i === book.pages.length - 1}
              onFinish={handleFinish}
            />
          );
        })}
      </div>

      {/* Scroll hint on first page */}
      {currentPage === 0 && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground flex flex-col items-center gap-1 z-20"
        >
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            ↓
          </motion.span>
          Swipe up for next page
        </motion.div>
      )}

      {/* QTE / Maze Overlay */}
      {showQTE && page?.qte && (
        page.qte.type === 'maze' ? (
          <MazeGame prompt={page.qte.prompt} timeLimit={page.qte.timeLimit} onComplete={handleQTEComplete} successText={page.qte.successText} failText={page.qte.failText} difficulty={book.difficulty} />
        ) : page.qte.type === 'reaction' ? (
          <ReactionGame prompt={page.qte.prompt} timeLimit={page.qte.timeLimit} onComplete={handleQTEComplete} successText={page.qte.successText} failText={page.qte.failText} />
        ) : page.qte.type === 'puzzle' ? (
          <PuzzleGame prompt={page.qte.prompt} timeLimit={page.qte.timeLimit} onComplete={handleQTEComplete} successText={page.qte.successText} failText={page.qte.failText} />
        ) : (
          <QTEOverlay qte={page.qte} onComplete={handleQTEComplete} />
        )
      )}
    </div>
  );
};

export default Reader;
