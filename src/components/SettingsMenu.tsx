import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { ACCENT_COLORS } from '@/types/book';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sun, Moon, X, LogOut, UserPlus, MessageCircle, Send, Shield, Zap, User, BookOpen as BookOpenIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface SettingsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const READING_LEVELS = [
  { key: 'beginner' as const, label: '🌱 Beginner', desc: 'Simple stories' },
  { key: 'reader' as const, label: '🌿 Reader', desc: 'Mixed difficulty' },
  { key: 'experienced' as const, label: '🔥 Experienced', desc: 'Advanced content' },
];

const SettingsMenu = ({ open, onOpenChange }: SettingsMenuProps) => {
  const { settings, updateSettings, progress, updateProgress, undislikeBook, getUserLevel } = useApp();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSent, setSupportSent] = useState(false);
  const dislikedBooks = books.filter(b => progress.dislikedBooks.includes(b.id));
  const userLevel = getUserLevel();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReadingLevelChange = async (level: 'beginner' | 'reader' | 'experienced') => {
    updateProgress({ readingLevel: level });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.from('profiles').update({ reading_level: level }).eq('user_id', authUser.id);
    }
    toast.success(`Reading level set to ${level}`);
  };

  const handleLogout = async () => {
    if (user) {
      await supabase.auth.signOut();
      toast.success('Logged out!');
    }
    localStorage.removeItem('bookquest-progress');
    localStorage.removeItem('bookquest-settings');
    onOpenChange(false);
    window.location.href = '/';
  };

  const handleSupportSubmit = () => {
    if (!supportMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    toast.success('Message sent! We\'ll get back to you soon.');
    setSupportSent(true);
    setSupportMessage('');
    setSupportEmail('');
    setTimeout(() => setSupportSent(false), 3000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="rounded-l-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Theme toggle */}
          <div>
            <h3 className="font-semibold mb-3">Theme</h3>
            <div className="flex gap-3">
              <button onClick={() => updateSettings({ darkMode: false })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${!settings.darkMode ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <Sun className="w-4 h-4" /> Light
              </button>
              <button onClick={() => updateSettings({ darkMode: true })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${settings.darkMode ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <Moon className="w-4 h-4" /> Dark
              </button>
            </div>
          </div>

          {/* Accent color */}
          <div>
            <h3 className="font-semibold mb-3">Accent Color</h3>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map(color => {
                const hsl = `${color.hue} ${color.saturation}% ${color.lightness}%`;
                return (
                  <button key={color.name} onClick={() => updateSettings({ accentColor: hsl })}
                    className={`w-10 h-10 rounded-full border-3 transition-all hover:scale-110 ${settings.accentColor === hsl ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: `hsl(${hsl})` }} title={color.name} />
                );
              })}
            </div>
          </div>

          {/* Reading Level Preference */}
          <div>
            <h3 className="font-semibold mb-3">Reading Level</h3>
            <div className="flex flex-col gap-2">
              {READING_LEVELS.map(rl => (
                <button key={rl.key} onClick={() => handleReadingLevelChange(rl.key)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${progress.readingLevel === rl.key ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <div>
                    <span className="font-medium text-sm">{rl.label}</span>
                    <p className="text-xs text-muted-foreground">{rl.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 className="font-semibold mb-2">Your Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded-xl bg-muted text-center">
                <p className="font-bold text-primary">{userLevel.score}</p>
                <p className="text-xs text-muted-foreground">Reading Score</p>
              </div>
              <div className="p-2 rounded-xl bg-muted text-center">
                <p className="font-bold text-primary">Lv.{userLevel.level}</p>
                <p className="text-xs text-muted-foreground">{userLevel.title}</p>
              </div>
              <div className="p-2 rounded-xl bg-muted text-center">
                <p className="font-bold flex items-center justify-center gap-1"><Zap className="w-3 h-3" />{progress.bestQuizStreak}</p>
                <p className="text-xs text-muted-foreground">Best Quiz Streak</p>
              </div>
              <div className="p-2 rounded-xl bg-muted text-center">
                <p className="font-bold flex items-center justify-center gap-1"><Shield className="w-3 h-3" />{progress.streakSavers}</p>
                <p className="text-xs text-muted-foreground">Streak Savers</p>
              </div>
            </div>
          </div>

          {/* Disliked Books */}
          {dislikedBooks.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Disliked Books</h3>
              <p className="text-xs text-muted-foreground mb-2">Tap × to see them again</p>
              <div className="space-y-2">
                {dislikedBooks.map(book => (
                  <div key={book.id} className="flex items-center justify-between p-3 rounded-xl bg-muted">
                    <div className="flex items-center gap-2">
                      <span>{book.coverEmoji}</span>
                      <span className="text-sm font-medium">{book.title}</span>
                    </div>
                    <button onClick={() => undislikeBook(book.id)}
                      className="p-1 rounded-lg hover:bg-destructive/20 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Service */}
          <div className="pt-2 border-t border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Customer Service
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Send us feedback, report issues, or request new books to be added.
            </p>
            {!supportSent ? (
              <div className="space-y-2">
                <Input
                  value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  className="rounded-xl text-sm"
                />
                <Textarea
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                  placeholder="Describe your feedback, issue, or book request..."
                  className="rounded-xl text-sm min-h-[80px]"
                  maxLength={500}
                />
                <Button size="sm" className="w-full rounded-xl" onClick={handleSupportSubmit}>
                  <Send className="w-4 h-4 mr-2" /> Send Message
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-primary font-semibold">✅ Message sent!</p>
                <p className="text-xs text-muted-foreground">We'll review your feedback soon.</p>
              </div>
            )}
          </div>

          {/* Profile & Tutorial */}
          <div className="pt-2 border-t border-border space-y-2">
            {user && (
              <Button variant="outline" className="w-full rounded-xl" onClick={() => { onOpenChange(false); navigate('/profile-setup'); }}>
                <User className="w-4 h-4 mr-2" /> Edit Profile & School
              </Button>
            )}
            <Button variant="outline" className="w-full rounded-xl" onClick={() => {
              localStorage.removeItem('bookquest-tutorial-done');
              onOpenChange(false);
              window.location.reload();
            }}>
              <BookOpenIcon className="w-4 h-4 mr-2" /> Replay Tutorial
            </Button>
          </div>

          {/* Account */}
          <div className="pt-2 border-t border-border space-y-3">
            {!user && (
              <Button variant="outline" className="w-full rounded-xl" onClick={() => { onOpenChange(false); navigate('/auth'); }}>
                <UserPlus className="w-4 h-4 mr-2" /> Sign In / Sign Up
              </Button>
            )}
            <Button variant="destructive" className="w-full rounded-xl" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> {user ? 'Log Out' : 'Reset & Log Out'}
            </Button>
            {user && <p className="text-xs text-muted-foreground text-center">{user.email}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsMenu;
