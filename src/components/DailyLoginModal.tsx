import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DailyReward, DAILY_REWARDS } from '@/utils/coinEconomy';

interface DailyLoginModalProps {
  open: boolean;
  reward: DailyReward | null;
  streak: number;
  onClaim: () => void;
  onClose: () => void;
}

const DailyLoginModal = ({ open, reward, streak, onClaim, onClose }: DailyLoginModalProps) => {
  if (!open || !reward) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.7, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.7, y: 40 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="bg-card rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-border relative"
        >
          <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
            className="text-6xl mb-3"
          >
            {reward.specialReward ? '🐉' : '🎁'}
          </motion.div>

          <h2 className="font-display text-xl font-bold text-foreground mb-1">
            Daily Login Reward!
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Day {streak} streak 🔥
          </p>

          <div className="bg-muted/50 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
              <Coins className="w-6 h-6 text-yellow-500" />
              <span>+{reward.coins}</span>
            </div>
            {reward.label && (
              <p className="text-sm text-primary font-semibold mt-1">{reward.label}</p>
            )}
            {reward.specialReward && (
              <p className="text-xs text-muted-foreground mt-1">
                Golden Dragon pet triples your XP! 🐉✨
              </p>
            )}
          </div>

          {/* Mini calendar showing upcoming rewards */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {DAILY_REWARDS.slice(0, 7).map((r, i) => {
              const isToday = i === (streak - 1) % 7;
              const isPast = i < (streak - 1) % 7;
              return (
                <div
                  key={i}
                  className={`rounded-lg py-1 text-xs font-medium ${
                    isToday
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                      : isPast
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="text-[10px]">D{i + 1}</div>
                  <div className="flex items-center justify-center">
                    <Coins className="w-2.5 h-2.5 text-yellow-500 mr-0.5" />
                    {r.coins}
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={onClaim} className="w-full rounded-2xl font-bold">
            <Gift className="w-4 h-4 mr-2" /> Claim Reward!
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DailyLoginModal;
