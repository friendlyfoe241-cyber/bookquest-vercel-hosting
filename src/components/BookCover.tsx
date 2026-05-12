import { Book } from '@/types/book';
import { bookCovers } from '@/data/bookCovers';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';


interface BookCoverProps {
  book: Book;
  onClick: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  score?: number;
  isRead?: boolean;
  avgRating?: number;
}

const BookCover = ({ book, onClick, onHoldStart, onHoldEnd, score, isRead, avgRating }: BookCoverProps) => {
  const cover = bookCovers[book.id];

  return (
    <motion.button
      className="relative rounded-2xl aspect-[3/4] flex flex-col items-center justify-between shadow-md hover:shadow-lg transition-shadow overflow-hidden"
      onClick={onClick}
      onPointerDown={onHoldStart}
      onPointerUp={onHoldEnd}
      onPointerLeave={onHoldEnd}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {cover ? (
        <img src={cover} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${book.coverColor}`} />
      )}
      {/* Beginner tag */}
      {book.difficulty === 'beginner' && (
        <div className="absolute top-1.5 left-1.5 z-20 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">
          🌱 Beginner
        </div>
      )}
      {book.difficulty === 'intermediate' && (
        <div className="absolute top-1.5 left-1.5 z-20 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">
          🌿 Medium
        </div>
      )}
      {book.difficulty === 'experienced' && (
        <div className="absolute top-1.5 left-1.5 z-20 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">
          🔥 Expert
        </div>
      )}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        {!cover && <span className="text-3xl">{book.coverEmoji}</span>}
      </div>
      <div className="relative z-10 w-full p-2 bg-black/40 text-white text-center">
        <p className="text-xs font-bold leading-tight drop-shadow">{book.title}</p>
        <div className="flex items-center justify-center gap-1">
          <p className="text-[10px] opacity-80">{book.genre}</p>
          {avgRating !== undefined && avgRating > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              {avgRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      {isRead && score !== undefined && (
        <div className="absolute -top-1 -right-1 z-20 bg-primary text-primary-foreground text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow">
          {score}/{book.quiz.length}
        </div>
      )}
    </motion.button>
  );
};

export default BookCover;
