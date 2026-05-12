import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, Send, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Review {
  id: string;
  user_id: string;
  book_id: string;
  rating: number;
  review_text: string;
  display_name: string;
  created_at: string;
}

interface BookReviewsProps {
  bookId: string;
  bookTitle: string;
}

const BookReviews = ({ bookId, bookTitle }: BookReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
    checkAuth();
  }, [bookId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
  };

  const loadReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('book_reviews')
      .select('id, book_id, rating, review_text, display_name, created_at, user_id')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });
    
    if (!error && data) setReviews(data);
    setLoading(false);
  };

  const myReview = reviews.find(r => r.user_id === userId);

  const handleSubmit = async () => {
    if (!userId) return;
    if (!reviewText.trim()) {
      toast.error('Please write a review');
      return;
    }
    if (reviewText.trim().length > 500) {
      toast.error('Review must be 500 characters or less');
      return;
    }

    setSubmitting(true);

    // Get display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single();

    const displayName = profile?.display_name || 'Reader';

    if (editing && myReview) {
      const { error } = await supabase
        .from('book_reviews')
        .update({ rating, review_text: reviewText.trim(), display_name: displayName })
        .eq('id', myReview.id);
      
      if (error) toast.error('Failed to update review');
      else toast.success('Review updated!');
    } else {
      const { error } = await supabase
        .from('book_reviews')
        .insert({ user_id: userId, book_id: bookId, rating, review_text: reviewText.trim(), display_name: displayName });
      
      if (error) {
        if (error.code === '23505') toast.error('You already reviewed this book');
        else toast.error('Failed to submit review');
      } else toast.success('Review submitted!');
    }

    setSubmitting(false);
    setShowForm(false);
    setEditing(false);
    setReviewText('');
    setRating(5);
    loadReviews();
  };

  const handleDelete = async () => {
    if (!myReview) return;
    const { error } = await supabase
      .from('book_reviews')
      .delete()
      .eq('id', myReview.id);
    
    if (error) toast.error('Failed to delete review');
    else {
      toast.success('Review deleted');
      loadReviews();
    }
  };

  const startEdit = () => {
    if (!myReview) return;
    setRating(myReview.rating);
    setReviewText(myReview.review_text);
    setEditing(true);
    setShowForm(true);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg">Reviews</h3>
          {avgRating && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              {avgRating} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        {userId && !myReview && !showForm && (
          <Button size="sm" className="rounded-xl" onClick={() => setShowForm(true)}>
            Write Review
          </Button>
        )}
      </div>

      {/* Write/Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="bg-card rounded-2xl p-4 mb-4 border border-border shadow-sm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-sm font-semibold mb-2">{editing ? 'Edit Review' : 'Write a Review'}</p>
            
            {/* Star rating */}
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className={`w-6 h-6 transition-colors ${s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>

            <Textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="What did you think of this book?"
              className="rounded-xl mb-2 resize-none"
              maxLength={500}
              rows={3}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{reviewText.length}/500</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(false); }}>
                  Cancel
                </Button>
                <Button size="sm" className="rounded-xl" onClick={handleSubmit} disabled={submitting}>
                  <Send className="w-4 h-4 mr-1" /> {submitting ? 'Sending...' : editing ? 'Update' : 'Submit'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">No reviews yet. {userId ? 'Be the first!' : 'Sign in to write one!'}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <motion.div
              key={review.id}
              className="bg-card rounded-2xl p-4 border border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{review.display_name}</p>
                  <div className="flex gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                </div>
                {review.user_id === userId && (
                  <div className="flex gap-1">
                    <button onClick={startEdit} className="p-1 hover:bg-muted rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={handleDelete} className="p-1 hover:bg-destructive/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{review.review_text}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookReviews;
