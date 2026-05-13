import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { publicDomainBooks } from '@/data/publicDomainBooks';
import { shortStories } from '@/data/shortStories';
import { expandedBooks } from '@/data/expandedBooks';
import { Book } from '@/types/book';
import { BookOpen, Trophy, Flame, Settings, Users, Award, Zap, Shield, ShoppingBag, Coins } from 'lucide-react';
import SettingsMenu from '@/components/SettingsMenu';
import BookPreviewModal from '@/components/BookPreviewModal';
import BookCover from '@/components/BookCover';
import BottomNav from '@/components/BottomNav';
import TutorialOverlay from '@/components/TutorialOverlay';
import FeaturedContent from '@/components/FeaturedContent';
import { useBookRatings } from '@/hooks/useBookRatings';
import { useAppNotifications } from '@/hooks/useAppNotifications';
import { forYouBooksForAge } from '@/utils/ageClassification';
import { useDailyLogin } from '@/hooks/useDailyLogin';
import { useCoinSync } from '@/hooks/useCoinSync';
import DailyLoginModal from '@/components/DailyLoginModal';

const allBooksRaw = [...books, ...publicDomainBooks, ...shortStories, ...expandedBooks];

const ForYou = () => {
  const { progress, settings, getUserLevel } = useApp();
  const navigate = useNavigate();
  const allBooks = forYouBooksForAge(allBooksRaw, settings.ageGroup);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { ratings } = useBookRatings();
  useAppNotifications();
  const dailyLogin = useDailyLogin();
  const { coins } = useCoinSync();

  useEffect(() => {
    const done = localStorage.getItem('bookquest-tutorial-done');
    if (!done) setTutorialOpen(true);
  }, []);

  const likedBooks = allBooks.filter(b => progress.likedBooks.includes(b.id));
  const readBooks = allBooks.filter(b => progress.booksRead.includes(b.id));
  const userLevel = getUserLevel();

  const likedGenres = [...new Set(likedBooks.map(b => b.genre))];
  const recommended = allBooks.filter(
    b => likedGenres.includes(b.genre) &&
      !progress.likedBooks.includes(b.id) &&
      !progress.dislikedBooks.includes(b.id)
  );

  const handleHoldStart = (book: Book) => {
    holdTimer.current = setTimeout(() => setPreviewBook(book), 500);
  };
  const handleHoldEnd = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  return (
    <div className="min-h-screen bg-background pb-24 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl text-primary">For You</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Trophy className="w-4 h-4" /> {userLevel.title} (Lv.{userLevel.level})
              </span>
              {progress.streak > 0 && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" /> {progress.streak} day streak
                </span>
              )}
              {progress.quizStreak > 0 && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-500" /> {progress.quizStreak} quiz streak
                </span>
              )}
              {progress.streakSavers > 0 && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Shield className="w-4 h-4 text-blue-500" /> {progress.streakSavers} saver{progress.streakSavers > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 items-center">
            <div className="flex items-center gap-1 bg-card border border-border rounded-2xl px-2.5 py-1 mr-1">
              <Coins className="w-3.5 h-3.5 text-yellow-500" />
              <span className="font-bold text-xs">{coins.toLocaleString()}</span>
            </div>
            <button onClick={() => navigate('/shop')} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ShoppingBag className="w-5 h-5 text-yellow-500" />
            </button>
            <button onClick={() => navigate('/achievements')} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Award className="w-5 h-5 text-amber-500" />
            </button>
            <button onClick={() => navigate('/friends')} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Users className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={() => navigate('/leaderboard')} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Trophy className="w-5 h-5 text-primary" />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Reading Score */}
        <div className="mb-6 p-3 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">Reading Score</span>
            <span className="text-sm font-bold text-primary">{userLevel.score} pts</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${userLevel.booksNeeded > 0 ? ((userLevel.score) / (userLevel.score + userLevel.booksNeeded)) * 100 : 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {userLevel.booksNeeded > 0 ? `${userLevel.booksNeeded} more points to next level` : 'Max level reached!'}
          </p>
        </div>

        {/* Liked Books */}
        {likedBooks.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Your Books
            </h2>
            <div className="grid grid-cols-3 gap-3" style={{ touchAction: 'pan-y' }}>
              {likedBooks.map(book => (
                <BookCover key={book.id} book={book}
                  onClick={() => navigate(`/read/${book.id}`)}
                  onHoldStart={() => handleHoldStart(book)}
                  onHoldEnd={handleHoldEnd}
                  score={progress.quizScores[book.id]}
                  isRead={progress.booksRead.includes(book.id)}
                  avgRating={ratings[book.id]?.avg}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="font-display text-xl mb-1">No books yet!</h3>
            <p className="text-sm text-muted-foreground mb-4">Discover and like books to build your collection</p>
            <button onClick={() => navigate('/discover')} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-2xl font-semibold hover:opacity-90 transition-opacity">
              Discover Books →
            </button>
          </div>
        )}

        {/* Featured Content */}
        <section className="mb-8">
          <FeaturedContent onBookSelect={(book) => navigate(`/read/${book.id}`)} />
        </section>

        {/* Recommended */}
        {recommended.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3">You Might Like</h2>
            <div className="grid grid-cols-3 gap-3" style={{ touchAction: 'pan-y' }}>
              {recommended.map(book => (
                <BookCover key={book.id} book={book}
                  onClick={() => navigate(`/read/${book.id}`)}
                  onHoldStart={() => handleHoldStart(book)}
                  onHoldEnd={handleHoldEnd}
                  avgRating={ratings[book.id]?.avg}
                />
              ))}
            </div>
          </section>
        )}

        {/* Read Books */}
        {readBooks.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Read Books
            </h2>
            <div className="grid grid-cols-3 gap-3" style={{ touchAction: 'pan-y' }}>
              {readBooks.map(book => (
                <BookCover key={book.id} book={book}
                  onClick={() => navigate(`/read/${book.id}`)}
                  onHoldStart={() => handleHoldStart(book)}
                  onHoldEnd={handleHoldEnd}
                  score={progress.quizScores[book.id]}
                  isRead
                  avgRating={ratings[book.id]?.avg}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <BookPreviewModal book={previewBook} onClose={() => setPreviewBook(null)} />
      <BottomNav />
      <SettingsMenu open={settingsOpen} onOpenChange={setSettingsOpen} />
      <TutorialOverlay isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      <DailyLoginModal
        open={!dailyLogin.loading && !dailyLogin.claimed}
        reward={dailyLogin.reward}
        streak={dailyLogin.streak}
        onClaim={dailyLogin.claim}
        onClose={() => {}}
      />
    </div>
  );
};

export default ForYou;
