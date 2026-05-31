import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, BookOpen, Upload, ArrowLeft, Download, Loader2, CheckCircle, Camera, CheckCircle2, XCircle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calcQuizCoins } from '@/utils/coinEconomy';
import type { Difficulty } from '@/utils/coinEconomy';
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

type Tab = 'browse' | 'scan' | 'text';

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

// ── Curated featured classics (shown before any search) ──────────────────────
// Uses real Project Gutenberg IDs so Import & Read works immediately.
const FEATURED_BOOKS: GutenbergBook[] = [
  {
    id: 11,
    title: "Alice's Adventures in Wonderland",
    authors: "Carroll, Lewis",
    coverUrl: "https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg",
    subjects: ["Fantasy", "Children's literature"],
    downloadCount: 43000,
    hasText: true,
    textUrl: "https://www.gutenberg.org/cache/epub/11/pg11.txt",
  },
  {
    id: 1661,
    title: "The Adventures of Sherlock Holmes",
    authors: "Doyle, Arthur Conan",
    coverUrl: "https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg",
    subjects: ["Detective and mystery stories", "Holmes, Sherlock (Fictitious character)"],
    downloadCount: 43408,
    hasText: true,
    textUrl: "https://www.gutenberg.org/cache/epub/1661/pg1661.txt",
  },
  {
    id: 1342,
    title: "Pride and Prejudice",
    authors: "Austen, Jane",
    coverUrl: "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg",
    subjects: ["Domestic fiction", "Romance"],
    downloadCount: 40000,
    hasText: true,
    textUrl: "https://www.gutenberg.org/cache/epub/1342/pg1342.txt",
  },
  {
    id: 120,
    title: "Treasure Island",
    authors: "Stevenson, Robert Louis",
    coverUrl: "https://www.gutenberg.org/cache/epub/120/pg120.cover.medium.jpg",
    subjects: ["Adventure stories", "Pirates"],
    downloadCount: 20000,
    hasText: true,
    textUrl: "https://www.gutenberg.org/cache/epub/120/pg120.txt",
  },
  {
    id: 84,
    title: "Frankenstein; Or, The Modern Prometheus",
    authors: "Shelley, Mary Wollstonecraft",
    coverUrl: "https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg",
    subjects: ["Science fiction", "Horror"],
    downloadCount: 25000,
    hasText: true,
    textUrl: "https://www.gutenberg.org/cache/epub/84/pg84.txt",
  },
  {
    id: 2701,
    title: "Moby Dick; Or, The Whale",
    authors: "Melville, Herman",
    coverUrl: "https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg",
    subjects: ["Adventure stories", "Sea stories"],
    downloadCount: 15000,
    hasText: true,
    textUrl: "https://www.gutenberg.org/cache/epub/2701/pg2701.txt",
  },
];

// ── Browse Gutenberg tab ──────────────────────────────────────────────────────

function BrowseTab() {
  const navigate = useNavigate();
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<GutenbergBook[]>([]);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [importing, setImporting]       = useState<number | null>(null);
  const [importStep, setImportStep]     = useState('');
  const [imported, setImported]         = useState<Set<number>>(new Set());
  const [searchProgress, setSearchProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulated progress bar: accelerates early, crawls near 85%, snaps to 100% on done.
  useEffect(() => {
    if (loading) {
      setSearchProgress(0);
      progressRef.current = setInterval(() => {
        setSearchProgress(prev => {
          if (prev >= 85)  return Math.min(prev + 0.15, 85); // hold near end
          if (prev >= 60)  return prev + 0.6;
          if (prev >= 30)  return prev + 1.5;
          return prev + 4;
        });
      }, 200);
    } else {
      if (progressRef.current) clearInterval(progressRef.current);
      if (searchProgress > 0) {
        // Snap to 100% then fade out
        setSearchProgress(100);
        const t = setTimeout(() => setSearchProgress(0), 600);
        return () => clearTimeout(t);
      }
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

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
        pages:      data.pages,        // pages[0] may have isContentsPage + tableOfContents
        quiz:       data.quiz,
        coverEmoji: data.coverEmoji,
        coverColor: data.coverColor,
        genre:      data.genre,
        difficulty: data.difficulty,
      });
      localStorage.setItem('bookquest-imported', JSON.stringify(stored));

      // ── Step 5: Store remaining text so the user can load Part 2 later ────
      // Full Gutenberg texts are often 300KB+; we only processed the first 50k chars.
      const fullText = typeof fetchData.text === 'string' ? fetchData.text : String(fetchData.text);
      if (fullText.length > 50000) {
        try {
          localStorage.setItem(`bookquest-remaining-${data.bookId}`, JSON.stringify({
            title:      book.title,
            gutenbergId: book.id,
            textUrl:    book.textUrl,
            text:       fullText.slice(50000),   // everything after the first chunk
            partNumber: 1,
            coverEmoji: data.coverEmoji,
            coverColor: data.coverColor,
          }));
        } catch {
          // localStorage full — skip silently, "Continue Reading" just won't appear
        }
      }

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
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-5">
            {/* Progress bar */}
            <div className="w-full max-w-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-primary">Searching Project Gutenberg…</span>
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {Math.round(searchProgress)}%
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${searchProgress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
            {/* Contextual hint */}
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Fetching results from 70,000+ public domain titles — this can take up to a minute
            </p>
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
          <div>
            {/* Prompt */}
            <div className="text-center pt-8 pb-5 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium text-foreground">Search for a classic</p>
              <p className="text-sm mt-1">
                Try "Sherlock Holmes", "Jules Verne", or "Alice in Wonderland"
              </p>
            </div>

            {/* Featured classics */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Popular Classics
              </span>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            <AnimatePresence>
              {FEATURED_BOOKS.map((book, i) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
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
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {book.downloadCount.toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleImport(book)}
                        disabled={importing !== null || imported.has(book.id)}
                        className="h-7 text-xs px-3 rounded-lg"
                      >
                        {imported.has(book.id) ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Added</>
                        ) : importing === book.id ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" />{importStep || 'Loading…'}</>
                        ) : 'Import & Read'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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

// ── Scan Cover tab ────────────────────────────────────────────────────────────
// Lets the user photograph a book cover, identifies it with AI vision,
// presents a 5-question quiz, and awards coins + XP on completion.

import { Camera, CheckCircle2, XCircle, Star, Coins } from 'lucide-react';
import { calcQuizCoins } from '@/utils/coinEconomy';
import type { Difficulty } from '@/utils/coinEconomy';

type ScanPhase = 'upload' | 'identifying' | 'quiz' | 'done';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  type: 'mcq' | 'truefalse';
}

interface BookResult {
  title: string;
  author: string;
  genre: string;
  difficulty: Difficulty;
  coverEmoji: string;
  quiz: QuizQuestion[];
}

function ScanCoverTab() {
  const [phase, setPhase]             = useState<ScanPhase>('upload');
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [book, setBook]               = useState<BookResult | null>(null);
  const [currentQ, setCurrentQ]       = useState(0);
  const [answers, setAnswers]         = useState<number[]>([]);
  const [selected, setSelected]       = useState<number | null>(null);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [xpEarned, setXpEarned]       = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Image selection ──────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPhase('identifying');

    try {
      // Convert to base64
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('identify-book-cover', {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setBook(data as BookResult);
      setPhase('quiz');
    } catch (err: any) {
      toast.error(err.message || 'Could not identify the book. Please try a clearer photo.');
      setPhase('upload');
      setPreviewUrl(null);
    }
  };

  // ── Quiz answer ──────────────────────────────────────────────────────────
  const handleAnswer = async (idx: number) => {
    if (selected !== null || !book) return;
    setSelected(idx);

    setTimeout(async () => {
      const newAnswers = [...answers, idx];

      if (currentQ < book.quiz.length - 1) {
        setAnswers(newAnswers);
        setCurrentQ(q => q + 1);
        setSelected(null);
      } else {
        // Quiz complete — calculate rewards
        const score   = newAnswers.filter((a, i) => a === book.quiz[i].correctIndex).length;
        const qCoins  = calcQuizCoins(book.difficulty, score, book.quiz.length);
        const baseXp  = 25;
        const totalCoins = qCoins + 5; // base participation coins

        setCoinsEarned(totalCoins);
        setXpEarned(baseXp);
        setAnswers(newAnswers);
        setPhase('done');

        // Persist rewards
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('xp, coins')
              .eq('user_id', user.id)
              .single();

            if (prof) {
              await supabase
                .from('profiles')
                .update({
                  xp:    ((prof as any).xp    || 0) + baseXp,
                  coins: ((prof as any).coins  || 0) + totalCoins,
                } as any)
                .eq('user_id', user.id);
            }

            await supabase.from('xp_log').insert({
              user_id:   user.id,
              xp_amount: baseXp,
              source:    'cover_quiz',
            });
          }
        } catch (e) {
          console.error('Failed to save rewards:', e);
        }
      }
    }, 900);
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setPhase('upload');
    setPreviewUrl(null);
    setBook(null);
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28">

      {/* ── Upload phase ─────────────────────────────────────────────────── */}
      {phase === 'upload' && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 gap-6">
          <div className="text-center">
            <div className="text-5xl mb-3">📸</div>
            <h2 className="text-lg font-bold">Scan a Book Cover</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Take a photo of any book cover — the AI identifies it and builds a quiz just for you
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />

          <div className="flex flex-col w-full max-w-xs gap-3">
            <Button
              className="w-full h-12 rounded-xl font-semibold gap-2"
              onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click(); } }}
            >
              <Camera className="w-5 h-5" /> Take a Photo
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl gap-2"
              onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click(); } }}
            >
              <Upload className="w-4 h-4" /> Upload from Library
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Works best with a clear, straight-on photo of the front cover in good lighting
          </p>
        </div>
      )}

      {/* ── Identifying phase ─────────────────────────────────────────────── */}
      {phase === 'identifying' && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 gap-5">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Book cover"
              className="w-32 h-44 object-cover rounded-xl shadow-lg"
            />
          )}
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="font-medium text-sm">Identifying book…</p>
            <p className="text-xs text-muted-foreground">Reading the cover with AI vision</p>
          </div>
        </div>
      )}

      {/* ── Quiz phase ────────────────────────────────────────────────────── */}
      {phase === 'quiz' && book && (() => {
        const q = book.quiz[currentQ];
        const correct = selected !== null ? selected === q.correctIndex : null;
        return (
          <div className="flex flex-col p-4 gap-4">
            {/* Book card */}
            <div className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
              <div className="text-3xl">{book.coverEmoji}</div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight line-clamp-1">{book.title}</p>
                <p className="text-xs text-muted-foreground">{book.author}</p>
                <div className="flex gap-1.5 mt-1">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">
                    {book.genre}
                  </span>
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">
                    {book.difficulty}
                  </span>
                </div>
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="" className="w-12 h-16 object-cover rounded-lg ml-auto flex-shrink-0" />
              )}
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Question {currentQ + 1} of {book.quiz.length}</span>
                <span>{answers.filter((a, i) => a === book.quiz[i].correctIndex).length} correct</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${((currentQ + 1) / book.quiz.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Question */}
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <p className="font-semibold text-sm leading-snug mb-4">{q.question}</p>
              <div className="flex flex-col gap-2">
                {q.options.map((opt, i) => {
                  let cls = 'border-border bg-background hover:bg-muted/50';
                  if (selected !== null) {
                    if (i === q.correctIndex)        cls = 'border-green-500 bg-green-500/15 text-green-400';
                    else if (i === selected)         cls = 'border-red-500 bg-red-500/15 text-red-400';
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={selected !== null}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm flex items-center justify-between transition-colors ${cls}`}
                    >
                      <span>{opt}</span>
                      {selected !== null && i === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {selected !== null && i === selected && i !== q.correctIndex && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* ── Done phase ────────────────────────────────────────────────────── */}
      {phase === 'done' && book && (() => {
        const score    = answers.filter((a, i) => a === book.quiz[i].correctIndex).length;
        const isPerfect = score === book.quiz.length;
        return (
          <div className="flex flex-col items-center p-6 gap-5">
            <div className="text-6xl">{isPerfect ? '🎉' : score >= 3 ? '⭐' : '💪'}</div>
            <div className="text-center">
              <h2 className="text-xl font-bold">
                {isPerfect ? 'Perfect Score!' : score >= 3 ? 'Great Job!' : 'Nice Try!'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                You got <span className="font-bold text-foreground">{score}</span> out of{' '}
                <span className="font-bold text-foreground">{book.quiz.length}</span> correct
              </p>
            </div>

            {/* Stars */}
            <div className="flex gap-1">
              {Array.from({ length: book.quiz.length }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-7 h-7 ${i < score ? 'text-amber-400 fill-amber-400' : 'text-muted'}`}
                />
              ))}
            </div>

            {/* Rewards */}
            <div className="bg-card rounded-2xl p-4 border border-border w-full max-w-xs text-center">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Rewards earned</p>
              <div className="flex justify-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-primary">+{xpEarned}</span>
                  <span className="text-xs text-muted-foreground">XP</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-yellow-500">+{coinsEarned}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    coins
                  </span>
                </div>
              </div>
              {isPerfect && (
                <p className="text-xs text-primary font-semibold mt-2">✨ Perfect bonus included!</p>
              )}
            </div>

            <Button className="w-full max-w-xs h-11 rounded-xl" onClick={reset}>
              Scan Another Book
            </Button>
          </div>
        );
      })()}
    </div>
  );
}

// ── Import Text tab ───────────────────────────────────────────────────────────

function ImportTextTab() {
  const navigate = useNavigate();
  const [title, setTitle]         = useState('');
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [pdfState, setPdfState]   = useState<
    'idle' | 'extracting' | 'done' | 'error'
  >('idle');
  const [pdfInfo, setPdfInfo]     = useState<{ name: string; pages: number; chars: number } | null>(null);
  const pdfRef                    = useRef<HTMLInputElement>(null);

  // ── PDF extraction (client-side via pdfjs-dist) ──────────────────────────
  const handlePdf = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file.');
      return;
    }

    setPdfState('extracting');
    setPdfInfo(null);
    setText('');

    try {
      const pdfjsLib = await import('pdfjs-dist');

      // pdfjs-dist v4 uses .mjs worker — hardcode version to match package.json
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const pageTexts: string[] = [];

      for (let p = 1; p <= pdf.numPages; p++) {
        const page    = await pdf.getPage(p);
        const content = await page.getTextContent();

        let pageText = '';
        let lastY: number | null = null;
        for (const item of content.items as any[]) {
          if (!item.str) continue;
          const y = item.transform?.[5];
          if (lastY !== null && Math.abs(y - lastY) > 5) pageText += '\n';
          pageText += item.str + (item.hasEOL ? '\n' : ' ');
          lastY = y;
        }
        pageTexts.push(pageText.trim());
      }

      // Join pages, clean up excess whitespace
      let extracted = pageTexts
        .filter(t => t.length > 0)
        .join('\n\n')
        .replace(/[ \t]{3,}/g, '  ')   // collapse horizontal whitespace
        .replace(/\n{4,}/g, '\n\n\n')  // collapse excessive blank lines
        .trim();

      if (extracted.length < 100) {
        setPdfState('error');
        toast.error('Could not extract readable text from this PDF. It may be a scanned image — try a text-based PDF.');
        return;
      }

      // Auto-fill title from filename (strip extension)
      const autoTitle = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      if (!title.trim()) setTitle(autoTitle);

      // Truncate to 50k chars (same limit as manual paste)
      const truncated = extracted.slice(0, 50000);
      setText(truncated);

      setPdfInfo({ name: file.name, pages: pdf.numPages, chars: truncated.length });
      setPdfState('done');

      if (extracted.length > 50000) {
        toast.info('PDF was trimmed to 50,000 characters to fit the import limit.');
      } else {
        toast.success(`Extracted ${truncated.length.toLocaleString()} characters from ${pdf.numPages} pages.`);
      }
    } catch (err: any) {
      console.error('PDF extraction error:', err);
      setPdfState('error');
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('password')) {
        toast.error('This PDF is password-protected. Please remove the password first.');
      } else if (msg.toLowerCase().includes('worker')) {
        toast.error('PDF worker failed to load — check your internet connection and try again.');
      } else {
        toast.error(`Failed to read the PDF: ${msg.slice(0, 80)}`);
      }
    }
  };

  // ── Submit to process-imported-book ─────────────────────────────────────
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
    <div className="flex flex-col gap-4 p-4 pb-28 overflow-y-auto">

      {/* ── PDF upload area ─────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Upload a PDF <span className="text-muted-foreground font-normal">(optional)</span>
        </label>

        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handlePdf(e.target.files[0]); }}
        />

        {pdfState === 'idle' || pdfState === 'error' ? (
          <button
            onClick={() => pdfRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">Click to upload a PDF</span>
            <span className="text-xs">Text will be extracted automatically</span>
          </button>
        ) : pdfState === 'extracting' ? (
          <div className="w-full border border-border rounded-xl p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Reading PDF…</p>
              <p className="text-xs text-muted-foreground">Extracting text from all pages</p>
            </div>
          </div>
        ) : (
          /* done */
          <div className="w-full border border-primary/40 bg-primary/5 rounded-xl p-4 flex items-center gap-3">
            <div className="text-2xl">📄</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{pdfInfo?.name}</p>
              <p className="text-xs text-muted-foreground">
                {pdfInfo?.pages} pages · {pdfInfo?.chars.toLocaleString()} chars extracted
              </p>
            </div>
            <button
              onClick={() => { setPdfState('idle'); setPdfInfo(null); setText(''); }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        <span>or paste text manually</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Title ───────────────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Book Title</label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. My Summer Adventure"
          className="rounded-xl"
        />
      </div>

      {/* ── Text area ───────────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Book text
          <span className="text-muted-foreground font-normal ml-2 text-xs">
            ({text.length.toLocaleString()} / 50,000 chars)
          </span>
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, 50000))}
          placeholder={pdfState === 'done'
            ? 'Text extracted from PDF — you can edit it before importing…'
            : 'Paste your story or book text here…'}
          rows={10}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Content is reviewed for age-appropriateness. The AI will detect chapters (if any), split the text into pages, and create a quiz.
        </p>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <Button
        onClick={handleImport}
        disabled={loading || !title.trim() || text.trim().length < 100}
        className="w-full h-11 rounded-xl font-bold"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing…</>
          : 'Import Book 📚'
        }
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PublicLibrary = () => {
  const navigate = useNavigate();
  const [tab, setTab]     = useState<Tab>('browse');
  // undefined = resolving, null = guest, string = logged-in uid
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

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
          <p className="text-xs text-muted-foreground">Browse 70,000+ classics or scan a cover</p>
        </div>
      </div>

      {/* ── Auth resolving ───────────────────────────────────────────────── */}
      {userId === undefined && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── Sign-in gate (all tabs) ──────────────────────────────────────── */}
      {userId === null && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-card rounded-2xl p-8 text-center shadow-sm border border-border w-full max-w-sm flex flex-col items-center gap-3">
            <div className="text-4xl mb-1">📚</div>
            <h2 className="text-lg font-bold">Sign in to use the Book Library</h2>
            <p className="text-sm text-muted-foreground">
              Create a free account to browse classics, scan covers, and import your own books.
            </p>
            <Button
              className="mt-2 w-full rounded-xl"
              onClick={() => navigate('/auth')}
            >
              Sign In / Sign Up →
            </Button>
          </div>
        </div>
      )}

      {/* ── Tabs (logged-in users only) ──────────────────────────────────── */}
      {userId && (<>
        {/* Tab bar */}
        <div className="flex border-b border-border flex-shrink-0">
          {([
            { key: 'browse', label: 'Browse',      icon: Search },
            { key: 'scan',   label: 'Scan Cover',  icon: Camera },
            { key: 'text',   label: 'Import Text', icon: Upload },
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
              {tab === 'browse' ? <BrowseTab /> : tab === 'scan' ? <ScanCoverTab /> : <ImportTextTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </>)}    </div>
  );
};

export default PublicLibrary;
