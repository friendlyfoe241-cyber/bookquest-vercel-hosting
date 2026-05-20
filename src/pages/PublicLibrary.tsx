import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, BookOpen, Upload, ArrowLeft, Download, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GutenbergBook {
  id: number;
  title: string;
  authors: string;
  coverUrl: string | null;
  subjects: string[];
  downloadCount: number;
  hasText: boolean;
  textUrl: string;
}

type Tab = 'browse' | 'import';

// ── Helpers ───────────────────────────────────────────────────────────────────

function BookCoverPlaceholder({ title }: { title: string }) {
  const colors = [
    'from-amber-400 to-orange-500', 'from-blue-400 to-cyan-500',
    'from-green-400 to-emerald-500', 'from-purple-400 to-pink-500',
    'from-rose-400 to-red-500',      'from-teal-400 to-blue-500',
    'from-indigo-400 to-violet-500', 'from-yellow-400 to-amber-500',
  ];
  const color = colors[title.charCodeAt(0) % colors.length];
  return (
    <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center`}>
      <span className="text-3xl">📖</span>
    </div>
  );
}

// ── Browse Gutenberg tab ──────────────────────────────────────────────────────

function BrowseTab() {
  const navigate = useNavigate();
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<GutenbergBook[]>([]);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);
  const [importing, setImporting]   = useState<number | null>(null);
  const [importStep, setImportStep] = useState('');
  const [imported, setImported]     = useState<Set<number>>(new Set());

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { toast.error('Please enter at least 2 characters.'); return; }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-public-books', {
        body: { query: q.trim() },
      });
      if (error) throw error;
      setResults(data?.books || []);
    } catch {
      toast.error('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') search(query);
  };

  const handleImport = async (book: GutenbergBook) => {
    setImporting(book.id);

    try {
      // ── Step 1: Fetch book text via our proxy edge function ───────────────
      setImportStep('Downloading book…');

      const { data: fetchData, error: fetchError } = await supabase.functions.invoke(
        'fetch-book-text',
        { body: { textUrl: book.textUrl, gutenbergId: book.id } },
      );

      if (fetchError || !fetchData?.text) {
        throw new Error(
          fetchData?.error ||
          'Could not download book text. Gutenberg may be temporarily unavailable — please try again in a moment.',
        );
      }

      // ── Step 2: Truncate to 50k chars before sending to AI ────────────────
      // Full Gutenberg texts can be 300KB–2MB; the edge function only needs
      // the opening ~4k chars for analysis, but we send up to 50k for page splitting.
      const truncatedText = typeof fetchData.text === 'string'
        ? fetchData.text.slice(0, 50000)
        : String(fetchData.text).slice(0, 50000);

      // ── Step 3: Process with AI ───────────────────────────────────────────
      setImportStep('Processing with AI…');

      const { data, error } = await supabase.functions.invoke('process-imported-book', {
        body: { title: book.title, text: truncatedText },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // ── Step 4: Save to localStorage so the Reader can find it ────────────
      const stored = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      stored.push({
        id:         data.bookId,
        title:      data.title,
        pages:      data.pages,
        quiz:       data.quiz,
        coverEmoji: data.coverEmoji,
        coverColor: data.coverColor,
        genre:      data.genre,
        difficulty: data.difficulty,
      });
      localStorage.setItem('bookquest-imported', JSON.stringify(stored));

      setImported(prev => new Set(prev).add(book.id));
      toast.success(`"${book.title}" imported! 📖`);
      navigate(`/read/${data.bookId}`);

    } catch (err: any) {
      toast.error(err.message || 'Import failed. Please try another book.');
    } finally {
      setImporting(null);
      setImportStep('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 pb-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Search 70,000+ public domain books…"
              className="pl-10 rounded-xl h-11"
            />
          </div>
          <Button
            onClick={() => search(query)}
            disabled={loading}
            className="h-11 px-4 rounded-xl flex-shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />
            }
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">
          Powered by Project Gutenberg — classic literature, free forever
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No books found for "{query}"</p>
            <p className="text-sm mt-1">Try a different title or author name</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Search for a classic</p>
            <p className="text-sm mt-1">
              Try "Sherlock Holmes", "Jules Verne", or "Alice in Wonderland"
            </p>
          </div>
        )}

        <AnimatePresence>
          {!loading && results.map((book, i) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex gap-3 py-3 border-b border-border/50 last:border-0"
            >
              {/* Cover */}
              <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <BookCoverPlaceholder title={book.title} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                    {book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.authors}</p>
                  {book.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {book.subjects.slice(0, 2).map(s => (
                        <span
                          key={s}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground truncate max-w-[120px]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {book.downloadCount.toLocaleString()} downloads
                  </span>

                  {imported.has(book.id) ? (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Imported
                    </span>
                  ) : importing === book.id ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {importStep || 'Importing…'}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleImport(book)}
                      className="h-7 px-3 text-xs rounded-lg"
                    >
                      Import & Read
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Import Text tab ───────────────────────────────────────────────────────────

function ImportTextTab() {
  const navigate = useNavigate();
  const [title, setTitle]     = useState('');
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!title.trim() || text.trim().length < 100) {
      toast.error('Please enter a title and at least 100 characters of text.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-imported-book', {
        body: { title: title.trim(), text: text.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const stored = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      stored.push({
        id:         data.bookId,
        title:      data.title,
        pages:      data.pages,
        quiz:       data.quiz,
        coverEmoji: data.coverEmoji,
        coverColor: data.coverColor,
        genre:      data.genre,
        difficulty: data.difficulty,
      });
      localStorage.setItem('bookquest-imported', JSON.stringify(stored));

      toast.success('Book imported successfully! 🎉');
      navigate(`/read/${data.bookId}`);
    } catch (err: any) {
      toast.error(err.message || 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-28">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Book Title</label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. My Summer Adventure"
          className="rounded-xl"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Paste your text
          <span className="text-muted-foreground font-normal ml-2 text-xs">
            ({text.length.toLocaleString()} / 50,000 chars)
          </span>
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, 50000))}
          placeholder="Paste your story or book text here…"
          rows={12}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Content is reviewed for age-appropriateness. The AI will split it into pages and create a quiz.
        </p>
      </div>

      <Button
        onClick={handleImport}
        disabled={loading || !title.trim() || text.trim().length < 100}
        className="w-full h-11 rounded-xl font-bold"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing…</>
        ) : (
          'Import Book 📚'
        )}
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PublicLibrary = () => {
  const navigate      = useNavigate();
  const [tab, setTab] = useState<Tab>('browse');

  return (
    <div className="h-dvh bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-foreground">Book Library</h1>
          <p className="text-xs text-muted-foreground">Browse 70,000+ classics or import your own</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {([
          { key: 'browse', label: 'Browse Classics', icon: Search },
          { key: 'import', label: 'Import Text',     icon: Upload },
        ] as { key: Tab; label: string; icon: typeof Search }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors relative ${
              tab === key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {tab === key && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === 'browse' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {tab === 'browse' ? <BrowseTab /> : <ImportTextTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PublicLibrary;
