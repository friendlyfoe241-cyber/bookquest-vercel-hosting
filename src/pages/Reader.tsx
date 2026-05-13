import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { publicDomainBooks } from '@/data/publicDomainBooks';
import { shortStories } from '@/data/shortStories';
import { expandedBooks } from '@/data/expandedBooks';
import { classicOriginalBooks } from '@/data/classicOriginalBooks';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import QTEOverlay from '@/components/QTEOverlay';
import MazeGame from '@/components/MazeGame';
import ReactionGame from '@/components/ReactionGame';
import PuzzleGame from '@/components/PuzzleGame';
import DynamicPageImage, { getImageFromCache, preloadImage } from '@/components/DynamicPageImage';
import BookLoadingScreen from '@/components/reader/BookLoadingScreen';

const allBooks = [...books, ...publicDomainBooks, ...shortStories, ...expandedBooks, ...classicOriginalBooks];

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

  const [currentPage, setCurrentPage] = useState(0);
  const [showQTE, setShowQTE] = useState(false);
  const [qteResults, setQteResults] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const page = book?.pages[currentPage];
  const isLastPage = book ? currentPage === book.pages.length - 1 : false;

  // Pre-load all images on mount
  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    const total = book.pages.length;
    let loaded = 0;

    const loadAll = async () => {
      // Only wait for first 3 pages, then show the book
      const initialCount = Math.min(3, total);
      const initialPromises = book.pages.slice(0, initialCount).map(async (p: any, idx: number) => {
        try {
          await preloadImage(book.id, idx, p.text, p.imageDescription);
        } catch {}
        loaded++;
        if (!cancelled) setLoadProgress(Math.round((loaded / total) * 100));
      });
      await Promise.all(initialPromises);
      if (!cancelled) {
        setTimeout(() => setIsLoading(false), 300);
      }

      // Continue preloading remaining pages in background
      for (let idx = initialCount; idx < total; idx++) {
        if (cancelled) break;
        const p = book.pages[idx];
        try {
          await preloadImage(book.id, idx, p.text, p.imageDescription);
        } catch {}
        loaded++;
        if (!cancelled) setLoadProgress(Math.round((loaded / total) * 100));
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, [book]);

  // QTE trigger with reading-speed-based delay
  useEffect(() => {
    if (isLoading) return;
    if (page?.qte && qteResults[currentPage] === undefined) {
      const wordCount = page.text.split(/\s+/).length;
      const baseDelay = Math.min(20000, Math.max(3000, wordCount * 300));
      const delay = page.qte.type === 'choice' ? baseDelay : Math.max(2000, baseDelay * 0.5);
      const timer = setTimeout(() => setShowQTE(true), delay);
      return () => clearTimeout(timer);
    }
  }, [currentPage, page?.qte, qteResults, isLoading]);

  const handleQTEComplete = (success: boolean) => {
    setQteResults(prev => {
      const updated = { ...prev, [currentPage]: success };
      const passed = Object.values(updated).filter(Boolean).length;
      const total = Object.values(updated).length;
      localStorage.setItem(`bookquest-qte-${book!.id}`, JSON.stringify({ passed, total }));
      return updated;
    });
    setShowQTE(false);
  };

  const handleFinish = () => {
    markBookRead(book!.id);
    navigate(`/quiz/${book!.id}`);
  };

  const handleExit = () => {
    navigate(-1);
  };

  // Snap-scroll page tracking
  useEffect(() => {
    if (!book || isLoading) return;
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const pageHeight = window.innerHeight;
      const scrollTop = container.scrollTop;
      const newPage = Math.round(scrollTop / pageHeight);
      setCurrentPage(Math.min(newPage, book.pages.length - 1));
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [book, isLoading]);

  if (!book) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Book not found.</p>
      </div>
    );
  }

  if (isLoading) {
    return <BookLoadingScreen book={book} progress={loadProgress} />;
  }

  return (
    <div className="h-dvh w-full bg-background relative overflow-hidden">
      {/* Fixed top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 p-3">
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
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentPage + 1) / book.pages.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Vertical snap-scroll container */}
      <div
        ref={containerRef}
        className="h-dvh w-full overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {book.pages.map((p: any, idx: number) => (
          <ReaderPage
            key={idx}
            page={p}
            pageIndex={idx}
            book={book}
            isLastPage={idx === book.pages.length - 1}
            qteResult={qteResults[idx]}
            onFinish={handleFinish}
            currentPage={currentPage}
          />
        ))}
      </div>

      {/* Scroll hint on first page */}
      {currentPage === 0 && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground flex flex-col items-center gap-1 z-20 pointer-events-none"
        >
          <motion.span animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            ↓
          </motion.span>
          Swipe up to turn pages
        </motion.div>
      )}

      {/* QTE / game overlays */}
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

/* ─── Individual Page ─── */

interface ReaderPageProps {
  page: { text: string; imageDescription?: string; qte?: any };
  pageIndex: number;
  book: any;
  isLastPage: boolean;
  qteResult?: boolean;
  onFinish: () => void;
  currentPage: number;
}

const ReaderPage = ({ page, pageIndex, book, isLastPage, qteResult, onFinish, currentPage }: ReaderPageProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(18);
  const isVisible = Math.abs(pageIndex - currentPage) <= 1;

  // Auto-shrink text to fit within the available space
  useLayoutEffect(() => {
    const content = contentRef.current;
    const textEl = textRef.current;
    if (!content || !textEl) return;

    // Reset to max size first
    let size = 20;
    const minSize = 11;

    const fit = () => {
      textEl.style.fontSize = `${size}px`;
      textEl.style.lineHeight = `${size <= 13 ? 1.35 : size <= 15 ? 1.45 : 1.6}`;

      // Check if content overflows the container
      if (content.scrollHeight > content.clientHeight && size > minSize) {
        size -= 0.5;
        requestAnimationFrame(fit);
      } else {
        setFontSize(size);
      }
    };

    requestAnimationFrame(fit);
  }, [page.text, pageIndex]);

  const cachedImage = getImageFromCache(book.id, pageIndex);

  return (
    <div
      className="w-full flex flex-col"
      style={{
        height: '100dvh',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      {/* Spacer for fixed top bar */}
      <div className="flex-shrink-0" style={{ height: '60px' }} />

      {/* Content area — must not overflow */}
      <div
        ref={contentRef}
        className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 lg:px-16 py-3 overflow-hidden"
      >
        {/* Image — pre-loaded, from cache */}
        {cachedImage ? (
          <img
            src={cachedImage}
            alt={page.imageDescription || 'Page illustration'}
            className="w-full max-h-[50vh] rounded-3xl object-cover mb-3 shadow-lg flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className={`w-full max-h-[40vh] aspect-video rounded-3xl bg-gradient-to-br ${book.coverColor} mb-3 flex items-center justify-center shadow-lg flex-shrink-0`}>
            <span className="text-5xl">{book.coverEmoji}</span>
          </div>
        )}

        {/* Text — auto-sized */}
        <p
          ref={textRef}
          className="text-center font-medium px-2 text-foreground flex-shrink-1"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: fontSize <= 13 ? 1.35 : fontSize <= 15 ? 1.45 : 1.6,
            overflow: 'hidden',
          }}
        >
          {page.text}
        </p>

        {/* QTE result badge */}
        {page.qte && qteResult !== undefined && (
          <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${qteResult ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {page.qte.type === 'maze'
              ? (qteResult ? '🏆 Maze Solved!' : '🏆 Maze Attempted')
              : (qteResult ? '⚡ QTE Passed!' : '⚡ QTE Attempted')}
          </div>
        )}

        {/* Finish button on last page */}
        {isLastPage && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={onFinish}
            className="mt-3 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity flex-shrink-0"
          >
            Finish & Quiz 🎯
          </motion.button>
        )}
      </div>

      {/* Bottom safe area */}
      <div className="flex-shrink-0 h-2" />
    </div>
  );
};

export default Reader;