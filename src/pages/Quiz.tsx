import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { publicDomainBooks } from '@/data/publicDomainBooks';
import { shortStories } from '@/data/shortStories';
import { expandedBooks } from '@/data/expandedBooks';
import { supabase } from '@/integrations/supabase/client';
import { calcTotalBookCoins } from '@/utils/coinEconomy';
import type { Difficulty } from '@/utils/coinEconomy';

const allBooks = [...books, ...publicDomainBooks, ...shortStories, ...expandedBooks];
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, X, Star, MessageSquare, Zap, Coins } from 'lucide-react';

const Quiz = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { saveQuizScore, rateBook, addQuizStreak, progress } = useApp();

  // Support both catalog and imported books
  const book = allBooks.find(b => b.id === bookId) || (() => {
    try {
      const imported = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      return imported.find((b: any) => b.id === bookId) || null;
    } catch { return null; }
  })();

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(3);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [coinsBreakdown, setCoinsBreakdown] = useState<{ reading: number; quiz: number; qte: number; total: number } | null>(null);

  if (!book) return <div className="min-h-screen flex items-center justify-center">Book not found</div>;

  const question = book.quiz[currentQ];
  const score = answers.filter((a, i) => a === book.quiz[i].correctIndex).length;
  const isCorrect = selected === question?.correctIndex;

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);

    const correct = idx === question.correctIndex;
    addQuizStreak(correct);
    if (correct) {
      setSessionStreak(prev => prev + 1);
    } else {
      setSessionStreak(0);
    }

    setTimeout(() => {
      setAnswers(prev => [...prev, idx]);
      setSelected(null);
      if (currentQ < book.quiz.length - 1) {
        setCurrentQ(prev => prev + 1);
      } else {
        const finalAnswers = [...answers, idx];
        const finalScore = finalAnswers.filter((a, i) => a === book.quiz[i].correctIndex).length;
        saveQuizScore(book.id, finalScore, book.quiz.length);

        // Calculate coins
        const isReread = progress.booksRead.filter(id => id === book.id).length > 1
          || (progress.quizScores[book.id] !== undefined);
        const difficulty = (book.difficulty || 'beginner') as Difficulty;

        // Get QTE results from localStorage (stored by Reader)
        const qteData = JSON.parse(localStorage.getItem(`bookquest-qte-${book.id}`) || '{"passed":0,"total":0}');

        const breakdown = calcTotalBookCoins(
          difficulty,
          finalScore,
          book.quiz.length,
          qteData.passed,
          qteData.total,
          isReread,
        );
        setCoinsBreakdown(breakdown);

        // Award coins to profile
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: profile } = await supabase.from('profiles').select('coins').eq('user_id', user.id).single();
          if (profile) {
            await supabase.rpc('update_profile_economy', {
              p_user_id: user.id,
              p_coins: profile.coins + breakdown.total,
            } as any);
          }
          // Track coins earned on this book
          const { data: ub } = await supabase.from('user_books')
            .select('id, coins_earned')
            .eq('user_id', user.id)
            .eq('book_id', book.id)
            .maybeSingle();
          if (ub) {
            await supabase.from('user_books').update({
              coins_earned: (ub as any).coins_earned + breakdown.total,
            } as any).eq('id', ub.id);
          }
        })();

        setShowResult(true);
      }
    }, 1000);
  };

  const handleRate = () => {
    rateBook(book.id, rating);
    navigate('/foryou');
  };

  if (showRating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <h2 className="font-display text-2xl mb-2">Did you enjoy this book?</h2>
          <p className="text-muted-foreground mb-6">{book.title}</p>
          <div className="flex gap-2 justify-center mb-4">
            {['😐', '🙂', '😊', '😄', '😍'].map((emoji, i) => (
              <button key={i} onClick={() => setRating(i + 1)}
                className={`text-4xl p-2 rounded-xl transition-all ${rating === i + 1 ? 'scale-125 bg-primary/10' : 'opacity-50 hover:opacity-80'}`}>
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 mt-6">
            <Button className="rounded-2xl px-8" onClick={handleRate}>
              Done! →
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl px-8"
              onClick={() => {
                rateBook(book.id, rating);
                navigate(`/reviews/${book.id}`);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" /> Write a Review
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showResult) {
    const isPerfect = score === book.quiz.length;
    const pointsEarned = score * 3;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
          className="text-center">
          <div className="text-7xl mb-4">{isPerfect ? '🎉' : score >= 2 ? '⭐' : '💪'}</div>
          <h2 className="font-display text-3xl mb-2">
            {isPerfect ? 'Perfect Score!' : score >= 2 ? 'Great Job!' : 'Nice Try!'}
          </h2>
          <p className="text-xl text-muted-foreground mb-2">
            You got <span className="text-primary font-bold">{score}</span> out of <span className="font-bold">{book.quiz.length}</span>
          </p>
          <p className="text-sm text-primary font-semibold mb-1">+{pointsEarned} reading points!</p>

          {/* Coin breakdown */}
          {coinsBreakdown && coinsBreakdown.total > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-muted/50 rounded-2xl p-3 mb-2 text-sm">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground mb-1">
                <Coins className="w-5 h-5 text-yellow-500" />
                +{coinsBreakdown.total} coins
              </div>
              <div className="flex justify-center gap-3 text-xs text-muted-foreground">
                <span>📖 {coinsBreakdown.reading}</span>
                <span>🧠 {coinsBreakdown.quiz}</span>
                {coinsBreakdown.qte > 0 && <span>⚡ {coinsBreakdown.qte}</span>}
              </div>
              {score === book.quiz.length && (
                <p className="text-xs text-primary font-semibold mt-1">✨ Perfect bonus: quiz coins doubled!</p>
              )}
            </motion.div>
          )}

          {/* Stars */}
          <div className="flex justify-center gap-1 mb-6">
            {Array.from({ length: book.quiz.length }).map((_, i) => (
              <motion.div key={i} initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }} transition={{ delay: i * 0.2, type: 'spring' }}>
                <Star className={`w-8 h-8 ${i < score ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
              </motion.div>
            ))}
          </div>

          <Button className="rounded-2xl px-8" onClick={() => setShowRating(true)}>
            Rate This Book →
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Question {currentQ + 1} of {book.quiz.length}</p>
          {sessionStreak > 1 && (
            <span className="flex items-center gap-1 text-xs text-yellow-600 font-semibold">
              <Zap className="w-3 h-3" /> {sessionStreak} streak
            </span>
          )}
        </div>
        <div className="h-1 bg-muted rounded-full mb-6">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${((currentQ + 1) / book.quiz.length) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <h2 className="text-xl font-bold mb-6">{question.question}</h2>
            <div className="flex flex-col gap-3">
              {question.options.map((opt, i) => {
                let bg = 'bg-card border-border hover:border-primary';
                if (selected !== null) {
                  if (i === question.correctIndex) bg = 'bg-green-500/20 border-green-500';
                  else if (i === selected) bg = 'bg-red-500/20 border-red-500';
                }
                return (
                  <motion.button key={i} onClick={() => handleAnswer(i)}
                    className={`p-4 rounded-2xl border-2 text-left font-medium transition-all ${bg}`}
                    whileTap={{ scale: 0.97 }}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                      {selected !== null && i === question.correctIndex && <Check className="w-5 h-5 text-green-500 ml-auto" />}
                      {selected !== null && i === selected && i !== question.correctIndex && <X className="w-5 h-5 text-red-500 ml-auto" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Quiz;
