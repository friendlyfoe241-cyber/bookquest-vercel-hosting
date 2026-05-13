import { useApp } from '@/contexts/AppContext';
import { books } from '@/data/books';
import { ACCENT_COLORS, AgeGroup } from '@/types/book';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sun, Moon, X, LogOut, UserPlus, MessageCircle, Send, Shield, Zap, User, BookOpen as BookOpenIcon, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { toast } from 'sonner';

const DevPanel = lazy(() => import('@/components/DevPanel'));
const DEV_CODE = '241';

interface SettingsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const READING_LEVELS = [
  { key: 'beginner' as const, label: '🌱 Beginner', desc: 'Simple stories' },
  { key: 'reader' as const, label: '🌿 Reader', desc: 'Mixed difficulty' },
  { key: 'experienced' as const, label: '🔥 Experienced', desc: 'Advanced content' },
];

const AGE_GROUPS: { key: AgeGroup; label: string; desc: string }[] = [
  { key: '3-8', label: '🧒 Ages 5–8', desc: 'Early readers' },
  { key: '8-11', label: '📖 Ages 8–11', desc: 'Growing readers' },
  { key: '12-17+', label: '📚 Ages 12–17+', desc: 'Teen & young adult' },
];

const SettingsMenu = ({ open, onOpenChange }: SettingsMenuProps) => {
  const { settings, updateSettings, progress, updateProgress, undislikeBook, getUserLevel } = useApp();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSent, setSupportSent] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(() => localStorage.getItem('bq-dev') === '1');
  const [devCode, setDevCode] = useState('');
  const [devExpanded, setDevExpanded] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showCodeInput, setShowCodeInput] = useState(false);
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

  const handleAgeGroupChange = async (ageGroup: AgeGroup) => {
    updateSettings({ ageGroup });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.from('profiles').update({ age_group: ageGroup } as any).eq('user_id', authUser.id);
    }
    toast.success(`Age group set to ${ageGroup}`);
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

          {/* Age Group */}
          <div>
            <h3 className="font-semibold mb-3">Age Group</h3>
            <div className="flex flex-col gap-2">
              {AGE_GROUPS.map(ag => (
                <button key={ag.key} onClick={() => handleAgeGroupChange(ag.key)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${settings.ageGroup === ag.key ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <div>
                    <span className="font-medium text-sm">{ag.label}</span>
                    <p className="text-xs text-muted-foreground">{ag.desc}</p>
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

          {/* Hidden Dev Mode */}
          <div className="pt-2 border-t border-border">
            {devUnlocked ? (
              <div>
                <button onClick={() => setDevExpanded(!devExpanded)}
                  className="flex items-center gap-2 w-full text-left font-semibold mb-3">
                  <Code2 className="w-4 h-4 text-primary" />
                  <span>Developer Mode</span>
                  <span className="text-xs text-muted-foreground ml-auto">{devExpanded ? '▲' : '▼'}</span>
                </button>
                {devExpanded && (
                  <Suspense fallback={<div className="text-center text-sm text-muted-foreground py-4">Loading...</div>}>
                    <DevPanel />
                  </Suspense>
                )}
              </div>
            ) : (
              <>
                {!showCodeInput ? (
                  <button
                    onClick={() => {
                      const next = tapCount + 1;
                      setTapCount(next);
                      if (next >= 5) {
                        setShowCodeInput(true);
                        setTapCount(0);
                      }
                    }}
                    className="w-full text-xs text-muted-foreground/30 py-1 text-center select-none"
                  >
                    v1.0.0
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={devCode}
                      onChange={e => setDevCode(e.target.value)}
                      placeholder="Enter code"
                      type="password"
                      className="rounded-xl text-sm flex-1"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && devCode === DEV_CODE) {
                          setDevUnlocked(true);
                          setDevExpanded(true);
                          localStorage.setItem('bq-dev', '1');
                          toast.success('Developer Mode unlocked!');
                        } else if (e.key === 'Enter') {
                          toast.error('Invalid code');
                          setDevCode('');
                        }
                      }}
                    />
                    <Button size="sm" className="rounded-xl" onClick={() => {
                      if (devCode === DEV_CODE) {
                        setDevUnlocked(true);
                        setDevExpanded(true);
                        localStorage.setItem('bq-dev', '1');
                        toast.success('Developer Mode unlocked!');
                      } else {
                        toast.error('Invalid code');
                        setDevCode('');
                      }
                    }}>Unlock</Button>
                  </div>
                )}
              </>
            )}
          </div>

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

          {/* Guest warning */}
          {!user && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Guest Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your data is saved locally on this browser only. Sign in to save your progress permanently across all devices.
                  </p>
                </div>
              </div>
            </div>
          )}

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
