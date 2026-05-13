import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { ACCENT_COLORS, AgeGroup } from '@/types/book';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LibraryBackground from '@/components/LibraryBackground';

type Step = 'welcome' | 'theme' | 'level' | 'age';

const AGE_OPTIONS: { value: AgeGroup; label: string; emoji: string; desc: string }[] = [
  { value: '3-8', label: '5–8', emoji: '🧒', desc: 'Early readers' },
  { value: '8-11', label: '8–11', emoji: '📖', desc: 'Growing readers' },
  { value: '12-17+', label: '12–17+', emoji: '📚', desc: 'Teen & young adult' },
];

const Welcome = () => {
  const [step, setStep] = useState<Step>('welcome');
  const { settings, updateSettings, updateProgress } = useApp();
  const navigate = useNavigate();

  const handleStart = () => setStep('theme');
  const handleThemeDone = () => setStep('level');

  const handleLevelPick = (level: 'beginner' | 'reader') => {
    updateProgress({ readingLevel: level });
    setStep('age');
  };

  const handleAgePick = (ageGroup: AgeGroup) => {
    updateSettings({ ageGroup, onboarded: true });
    navigate('/discover');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <LibraryBackground />

      <div className="relative z-10 min-h-screen flex flex-col md:flex-row">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              className="flex flex-col md:flex-row w-full min-h-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                  <div className="text-8xl mb-4">📚</div>
                </motion.div>
                <motion.h1
                  className="font-display text-5xl md:text-6xl text-white mb-2 drop-shadow-lg"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  BookQuest
                </motion.h1>
                <motion.p
                  className="text-white/70 text-lg"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Your reading adventure starts here!
                </motion.p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                <motion.div
                  className="w-full max-w-xs flex flex-col gap-3 bg-background/90 dark:bg-background/85 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-border/50"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2 className="text-2xl font-bold text-center mb-4 text-foreground">Get Started</h2>
                  <Button size="lg" className="w-full text-lg h-14 rounded-2xl" onClick={handleStart}>
                    <Sparkles className="w-5 h-5 mr-2" /> Continue as Guest
                  </Button>
                  <Button variant="outline" size="lg" className="w-full text-lg h-14 rounded-2xl" onClick={() => navigate('/auth')}>
                    Sign In / Sign Up
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === 'theme' && (
            <motion.div
              key="theme"
              className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen w-full"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <div className="bg-background/90 dark:bg-background/85 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/50 max-w-md w-full">
                <h2 className="font-display text-3xl mb-6 text-center text-foreground">Pick Your Style</h2>

                <div className="flex gap-4 mb-8 justify-center">
                  <button
                    onClick={() => updateSettings({ darkMode: false })}
                    className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all ${!settings.darkMode ? 'border-primary bg-primary/10 scale-105' : 'border-border'}`}
                  >
                    <Sun className="w-10 h-10 text-amber-500" />
                    <span className="font-semibold text-foreground">Light</span>
                  </button>
                  <button
                    onClick={() => updateSettings({ darkMode: true })}
                    className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all ${settings.darkMode ? 'border-primary bg-primary/10 scale-105' : 'border-border'}`}
                  >
                    <Moon className="w-10 h-10 text-indigo-400" />
                    <span className="font-semibold text-foreground">Dark</span>
                  </button>
                </div>

                <h3 className="text-xl font-semibold mb-4 text-center text-foreground">Choose Your Color</h3>
                <div className="flex gap-3 flex-wrap justify-center mb-8">
                  {ACCENT_COLORS.map(color => {
                    const hsl = `${color.hue} ${color.saturation}% ${color.lightness}%`;
                    const isSelected = settings.accentColor === hsl;
                    return (
                      <button
                        key={color.name}
                        onClick={() => updateSettings({ accentColor: hsl })}
                        className={`w-14 h-14 rounded-full border-4 transition-all hover:scale-110 ${isSelected ? 'border-foreground scale-110 ring-2 ring-foreground/20' : 'border-transparent'}`}
                        style={{ backgroundColor: `hsl(${hsl})` }}
                        title={color.name}
                      />
                    );
                  })}
                </div>

                <Button size="lg" className="rounded-2xl text-lg px-8 w-full" onClick={handleThemeDone}>
                  Next →
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'level' && (
            <motion.div
              key="level"
              className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen w-full"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <div className="bg-background/90 dark:bg-background/85 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/50 max-w-md w-full text-center">
                <h2 className="font-display text-3xl mb-2 text-foreground">How much do you read?</h2>
                <p className="text-muted-foreground mb-8">This helps us pick the right books for you</p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => handleLevelPick('beginner')}
                    className="p-8 rounded-3xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-3 max-w-[200px] mx-auto"
                  >
                    <span className="text-5xl">🌱</span>
                    <span className="font-bold text-lg text-foreground">I'm New!</span>
                    <span className="text-sm text-muted-foreground text-center">Just starting to read</span>
                  </button>
                  <button
                    onClick={() => handleLevelPick('reader')}
                    className="p-8 rounded-3xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-3 max-w-[200px] mx-auto"
                  >
                    <BookOpen className="w-12 h-12 text-primary" />
                    <span className="font-bold text-lg text-foreground">I Love Reading!</span>
                    <span className="text-sm text-muted-foreground text-center">I read books often</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'age' && (
            <motion.div
              key="age"
              className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen w-full"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <div className="bg-background/90 dark:bg-background/85 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/50 max-w-md w-full text-center">
                <h2 className="font-display text-3xl mb-2 text-foreground">How old are you?</h2>
                <p className="text-muted-foreground mb-8">We'll show you books perfect for your age</p>

                <div className="flex flex-col gap-4">
                  {AGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleAgePick(opt.value)}
                      className="p-6 rounded-3xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4"
                    >
                      <span className="text-4xl">{opt.emoji}</span>
                      <div className="text-left">
                        <span className="font-bold text-lg text-foreground">{opt.label}</span>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Welcome;
