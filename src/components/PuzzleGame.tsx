import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PuzzleGameProps {
  prompt: string;
  timeLimit: number;
  onComplete: (success: boolean) => void;
  successText: string;
  failText: string;
}

const EMOJIS = ['🌟', '🔥', '💎', '🌙', '⚡', '🍀', '🎯', '🦋', '🌊'];

const PuzzleGame = ({ prompt, timeLimit, onComplete, successText, failText }: PuzzleGameProps) => {
  const [phase, setPhase] = useState<'show' | 'play' | 'result'>('show');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [grid, setGrid] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [success, setSuccess] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [showingIdx, setShowingIdx] = useState<number>(-1);

  const seqLength = 4;

  // Initialize
  useEffect(() => {
    // Pick 9 random emojis for the grid
    const shuffled = [...EMOJIS].sort(() => Math.random() - 0.5);
    setGrid(shuffled);

    // Generate a sequence of grid indices
    const seq: number[] = [];
    while (seq.length < seqLength) {
      const idx = Math.floor(Math.random() * 9);
      if (seq.length === 0 || seq[seq.length - 1] !== idx) {
        seq.push(idx);
      }
    }
    setSequence(seq);
  }, []);

  // Show sequence animation
  useEffect(() => {
    if (phase !== 'show' || sequence.length === 0) return;
    let i = 0;
    const showNext = () => {
      if (i < sequence.length) {
        setShowingIdx(i);
        setHighlightIdx(sequence[i]);
        i++;
        setTimeout(() => {
          setHighlightIdx(null);
          setTimeout(showNext, 300);
        }, 700);
      } else {
        setShowingIdx(-1);
        setPhase('play');
      }
    };
    setTimeout(showNext, 500);
  }, [phase, sequence]);

  // Timer during play phase
  useEffect(() => {
    if (phase !== 'play') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(interval);
          setPhase('result');
          setSuccess(false);
          setTimeout(() => onComplete(false), 1500);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [phase, onComplete]);

  const handleTap = useCallback((idx: number) => {
    if (phase !== 'play') return;
    const nextPos = playerSequence.length;
    const newSeq = [...playerSequence, idx];
    setPlayerSequence(newSeq);
    setHighlightIdx(idx);
    setTimeout(() => setHighlightIdx(null), 200);

    if (idx !== sequence[nextPos]) {
      // Wrong!
      setPhase('result');
      setSuccess(false);
      setTimeout(() => onComplete(false), 1500);
      return;
    }

    if (newSeq.length === sequence.length) {
      // All correct!
      setPhase('result');
      setSuccess(true);
      setTimeout(() => onComplete(true), 1500);
    }
  }, [phase, playerSequence, sequence, onComplete]);

  const timerPercent = (timeLeft / timeLimit) * 100;
  const timerColor = timerPercent > 50 ? 'bg-green-500' : timerPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

  if (phase === 'result') {
    return (
      <motion.div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <div className="text-6xl mb-4">{success ? '🧩' : '😅'}</div>
          <p className="font-display text-xl mb-2 text-foreground">
            {success ? 'PUZZLE SOLVED!' : 'Not Quite!'}
          </p>
          <p className="text-sm text-muted-foreground">{success ? successText : failText}</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="bg-card rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
        initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>

        {phase === 'play' && (
          <div className="h-3 bg-muted rounded-full mb-4 overflow-hidden">
            <motion.div className={`h-full ${timerColor} rounded-full`}
              animate={{ width: `${timerPercent}%` }} transition={{ duration: 0.1 }} />
          </div>
        )}

        <p className="font-display text-lg mb-2 text-foreground">{prompt}</p>

        {phase === 'show' && (
          <div className="mb-3">
            <p className="text-sm text-muted-foreground mb-1">Memorize the pattern!</p>
            <div className="flex justify-center gap-1">
              {sequence.map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i <= showingIdx ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </div>
        )}

        {phase === 'play' && (
          <div className="mb-3">
            <p className="text-sm text-muted-foreground mb-1">Repeat the pattern!</p>
            <div className="flex justify-center gap-1">
              {sequence.map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i < playerSequence.length ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </div>
        )}

        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-3">
          {grid.map((emoji, idx) => (
            <motion.button
              key={idx}
              className={`aspect-square rounded-2xl text-3xl flex items-center justify-center transition-colors ${
                highlightIdx === idx
                  ? 'bg-primary/40 ring-2 ring-primary'
                  : 'bg-muted/60 hover:bg-muted'
              }`}
              whileTap={phase === 'play' ? { scale: 0.9 } : {}}
              onClick={() => handleTap(idx)}
              animate={highlightIdx === idx ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.2 }}
            >
              {emoji}
            </motion.button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {phase === 'show' ? 'Watch carefully...' : 'Tap the emojis in order!'}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default PuzzleGame;
