import { useParams, useNavigate } from 'react-router-dom';
import { books } from '@/data/books';
import { bookCovers } from '@/data/bookCovers';
import { ArrowLeft } from 'lucide-react';
import GenreBadge from '@/components/GenreBadge';
import BookReviews from '@/components/BookReviews';

const Reviews = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const book = books.find(b => b.id === bookId);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Book not found.</p>
      </div>
    );
  }

  const cover = bookCovers[book.id];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl text-primary">Reviews</h1>
      </div>

      {/* Book info */}
      <div className="flex gap-4 items-start mb-2">
        {cover ? (
          <img src={cover} alt={book.title} className="w-20 h-28 rounded-xl object-cover shadow-md" />
        ) : (
          <div className={`w-20 h-28 rounded-xl bg-gradient-to-br ${book.coverColor} flex items-center justify-center shadow-md`}>
            <span className="text-3xl">{book.coverEmoji}</span>
          </div>
        )}
        <div>
          <h2 className="font-display text-lg">{book.title}</h2>
          <GenreBadge genre={book.genre} className="mt-1" />
          <p className="text-xs text-muted-foreground mt-2">{book.summary}</p>
        </div>
      </div>

      <BookReviews bookId={book.id} bookTitle={book.title} />
    </div>
  );
};

export default Reviews;
