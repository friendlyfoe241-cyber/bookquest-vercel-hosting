import { useState, useEffect, useCallback } from 'react';
import { QTEEvent } from '@/types/book';
import { motion, AnimatePresence } from 'framer-motion';

interface QTEOverlayProps {
  qte: QTEEvent;
  onComplete: (success: boolean) => void;
}

const QTEOverlay = ({ qte, onComplete }: QTEOverlayProps) => {
  const [timeLeft, setTimeLeft] = useState(qte.timeLimit);
  const [tapCount, setTapCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [swiped, setSwiped] = useState(false);

  const targetTaps = qte.targetCount || 1;

  // Timer
  useEffect(() => {
    if (completed) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(interval);
          handleFail();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [completed]);

  const handleSuccess = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    setSuccess(true);
    setTimeout(() => onComplete(true), 1500);
  }, [completed, onComplete]);

  const handleFail = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    setSuccess(false);
    setTimeout(() => onComplete(false), 1500);
  }, [completed, onComplete]);

  const handleTap = () => {
    if (completed) return;
    if (qte.type === 'tap') {
      handleSuccess();
    } else if (qte.type === 'mash') {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= targetTaps) handleSuccess();
    }
  };

  const handleChoice = (correct: boolean) => {
    if (completed) return;
    if (correct) handleSuccess();
    else handleFail();
  };

  const handleSwipe = (direction: string) => {
    if (completed || swiped) return;
    setSwiped(true);
    if (qte.type === 'swipe' && direction === qte.direction) {
      handleSuccess();
    } else {
      // Wrong direction, let them try again
      setSwiped(false);
    }
  };

  const timerPercent = (timeLeft / qte.timeLimit) * 100;
  const timerColor = timerPercent > 50 ? 'bg-green-500' : timerPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onPointerDown={(e) => {
        if (qte.type === 'tap' || qte.type === 'mash') {
          e.stopPropagation();
          handleTap();
        }
      }}
      onTouchEnd={(e) => {
        // Detect swipe
        if (qte.type !== 'swipe') return;
        const touch = e.changedTouches[0];
        const startTouch = (e.target as any)?._touchStart;
        if (!startTouch) return;
        const dx = touch.clientX - startTouch.x;
        const dy = touch.clientY - startTouch.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          handleSwipe(dx > 50 ? 'right' : dx < -50 ? 'left' : '');
        } else {
          handleSwipe(dy > 50 ? 'down' : dy < -50 ? 'up' : '');
        }
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        (e.target as any)._touchStart = { x: touch.clientX, y: touch.clientY };
      }}
    >
      <AnimatePresence mode="wait">
        {!completed ? (
          <motion.div
            key="qte"
            className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            initial={{ scale: 0.5, rotate: -5 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.4 }}
          >
            {/* Timer bar */}
            <div className="h-3 bg-muted rounded-full mb-4 overflow-hidden">
              <motion.div
                className={`h-full ${timerColor} rounded-full`}
                animate={{ width: `${timerPercent}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            <p className="font-display text-2xl mb-4 text-foreground">{qte.prompt}</p>

            {qte.type === 'mash' && (
              <div className="mb-4">
                <div className="flex justify-center gap-1 mb-2">
                  {Array.from({ length: targetTaps }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={`w-4 h-4 rounded-full ${i < tapCount ? 'bg-primary' : 'bg-muted'}`}
                      animate={i < tapCount ? { scale: [1, 1.5, 1] } : {}}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{tapCount}/{targetTaps} taps</p>
              </div>
            )}

            {qte.type === 'swipe' && (
              <motion.div
                className="text-5xl"
                animate={{ x: qte.direction === 'right' ? [0, 20, 0] : qte.direction === 'left' ? [0, -20, 0] : 0,
                           y: qte.direction === 'up' ? [0, -20, 0] : qte.direction === 'down' ? [0, 20, 0] : 0 }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                {qte.direction === 'right' ? '👉' : qte.direction === 'left' ? '👈' : qte.direction === 'up' ? '👆' : '👇'}
              </motion.div>
            )}

            {qte.type === 'tap' && (
              <motion.div
                className="text-6xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                👆
              </motion.div>
            )}

            {qte.type === 'choice' && qte.choices && (
              <div className="flex flex-col gap-2 w-full">
                {qte.choices.map((choice, i) => (
                  <motion.button
                    key={i}
                    className="w-full py-3 px-4 rounded-2xl bg-muted hover:bg-primary/20 text-foreground font-semibold text-left transition-colors"
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); handleChoice(choice.correct); }}
                  >
                    {choice.text}
                  </motion.button>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              {qte.type === 'tap' ? 'TAP ANYWHERE!' : qte.type === 'mash' ? 'TAP TAP TAP!' : qte.type === 'choice' ? 'CHOOSE WISELY!' : `SWIPE ${qte.direction?.toUpperCase()}!`}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            <div className="text-6xl mb-4">{success ? '🎉' : '😅'}</div>
            <p className="font-display text-xl mb-2 text-foreground">
              {success ? 'AWESOME!' : 'Almost!'}
            </p>
            <p className="text-sm text-muted-foreground">
              {success ? qte.successText : qte.failText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QTEOverlay;
