import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, BookOpen, Loader2, ChevronDown } from 'lucide-react';

const GENRES = ['Adventure', 'Fantasy', 'Animals', 'Action', 'Mystery', 'Sci-Fi', 'Classic'] as const;
const DIFFICULTIES = ['beginner', 'intermediate', 'experienced'] as const;
const DIFF_LABELS: Record<string, string> = { beginner: '🌱 Beginner', intermediate: '🌿 Intermediate', experienced: '🔥 Expert' };

const WORDS_PER_PAGE = 200;

function paginateText(raw: string): { text: string; imageDescription: string }[] {
  const paragraphs = raw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const pages: { text: string; imageDescription: string }[] = [];
  let buffer = '';
  let wordCount = 0;

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).length;
    if (wordCount + paraWords > WORDS_PER_PAGE && buffer) {
      pages.push({ text: buffer.trim(), imageDescription: '' });
      buffer = '';
      wordCount = 0;
    }
    buffer += (buffer ? '\n\n' : '') + para;
    wordCount += paraWords;
  }
  if (buffer.trim()) {
    pages.push({ text: buffer.trim(), imageDescription: '' });
  }
  return pages.length > 0 ? pages : [{ text: raw.trim(), imageDescription: '' }];
}

function generateId(title: string): string {
  return 'dev-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-' + Date.now().toString(36);
}

export default function DevPanel() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [summary, setSummary] = useState('');
  const [genre, setGenre] = useState<typeof GENRES[number]>('Adventure');
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>('intermediate');
  const [bookText, setBookText] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const wordCount = bookText.trim() ? bookText.trim().split(/\s+/).length : 0;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE));

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setSummary('');
    setGenre('Adventure');
    setDifficulty('intermediate');
    setBookText('');
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!bookText.trim() || wordCount < 50) { toast.error('Book text must be at least 50 words'); return; }
    if (!summary.trim()) { toast.error('Summary/description is required'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('You must be signed in'); setSaving(false); return; }

      const bookId = generateId(title);
      const pages = paginateText(bookText);

      // Upload cover if provided
      let coverEmoji = '📖';
      let coverColor = 'from-slate-600 to-slate-800';

      if (coverFile) {
        const ext = coverFile.name.split('.').pop() || 'jpg';
        const path = `${user.id}/dev-covers/${bookId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('imported-illustrations')
          .upload(path, coverFile, { upsert: true });
        if (uploadErr) {
          console.error('Cover upload error:', uploadErr);
          toast.error('Cover upload failed, saving without cover');
        } else {
          const { data: signedData } = await supabase.storage.from('imported-illustrations').createSignedUrl(path, 60 * 60 * 24 * 365);
          coverColor = signedData?.signedUrl || 'from-slate-600 to-slate-800';
          coverEmoji = '🖼️';
        }
      }

      // Insert via edge function (service role)
      const { data: funcData, error } = await supabase.functions.invoke('add-book', {
        body: {
          id: bookId,
          title: title.trim(),
          genre,
          summary: summary.trim(),
          difficulty,
          cover_emoji: coverEmoji,
          cover_color: coverColor,
          pages: pages as any,
          quiz: [] as any,
          batch: 99,
        },
      });

      if (error || funcData?.error) {
        const errMsg = error?.message || funcData?.error || 'Unknown error';
        console.error('Insert error:', errMsg);
        toast.error('Failed to save book: ' + errMsg);
      } else {
        toast.success(`"${title}" added! (${pages.length} pages)`);
        resetForm();
      }
    } catch (err: any) {
      toast.error('Error: ' + (err?.message || 'Unknown'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl">
        <BookOpen className="w-4 h-4 shrink-0" />
        <span>Paste full book text below. It will be auto-paginated (~{WORDS_PER_PAGE} words/page).</span>
      </div>

      {/* Title & Author */}
      <div className="grid grid-cols-2 gap-2">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Book Title *" className="rounded-xl text-sm" />
        <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author (optional)" className="rounded-xl text-sm" />
      </div>

      {/* Summary */}
      <Textarea value={summary} onChange={e => setSummary(e.target.value)}
        placeholder="Short description / summary *" className="rounded-xl text-sm min-h-[60px]" maxLength={500} />

      {/* Genre & Difficulty */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <select value={genre} onChange={e => setGenre(e.target.value as any)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm appearance-none pr-8">
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-3 pointer-events-none text-muted-foreground" />
        </div>
        <div className="relative">
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm appearance-none pr-8">
            {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-3 pointer-events-none text-muted-foreground" />
        </div>
      </div>

      {/* Cover upload */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> {coverFile ? 'Change Cover' : 'Upload Cover'}
          </Button>
          {coverPreview && (
            <img src={coverPreview} alt="Cover preview" className="h-12 w-9 rounded object-cover border border-border" />
          )}
          {coverFile && <span className="text-xs text-muted-foreground">{coverFile.name}</span>}
        </div>
      </div>

      {/* Book text */}
      <div>
        <Textarea value={bookText} onChange={e => setBookText(e.target.value)}
          placeholder="Paste full book content here... Separate paragraphs with blank lines for best results."
          className="rounded-xl text-sm min-h-[200px] font-mono" />
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{wordCount.toLocaleString()} words</span>
          <span>~{estimatedPages} pages</span>
        </div>
      </div>

      {/* Submit */}
      <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><BookOpen className="w-4 h-4 mr-2" /> Add Book to Library</>}
      </Button>
    </div>
  );
}
