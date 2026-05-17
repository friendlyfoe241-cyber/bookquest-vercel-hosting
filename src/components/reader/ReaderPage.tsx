import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AutoFitText from './AutoFitText';

interface ReaderPageProps {
  page: { text: string; imageDescription?: string; qte?: any };
  pageIndex: number;
  book: any;
  cachedImage: string | null;
  qteResult?: boolean;
  isLastPage: boolean;
  onFinish: () => void;
}

const ReaderPage = ({
  page, pageIndex, book, cachedImage, qteResult, isLastPage, onFinish,
}: ReaderPageProps) => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  // Reset error state whenever a new image URL arrives (background load completed)
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [cachedImage]);

  const showImage = !!cachedImage && !imgError;

  return (
    <div className="w-full h-dvh flex-shrink-0 snap-start flex flex-col items-center justify-center px-6 sm:px-12 py-4">

      {/* Image area — either real illustration or emoji gradient placeholder */}
      <div className="w-full max-w-md flex-shrink-0 mb-3">
        <AnimatePresence mode="wait">
          {showImage ? (
            <motion.img
              key={cachedImage}
              src={cachedImage}
              alt={page.imageDescription || 'Page illustration'}
              onError={() => setImgError(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full max-h-[35vh] rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`w-full aspect-[4/3] max-h-[35vh] rounded-2xl bg-gradient-to-br ${book.coverColor} flex items-center justify-center shadow-lg`}
            >
              {/* Pulse shimmer when image is still loading, static emoji once given up */}
              {!cachedImage ? (
                <motion.span
                  className="text-5xl sm:text-6xl opacity-60"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {book.coverEmoji}
                </motion.span>
              ) : (
                <span className="text-5xl sm:text-6xl">{book.coverEmoji}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Page text */}
      <div
        ref={textContainerRef}
        className="flex-1 min-h-0 max-h-[40vh] w-full max-w-lg flex items-center overflow-hidden px-2"
      >
        <AutoFitText
          text={page.text}
          containerRef={textContainerRef}
          maxFontSize={18}
          minFontSize={11}
        />
      </div>

      {/* QTE result badge */}
      {page.qte && qteResult !== undefined && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${
            qteResult
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {page.qte.type === 'maze'
            ? (qteResult ? '🏆 Maze Solved!' : '🏆 Maze Attempted')
            : (qteResult ? '⚡ QTE Passed!'  : '⚡ QTE Attempted')}
        </motion.div>
      )}

      {/* Finish button on last page */}
      {isLastPage && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onFinish}
          className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
        >
          Finish & Quiz 🎯
        </motion.button>
      )}

      {/* Page number */}
      <p className="text-xs text-muted-foreground mt-2 flex-shrink-0">
        {pageIndex + 1} / {book.pages.length}
      </p>
    </div>
  );
};

export default ReaderPage;
