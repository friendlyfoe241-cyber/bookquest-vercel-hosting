import { motion } from 'framer-motion';
import { bookCovers } from '@/data/bookCovers';
import { pageIllustrations } from '@/data/pageIllustrations';

interface BookLoadingScreenProps {
  book: {
    id: string;
    title: string;
    coverEmoji: string;
    coverColor: string;
    pages: any[];
  };
  progress: number; // 0-100
}

const BookLoadingScreen = ({ book, progress }: BookLoadingScreenProps) => {
  const cover = bookCovers[book.id];

  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-background px-6 gap-6">
      {/* Animated book cover */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-40 h-56 sm:w-48 sm:h-64 rounded-2xl shadow-2xl overflow-hidden"
        >
          {cover ? (
            <img src={cover} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${book.coverColor} flex items-center justify-center`}>
              <span className="text-6xl">{book.coverEmoji}</span>
            </div>
          )}
        </motion.div>

        {/* Glow effect */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-4 bg-primary/20 rounded-3xl blur-xl -z-10"
        />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg font-bold text-foreground text-center"
      >
        {book.title}
      </motion.h2>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-48 sm:w-56"
      >
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {progress < 100 ? 'Preparing your book…' : 'Ready!'}
        </p>
      </motion.div>
    </div>
  );
};

export default BookLoadingScreen;
