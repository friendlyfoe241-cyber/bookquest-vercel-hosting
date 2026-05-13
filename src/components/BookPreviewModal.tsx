import { Book } from '@/types/book';
import { bookCovers } from '@/data/bookCovers';
import GenreBadge from '@/components/GenreBadge';
import { Button } from '@/components/ui/button';
import { Heart, ThumbsDown, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';

interface BookPreviewModalProps {
  book: Book | null;
  onClose: () => void;
}

const BookPreviewModal = ({ book, onClose }: BookPreviewModalProps) => {
  const { progress, likeBook, dislikeBook } = useApp();
  const navigate = useNavigate();

  if (!book) return null;

  const isLiked = progress.likedBooks.includes(book.id);
  const isDisliked = progress.dislikedBooks.includes(book.id);
  const rating = progress.bookRatings[book.id];

  return (
    <AnimatePresence>
      {book && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {bookCovers[book.id] ? (
              <img src={bookCovers[book.id]} alt={book.title} className="w-24 h-32 object-cover rounded-xl mx-auto mb-3" />
            ) : (
              <div className="text-4xl mb-3 text-center">{book.coverEmoji}</div>
            )}
            <h3 className="font-display text-xl text-center mb-1">{book.title}</h3>
            <GenreBadge genre={book.genre} className="mx-auto block w-fit mb-3" />
            <p className="text-sm text-muted-foreground text-center mb-4">{book.summary}</p>

            {/* Rating display */}
            {rating !== undefined && (
              <div className="flex items-center justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => likeBook(book.id)}
              >
                <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </Button>
              <Button
                variant={isDisliked ? "destructive" : "outline"}
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => dislikeBook(book.id)}
              >
                <ThumbsDown className={`w-4 h-4 mr-1 ${isDisliked ? 'fill-current' : ''}`} />
                {isDisliked ? 'Hidden' : "Don't Show"}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 rounded-xl text-primary"
              onClick={() => {
                onClose();
                navigate(`/reviews/${book.id}`);
              }}
            >
              <Star className="w-4 h-4 mr-1" /> View Reviews
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookPreviewModal;
