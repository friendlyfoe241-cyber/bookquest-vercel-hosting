import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Compass, BookOpen, Heart, Trophy, ShoppingBag, Users, Settings, Upload } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Discover Books 📚',
    description: 'Swipe through curated book picks! Swipe right to like a book, left to pass. New picks arrive every hour.',
    icon: <Compass className="w-8 h-8" />,
    highlight: 'discover',
  },
  {
    title: 'Your Collection ❤️',
    description: 'Books you like appear on the "For You" page. Tap any book to start reading!',
    icon: <Heart className="w-8 h-8" />,
    highlight: 'foryou',
  },
  {
    title: 'Import a Book 📖',
    description: 'Log books you\'ve read! Type the title or upload a photo of the cover. We\'ll auto-generate a quiz for you.',
    icon: <Upload className="w-8 h-8" />,
    highlight: 'import',
  },
  {
    title: 'Browse the Library 🔍',
    description: 'Explore all available books. Filter by genre, difficulty, and search by title.',
    icon: <BookOpen className="w-8 h-8" />,
    highlight: 'library',
  },
  {
    title: 'Earn XP & Level Up ⭐',
    description: 'Read books, complete quizzes, and maintain streaks to earn XP. Level up to unlock achievements and earn coins!',
    icon: <Trophy className="w-8 h-8" />,
    highlight: 'achievements',
  },
  {
    title: 'Compete & Connect 🏆',
    description: 'Check the Leaderboard to see how you rank against friends, your class, school, or globally. Add friends to compete!',
    icon: <Users className="w-8 h-8" />,
    highlight: 'leaderboard',
  },
  {
    title: 'Visit the Shop 🛒',
    description: 'Spend earned coins on themes, avatars, pets, and XP boosts. Pets give you a permanent XP bonus!',
    icon: <ShoppingBag className="w-8 h-8" />,
    highlight: 'shop',
  },
  {
    title: 'Customize Settings ⚙️',
    description: 'Set your reading level, choose a theme, pick an accent color, and set your school & class for leaderboards.',
    icon: <Settings className="w-8 h-8" />,
    highlight: 'settings',
  },
];

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const TutorialOverlay = ({ isOpen, onClose }: TutorialOverlayProps) => {
  const [step, setStep] = useState(0);
  const total = TUTORIAL_STEPS.length;
  const current = TUTORIAL_STEPS[step];

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else handleFinish();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = () => {
    localStorage.setItem('bookquest-tutorial-done', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={e => { if (e.target === e.currentTarget) handleFinish(); }}
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border relative"
      >
        {/* Skip button */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mb-6">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          {current.icon}
        </div>

        {/* Content */}
        <h2 className="font-display text-xl text-center mb-2">{current.title}</h2>
        <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
          {current.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              step === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-muted'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <span className="text-xs text-muted-foreground">{step + 1} / {total}</span>

          <button
            onClick={next}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {step === total - 1 ? "Let's Go!" : 'Next'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TutorialOverlay;
