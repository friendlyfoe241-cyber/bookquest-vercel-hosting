import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { publicDomainBooks } from '@/data/publicDomainBooks';
import { shortStories } from '@/data/shortStories';
import { expandedBooks } from '@/data/expandedBooks';
import { bookCovers } from '@/data/bookCovers';
import { Book } from '@/types/book';
import { motion, AnimatePresence } from 'framer-motion';
import GenreBadge from '@/components/GenreBadge';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, BookOpen, Filter, X, Star } from 'lucide-react';
import { useBookRatings } from '@/hooks/useBookRatings';
import BottomNav from '@/components/BottomNav';
import { libraryBooksForAge } from '@/utils/ageClassification';

const allLibraryBooksRaw = [...books, ...publicDomainBooks, ...shortStories, ...expandedBooks];
const GENRES = ['All', 'Adventure', 'Fantasy', 'Animals', 'Action', 'Mystery', 'Sci-Fi', 'Classic'] as const;
const DIFFICULTIES = ['All', 'beginner', 'intermediate', 'experienced'] as const;

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return true;
  const words = lowerQuery.split(/\s+/);
  return words.every(word => lowerText.includes(word));
}

const Library = () => {
  const navigate = useNavigate();
  const { progress, settings } = useApp();
  const allLibraryBooks = useMemo(() => libraryBooksForAge(allLibraryBooksRaw, settings.ageGroup), [settings.ageGroup]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const { ratings } = useBookRatings();

  const filteredBooks = useMemo(() => {
    return allLibraryBooks.filter(book => {
      const matchesSearch = fuzzyMatch(book.title, searchQuery) ||
        fuzzyMatch(book.genre, searchQuery) ||
        fuzzyMatch(book.summary, searchQuery);
      const matchesGenre = genreFilter === 'All' || book.genre === genreFilter;
      const matchesDifficulty = difficultyFilter === 'All' || book.difficulty === difficultyFilter;
      return matchesSearch && matchesGenre && matchesDifficulty;
    });
  }, [searchQuery, genreFilter, difficultyFilter]);

  const activeFilters = (genreFilter !== 'All' ? 1 : 0) + (difficultyFilter !== 'All' ? 1 : 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-2xl text-primary flex-1">Library</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl transition-colors relative ${showFilters ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
          >
            <Filter className="w-5 h-5" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl bg-muted border-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Genre</p>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(genre => (
                      <button
                        key={genre}
                        onClick={() => setGenreFilter(genre)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          genreFilter === genre
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {genre === 'All' ? '🌟 All' : genre === 'Adventure' ? '🏔️ Adventure' : genre === 'Fantasy' ? '✨ Fantasy' : genre === 'Animals' ? '🐾 Animals' : '⚡ Action'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Difficulty</p>
                  <div className="flex flex-wrap gap-2">
                    {DIFFICULTIES.map(diff => (
                      <button
                        key={diff}
                        onClick={() => setDifficultyFilter(diff)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          difficultyFilter === diff
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {diff === 'All' ? 'All Levels' : diff === 'beginner' ? '🌱 Beginner' : diff === 'intermediate' ? '🌿 Intermediate' : '🔥 Experienced'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4">{filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found</p>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📚</div>
            <p className="text-muted-foreground font-medium">No books found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search or filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBooks.map((book, i) => {
              const cover = bookCovers[book.id];
              return (
                <motion.button
                  key={book.id}
                  className="w-full flex gap-4 p-3 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all text-left"
                  onClick={() => navigate(`/read/${book.id}`)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Cover thumbnail */}
                  {cover ? (
                    <img src={cover} alt={book.title} className="w-16 h-20 rounded-xl object-cover shrink-0 shadow-md" />
                  ) : (
                    <div className={`w-16 h-20 rounded-xl bg-gradient-to-br ${book.coverColor} flex items-center justify-center shrink-0 shadow-md`}>
                      <span className="text-2xl">{book.coverEmoji}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{book.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <GenreBadge genre={book.genre} className="text-[10px] px-2 py-0" />
                      <span className="text-[10px] text-muted-foreground">{book.pages.length} pages</span>
                      {book.pages.some(p => p.qte) && (
                        <span className="text-[10px] text-primary font-semibold">⚡ QTE</span>
                      )}
                      {ratings[book.id] && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {ratings[book.id].avg.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{book.summary}</p>
                    {progress.booksRead.includes(book.id) && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-primary font-semibold">
                        <BookOpen className="w-3 h-3" /> Read
                        {progress.quizScores[book.id] !== undefined && (
                          <span className="ml-1">• Score: {progress.quizScores[book.id]}/{book.quiz.length}</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Library;
