import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Loader2, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

type ImportState = 'input' | 'processing' | 'success' | 'error';

const ImportBook = () => {
  const navigate = useNavigate();
  const { likeBook } = useApp();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [state, setState] = useState<ImportState>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleImport = async () => {
    if (!user) {
      toast.error('Please sign in to import books');
      navigate('/auth');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (text.trim().length < 100) {
      toast.error('Text must be at least 100 characters');
      return;
    }
    if (text.length > 50000) {
      toast.error('Text must be under 50,000 characters');
      return;
    }

    setState('processing');
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('process-imported-book', {
        body: { title: title.trim(), text: text.trim() },
      });

      if (error) {
        throw new Error(error.message || 'Failed to process book');
      }

      if (data?.error) {
        setState('error');
        setErrorMsg(data.reason || data.error);
        return;
      }

      setResult(data);
      setState('success');

      // Store imported book locally for reading
      const importedBooks = JSON.parse(localStorage.getItem('bookquest-imported') || '[]');
      importedBooks.push({
        id: `imported-${data.bookId}`,
        title: data.title,
        genre: data.genre,
        summary: `Imported book: ${data.title}`,
        coverColor: data.coverColor,
        coverEmoji: data.coverEmoji,
        pages: data.pages,
        quiz: data.quiz,
        difficulty: data.difficulty,
        isImported: true,
      });
      localStorage.setItem('bookquest-imported', JSON.stringify(importedBooks));

      toast.success('Book imported successfully!');
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || 'Something went wrong');
    }
  };

  if (state === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Processing Your Book</h2>
          <p className="text-muted-foreground text-sm">
            Checking content, creating pages, generating quiz...
          </p>
          <p className="text-xs text-muted-foreground mt-2">This may take a moment</p>
        </motion.div>
      </div>
    );
  }

  if (state === 'success' && result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background pb-24">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Book Imported!</h2>
          <p className="text-muted-foreground mb-1">{result.title}</p>
          <div className="flex gap-2 justify-center mb-6">
            <span className="text-xs bg-muted px-2 py-1 rounded-full">{result.genre}</span>
            <span className="text-xs bg-muted px-2 py-1 rounded-full">{result.difficulty}</span>
            <span className="text-xs bg-muted px-2 py-1 rounded-full">{result.pages?.length} pages</span>
            <span className="text-xs bg-muted px-2 py-1 rounded-full">{result.quiz?.length} quiz Qs</span>
          </div>
          <div className="flex flex-col gap-3">
            <Button className="rounded-2xl" onClick={() => navigate(`/read/imported-${result.bookId}`)}>
              <BookOpen className="w-4 h-4 mr-2" /> Read Now
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => {
              setState('input');
              setTitle('');
              setText('');
              setResult(null);
            }}>
              Import Another
            </Button>
          </div>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background pb-24">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Import Failed</h2>
          <p className="text-muted-foreground mb-6">{errorMsg}</p>
          <Button className="rounded-2xl" onClick={() => setState('input')}>
            Try Again
          </Button>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-2xl">Import a Book</h1>
        </div>

        {!user && (
          <div className="p-4 rounded-2xl bg-muted mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Sign in to import books</p>
            <Button size="sm" className="rounded-xl" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">Book Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter the book title"
              className="rounded-2xl"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Book Text</label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste or type the full text of the book here..."
              className="rounded-2xl min-h-[250px]"
              maxLength={50000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {text.length}/50,000 characters · Min 100 characters
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-muted/50 border border-border">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Content Guidelines
            </h3>
            <p className="text-xs text-muted-foreground">
              All imported content is checked by AI for appropriateness. Content with violence,
              profanity, inappropriate themes, or harmful material will be rejected.
              This app is designed for young readers ages 6-14.
            </p>
          </div>

          <Button
            className="w-full rounded-2xl"
            onClick={handleImport}
            disabled={!title.trim() || text.length < 100 || !user}
          >
            <Upload className="w-4 h-4 mr-2" /> Import & Generate Quiz
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            AI will split your text into pages, generate illustrations descriptions, and create a quiz.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default ImportBook;
