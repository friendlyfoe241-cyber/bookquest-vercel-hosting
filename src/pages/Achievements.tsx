import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAchievements } from '@/hooks/useAchievements';
import { Achievement } from '@/data/achievements';

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  reading: { label: 'Reading', emoji: '📚' },
  streak: { label: 'Streaks', emoji: '🔥' },
  quiz: { label: 'Quizzes', emoji: '⭐' },
  discovery: { label: 'Discovery', emoji: '🧭' },
  social: { label: 'Social', emoji: '💬' },
};

const Achievements = () => {
  const navigate = useNavigate();
  const { unlocked, locked, all, stats } = useAchievements();

  const categories = [...new Set(all.map(a => a.category))];
  const progress = Math.round((unlocked.length / all.length) * 100);

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-primary flex items-center gap-2">
            <Trophy className="w-7 h-7" /> Badges
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-primary">{unlocked.length}/{all.length}</p>
          <p className="text-[10px] text-muted-foreground">unlocked</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-muted rounded-full h-3 mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { label: 'Books', value: stats.booksRead, emoji: '📖' },
          { label: 'Streak', value: stats.streak, emoji: '🔥' },
          { label: 'Perfect', value: stats.perfectQuizzes, emoji: '⭐' },
          { label: 'Reviews', value: stats.reviewsWritten, emoji: '✍️' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-2xl p-3 text-center border border-border">
            <div className="text-lg">{stat.emoji}</div>
            <p className="font-bold text-lg text-primary">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Badge categories */}
      {categories.map(category => {
        const cat = CATEGORY_LABELS[category];
        const categoryAchievements = all.filter(a => a.category === category);
        return (
          <section key={category} className="mb-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>{cat.emoji}</span> {cat.label}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {categoryAchievements.map((achievement, i) => {
                const isUnlocked = unlocked.some(u => u.id === achievement.id);
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`relative rounded-2xl p-3 text-center border transition-all ${
                      isUnlocked
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-muted/50 border-border opacity-60'
                    }`}
                  >
                    <div className={`text-3xl mb-1 ${isUnlocked ? '' : 'grayscale'}`}>
                      {isUnlocked ? achievement.emoji : '🔒'}
                    </div>
                    <p className="text-[11px] font-bold leading-tight">{achievement.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{achievement.description}</p>
                    {isUnlocked && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                      >
                        <span className="text-[10px]">✓</span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Achievements;
