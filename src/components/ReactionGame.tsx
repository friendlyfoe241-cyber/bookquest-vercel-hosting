import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ReactionGameProps {
  prompt: string;
  timeLimit: number;
  onComplete: (success: boolean) => void;
  successText: string;
  failText: string;
}

const ReactionGame = ({ prompt, timeLimit, onComplete, successText, failText }: ReactionGameProps) => {
  const [phase, setPhase] = useState<'wait' | 'ready' | 'go' | 'result'>('wait');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState(false);
  const [success, setSuccess] = useState(false);
  const goTimestamp = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Threshold in ms - under this is "great"
  const GOOD_THRESHOLD = 600;

  useEffect(() => {
    // After 1s of "wait", transition to "ready"
    const t1 = setTimeout(() => setPhase('ready'), 1000);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 'ready') return;
    // Random delay 1.5-4s before showing "GO!"
    const delay = 1500 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => {
      setPhase('go');
      goTimestamp.current = performance.now();
    }, delay);

    // Overall time limit
    const overallTimeout = setTimeout(() => {
      if (phase === 'ready' || phase === 'go') {
        setPhase('result');
        setSuccess(false);
        setTimeout(() => onComplete(false), 1500);
      }
    }, timeLimit * 1000);

    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(overallTimeout);
    };
  }, [phase, timeLimit, onComplete]);

  const handleTap = () => {
    if (phase === 'result') return;

    if (phase === 'wait' || phase === 'ready') {
      // Tapped too early!
      setTooEarly(true);
      clearTimeout(timeoutRef.current);
      setPhase('result');
      setSuccess(false);
      setTimeout(() => onComplete(false), 1500);
      return;
    }

    if (phase === 'go') {
      const rt = Math.round(performance.now() - goTimestamp.current);
      setReactionTime(rt);
      const isGood = rt < GOOD_THRESHOLD;
      setSuccess(isGood);
      setPhase('result');
      setTimeout(() => onComplete(isGood), 1500);
    }
  };

  if (phase === 'result') {
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
        >
          <div className="text-6xl mb-4">
            {tooEarly ? '😬' : success ? '⚡' : '🐢'}
          </div>
          <p className="font-display text-xl mb-2 text-foreground">
            {tooEarly ? 'Too Early!' : success ? 'LIGHTNING FAST!' : 'Not Quite!'}
          </p>
          {reactionTime !== null && (
            <p className="text-2xl font-bold text-primary mb-2">{reactionTime}ms</p>
          )}
          <p className="text-sm text-muted-foreground">
            {tooEarly ? 'Wait for the signal!' : success ? successText : failText}
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer select-none"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={handleTap}
      style={{
        backgroundColor: phase === 'go' ? 'hsl(var(--primary) / 0.9)' : phase === 'ready' ? 'hsl(0 70% 45% / 0.9)' : 'hsl(var(--muted) / 0.9)',
      }}
    >
      <motion.div className="text-center text-white">
        <p className="font-display text-lg mb-4 opacity-80">{prompt}</p>
        {phase === 'wait' && (
          <motion.p className="text-3xl font-bold" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            Get Ready...
          </motion.p>
        )}
        {phase === 'ready' && (
          <motion.div>
            <motion.p className="text-4xl font-bold" animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
              WAIT...
            </motion.p>
            <p className="text-sm mt-2 opacity-70">Don't tap yet!</p>
          </motion.div>
        )}
        {phase === 'go' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6 }}>
            <p className="text-6xl font-bold mb-2">TAP NOW!</p>
            <motion.div className="text-8xl" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.3 }}>
              ⚡
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ReactionGame;
