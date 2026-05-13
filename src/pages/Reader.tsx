import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { bookCovers } from '@/data/bookCovers';
import { pageIllustrations } from '@/data/pageIllustrations';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import QTEOverlay from '@/components/QTEOverlay';
import MazeGame from '@/components/MazeGame';
import ReactionGame from '@/components/ReactionGame';
import PuzzleGame from '@/components/PuzzleGame';

const Reader = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { markBookRead } = useApp();

  // Support both catalog and imported books
  const book = books.find(b => b.id === bookId) || (() => {
    try {
      const imported = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      return imported.find((b: any) => b.id === bookId) || null;
    } catch { return null; }
  })();
  const [currentPage, setCurrentPage] = useState(0);
  const [showQTE, setShowQTE] = useState(false);
  const [qteResults, setQteResults] = useState<Record<number, boolean>>({});
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showHeader, setShowHeader] = useState(true);

  const page = book?.pages[currentPage];
  const isLastPage = book ? currentPage === book.pages.length - 1 : false;

  useEffect(() => {
    if (page?.qte && qteResults[currentPage] === undefined) {
      const timer = setTimeout(() => setShowQTE(true), 800);
      return () => clearTimeout(timer);
    }
  }, [currentPage, page?.qte, qteResults]);

  const goNext = useCallback(() => {
    if (!book || currentPage >= book.pages.length - 1) return;
    setDirection(1);
    setCurrentPage(p => p + 1);
  }, [book, currentPage]);

  const goPrev = useCallback(() => {
    if (currentPage <= 0) return;
    setDirection(-1);
    setCurrentPage(p => p - 1);
  }, [currentPage]);

  // Scroll-based page navigation
  useEffect(() => {
    let cooldown = false;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cooldown || showQTE) return;
      cooldown = true;
      if (e.deltaY > 30) goNext();
      else if (e.deltaY < -30) goPrev();
      setTimeout(() => { cooldown = false; }, 500);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const handleTouchEnd = (e: TouchEvent) => {
      if (showQTE) return;
      const dy = touchStartY - e.changedTouches[0].clientY;
      if (dy > 50) goNext();
      else if (dy < -50) goPrev();
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goNext, goPrev, showQTE]);

  // Auto-hide header after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHeader(false), 3000);
    return () => clearTimeout(timer);
  }, [currentPage]);

  if (!book || !page) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <p>Book not found.</p>
      </div>
    );
  }

  const handleQTEComplete = (success: boolean) => {
    setQteResults(prev => ({ ...prev, [currentPage]: success }));
    setShowQTE(false);
  };

  const handleFinish = () => {
    markBookRead(book.id);
    navigate(`/quiz/${book.id}`);
  };

  const getPageImage = () => {
    const bookPages = pageIllustrations[book.id];
    if (bookPages && bookPages[currentPage]) return bookPages[currentPage];
    if (bookCovers[book.id]) return bookCovers[book.id];
    return null;
  };

  const pageImage = getPageImage();

  const variants = {
    enter: (d: number) => ({ opacity: 0, y: d > 0 ? 80 : -80 }),
    center: { opacity: 1, y: 0 },
    exit: (d: number) => ({ opacity: 0, y: d > 0 ? -80 : 80 }),
  };

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden relative" onClick={() => setShowHeader(h => !h)}>
      {/* Floating Header */}
      <AnimatePresence>
        {showHeader && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 p-3 bg-background/80 backdrop-blur-md border-b border-border safe-area-top"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm truncate">{book.title}</h2>
              <p className="text-xs text-muted-foreground">Page {currentPage + 1} of {book.pages.length}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar - always visible */}
      <div className="h-1 bg-muted flex-shrink-0 z-20">
        <motion.div className="h-full bg-primary" animate={{ width: `${((currentPage + 1) / book.pages.length) * 100}%` }} />
      </div>

      {/* Page content - fullscreen */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:px-8 w-full max-w-2xl mx-auto"
          >
            {pageImage ? (
              <img
                src={pageImage}
                alt={page.imageDescription}
                className="w-full max-h-[45vh] sm:max-h-[50vh] rounded-2xl object-cover mb-4 shadow-lg flex-shrink-0"
              />
            ) : (
              <div className={`w-full max-h-[45vh] sm:max-h-[50vh] aspect-square rounded-2xl bg-gradient-to-br ${book.coverColor} mb-4 flex items-center justify-center shadow-lg flex-shrink-0`}>
                <span className="text-6xl sm:text-7xl">{book.coverEmoji}</span>
              </div>
            )}

            <p className="text-base sm:text-lg leading-relaxed text-center font-medium px-2">{page.text}</p>

            {page.qte && qteResults[currentPage] !== undefined && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${qteResults[currentPage] ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
              >
                {page.qte.type === 'maze'
                  ? (qteResults[currentPage] ? '🏆 Maze Solved!' : '🏆 Maze Attempted')
                  : (qteResults[currentPage] ? '⚡ QTE Passed!' : '⚡ QTE Attempted')}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls - always visible */}
      <div className="flex-shrink-0 p-3 sm:p-4 flex gap-3 justify-center bg-background/80 backdrop-blur-md border-t border-border safe-area-bottom z-20" onClick={e => e.stopPropagation()}>
        {currentPage > 0 && (
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={goPrev}>← Back</Button>
        )}
        {isLastPage ? (
          <Button size="sm" className="rounded-2xl px-6" onClick={handleFinish}>Finish & Quiz 🎯</Button>
        ) : (
          <Button size="sm" className="rounded-2xl px-6" onClick={goNext}>
            Next <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* QTE / Maze Overlay */}
      {showQTE && page.qte && (
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
