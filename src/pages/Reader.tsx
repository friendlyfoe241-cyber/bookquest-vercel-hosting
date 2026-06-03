import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import ContentsPage from '@/components/reader/ContentsPage';
import { useImagePreloader, getImageCache, shouldHaveImage } from '@/hooks/useImagePreloader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const allBooks = [...books, ...publicDomainBooks, ...shortStories, ...expandedBooks];

// ── Real-time book data cleaner ───────────────────────────────────────────────
// Gutenberg plain-text files have two common problems after AI processing:
//
//  1. The book's own embedded contents page gets parsed as individual "stub"
//     TOC entries — pages whose text is just "Chapter 4" or similar (< 150 chars).
//     These should be removed from both the TOC and the page stream.
//
//  2. Pages before the first real chapter (preface, letters, licensing, the
//     embedded text TOC itself) should be trimmed so Chapter 1 is page 1.
//
// Both are fixed here at render time without touching any stored data.
function cleanBookData(rawBook: any): any {
  const pages: any[]  = rawBook.pages || [];
  const contentsPage  = pages[0];
  if (!contentsPage?.isContentsPage) return rawBook;
  const toc: { title: string; pageIndex: number }[] =
    contentsPage.tableOfContents || [];
  if (toc.length === 0) return rawBook;

  // Any TOC entry whose page has fewer than 150 chars is a stub (the book's
  // own embedded chapter listing, not real chapter content).
  const STUB_MAX = 150;
  const realEntries = toc.filter(
    e => (pages[e.pageIndex]?.text || '').trim().length >= STUB_MAX,
  );

  // If every entry is a stub the book may be structured differently — leave it alone.
  if (realEntries.length === 0) return rawBook;

  const firstRealIdx = realEntries[0].pageIndex;

  // Nothing to trim — real content already starts at/near the top.
  if (firstRealIdx <= 1) {
    return {
      ...rawBook,
      pages: [{ ...contentsPage, tableOfContents: realEntries }, ...pages.slice(1)],
    };
  }

  // Slice off all preamble + embedded-TOC stub pages.
  // ContentsPage stays at index 0; everything else shifts by (firstRealIdx − 1).
  const shift = firstRealIdx - 1;
  return {
    ...rawBook,
    pages: [
      {
        ...contentsPage,
        tableOfContents: realEntries.map(e => ({ ...e, pageIndex: e.pageIndex - shift })),
      },
      ...pages.slice(firstRealIdx),
    ],
  };
}

const Reader = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate   = useNavigate();
  const { markBookRead } = useApp();

  // Memoized so the clean pass only runs once per bookId, not every render
  const book = useMemo(() => {
    const staticBook = allBooks.find(b => b.id === bookId);
    if (staticBook) return staticBook; // curated books need no cleaning
    try {
      const imported = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      const raw = imported.find((b: any) => b.id === bookId) || null;
      return raw ? cleanBookData(raw) : null;
    } catch { return null; }
  }, [bookId]);

  const { progress, ready, loadedCount } = useImagePreloader(book);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentPage,  setCurrentPage]  = useState(0);
  const [showQTE,      setShowQTE]      = useState(false);
  const [qteResults,   setQteResults]   = useState<Record<number, boolean>>({});
  const [loadingMore,  setLoadingMore]  = useState(false);

  // Returns true if a page looks like a chapter-title separator:
  //   very short text that is just a heading like "III. A Case of Identity"
  //   with no real paragraph content below it.
  const isChapterTitlePage = useCallback((p: any): boolean => {
    if (!p?.text) return false;
    const text = p.text.trim();
    // Short overall AND matches a chapter heading pattern at the start
    if (text.length > 200) return false;
    return /^(CHAPTER\s+[IVXLCDM0-9]+\.?|[IVXLCDM]{1,7}\.\s+\S)/i.test(text);
  }, []);

  // Jump to a specific page by scrolling the snap container.
  // If the target page is a chapter-title separator, skip forward to the
  // first page that contains actual content.
  const jumpToPage = useCallback((pageIndex: number) => {
    const container = scrollRef.current;
    if (!container || !book) return;

    let target = pageIndex;
    // Walk forward past any chapter-title separator pages (max 5 steps)
    for (let i = 0; i < 5; i++) {
      if (target >= book.pages.length) break;
      if (!isChapterTitlePage(book.pages[target])) break;
      target++;
    }

    // Use instant scroll (scrollTop assignment) rather than scrollTo({ behavior: 'smooth' }).
    // snap-y snap-mandatory + smooth scroll can cause the browser to settle on a
    // different snap point than intended, leaving the header counter (currentPage)
    // and the per-page bottom counter (pageIndex) permanently out of sync.
    // An instant jump fires the scroll listener exactly once at the correct final
    // position, so both counters always agree.
    container.scrollTop = target * container.clientHeight;
    setCurrentPage(target);
  }, [book, isChapterTitlePage]);

  const page = book?.pages[currentPage];

  // ── Check for "more content" in localStorage ──────────────────────────────
  const remainingKey = bookId ? `bookquest-remaining-${bookId}` : null;

  // useState so migration patches (below) trigger a re-render immediately,
  // making the ← Part N back button appear without needing a page refresh.
  const [remaining, setRemaining] = useState<any>(() => {
    if (!remainingKey) return null;
    try { return JSON.parse(localStorage.getItem(remainingKey) || 'null'); } catch { return null; }
  });

  const hasMore        = !!(remaining?.text?.length > 500);
  const nextPartNumber = (remaining?.partNumber || 1) + 1;

  // ── Retroactive migration: patch previousBookId if missing ────────────────
  // Books loaded before this fix won't have previousBookId stored. We infer
  // it from the title pattern: "Alice (Part 2)" → previous is "Alice (Part 1)".
  // Calling setRemaining() after patching ensures the back button renders
  // immediately without waiting for a page refresh.
  useEffect(() => {
    if (!remaining || remaining.previousBookId || (remaining.partNumber || 1) < 2) return;
    if (!remainingKey || !bookId) return;
    try {
      const allImported: any[] = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      const currentBook = allImported.find(b => b.id === bookId);
      if (!currentBook) return;
      const partN    = remaining.partNumber as number;
      const prevPartN = partN - 1;
      const baseTitle = currentBook.title.replace(/ \(Part \d+\)$/i, '');
      const prevTitle = prevPartN === 1 ? baseTitle : `${baseTitle} (Part ${prevPartN})`;
      const prevBook  = allImported.find(b => b.title === prevTitle);
      if (!prevBook) return;
      const patched = { ...remaining, previousBookId: prevBook.id };
      localStorage.setItem(remainingKey, JSON.stringify(patched));
      setRemaining(patched); // triggers re-render → back button appears immediately
    } catch { /* ignore */ }
  }, [bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve the previous part book (if this is Part 2+)
  const previousBookId = remaining?.previousBookId as string | undefined;
  const previousBook = (() => {
    if (!previousBookId) return null;
    try {
      const all = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      const prev = all.find((b: any) => b.id === previousBookId);
      if (!prev) return null;
      return { id: previousBookId, title: prev.title, partNumber: (remaining?.partNumber || 2) - 1 };
    } catch { return null; }
  })();

  // ── Scroll tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !ready) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const pageHeight = container.clientHeight;
        const newPage    = Math.round(container.scrollTop / pageHeight);
        setCurrentPage(prev => {
          if (prev !== newPage && newPage >= 0 && newPage < (book?.pages.length || 0)) return newPage;
          return prev;
        });
        ticking = false;
      });
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [ready, book?.pages.length]);

  // ── QTE trigger ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !page) return;
    if (page.qte && qteResults[currentPage] === undefined) {
      const timer = setTimeout(() => setShowQTE(true), 800);
      return () => clearTimeout(timer);
    }
  }, [currentPage, page?.qte, qteResults, ready]);

  if (!book) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Book not found.</p>
      </div>
    );
  }

  if (!ready) return <BookLoadingScreen book={book} progress={progress} />;

  // ── "Load More" handler (from Contents page or elsewhere) ─────────────────
  const handleLoadMore = async () => {
    if (!remaining || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextChunk  = remaining.text.slice(0, 50000);
      const partNum    = (remaining.partNumber || 1) + 1;
      const partTitle  = `${remaining.title} (Part ${partNum})`;

      const { data, error } = await supabase.functions.invoke('process-imported-book', {
        body: { title: partTitle, text: nextChunk },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      // Save the new part to imported books in localStorage
      const stored = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      stored.push({
        id: data.bookId, title: data.title,
        pages: data.pages, quiz: data.quiz,
        coverEmoji: data.coverEmoji || remaining.coverEmoji,
        coverColor: data.coverColor || remaining.coverColor,
        genre: data.genre, difficulty: data.difficulty,
      });
      localStorage.setItem('bookquest-imported', JSON.stringify(stored));

      // Chain remaining text to the new book — include previousBookId so Part N+1 can navigate back
      const nextRemaining = remaining.text.slice(50000);
      if (nextRemaining.length > 500) {
        localStorage.setItem(`bookquest-remaining-${data.bookId}`, JSON.stringify({
          ...remaining,
          text: nextRemaining,
          partNumber: partNum,
          previousBookId: bookId,   // ← back-link to this book
        }));
      }
      if (remainingKey) localStorage.removeItem(remainingKey);

      navigate(`/read/${data.bookId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load next section');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleQTEComplete = (success: boolean) => {
    setQteResults(prev => {
      const updated = { ...prev, [currentPage]: success };
      const passed  = Object.values(updated).filter(Boolean).length;
      const total   = Object.values(updated).length;
      localStorage.setItem(`bookquest-qte-${book.id}`, JSON.stringify({ passed, total }));
      return updated;
    });
    setShowQTE(false);
  };

  const handleFinish = () => { markBookRead(book.id); navigate(`/quiz/${book.id}`); };
  const handleExit   = () => { navigate(-1); };

  const cache           = getImageCache();
  const progressPercent = ((currentPage + 1) / book.pages.length) * 100;

  // Detect ToC from imported books — page 0 may have isContentsPage flag
  const hasToc = !!(book.pages[0]?.isContentsPage && book.pages[0]?.tableOfContents?.length > 0);

  return (
    <div className="h-dvh bg-background flex flex-col relative select-none overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-3 bg-background/80 backdrop-blur-md border-b border-border safe-area-top z-30 flex-shrink-0">
        <button onClick={handleExit} className="p-2 rounded-xl hover:bg-muted transition-colors" aria-label="Exit">
          <X className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate text-foreground">{book.title}</h2>
          <p className="text-xs text-muted-foreground">
            {hasToc && currentPage === 0 ? 'Table of Contents' : `Page ${currentPage + 1} of ${book.pages.length}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted flex-shrink-0 z-20">
        <motion.div className="h-full bg-primary" animate={{ width: `${progressPercent}%` }} />
      </div>

      {/* Snap-scroll pages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory"
      >
        {book.pages.map((p: any, i: number) => {
          // Page 0 with ToC gets the special Contents renderer
          if (i === 0 && hasToc) {
            return (
              <ContentsPage
                key={0}
                book={book}
                toc={p.tableOfContents}
                onJumpToPage={jumpToPage}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
                loadingMore={loadingMore}
                nextPartNumber={nextPartNumber}
                previousBook={previousBook}
                onGoToPrevious={previousBook ? () => navigate(`/read/${previousBook.id}`) : undefined}
              />
            );
          }

          const cacheKey     = `${book.id}:${i}`;
          const pageHasImage = shouldHaveImage(book.difficulty, i);
          const cachedImage  = pageHasImage ? (cache.get(cacheKey) ?? null) : null;

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

      {/* Swipe hint on first page */}
      {currentPage === 0 && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground flex flex-col items-center gap-1 z-20 pointer-events-none"
        >
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>↓</motion.span>
          {hasToc ? 'Tap a chapter or swipe to read' : 'Swipe up for next page'}
        </motion.div>
      )}

      {/* QTE Overlay */}
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
