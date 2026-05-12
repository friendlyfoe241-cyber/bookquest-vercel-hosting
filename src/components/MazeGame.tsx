import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

type Difficulty = 'beginner' | 'intermediate' | 'experienced';

interface MazeGameProps {
  prompt: string;
  timeLimit: number;
  onComplete: (success: boolean) => void;
  successText: string;
  failText: string;
  difficulty?: Difficulty;
}

interface MazeDef {
  grid: number[][];
  start: [number, number];
  end: [number, number];
}

// 0 = path, 1 = wall, 2 = start, 3 = end

const BEGINNER_MAZES: MazeDef[] = [
  {
    grid: [
      [2, 0, 0, 0, 1],
      [1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1],
      [1, 0, 0, 0, 3],
    ],
    start: [0, 0], end: [4, 4],
  },
  {
    grid: [
      [2, 0, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 3],
    ],
    start: [0, 0], end: [4, 4],
  },
  {
    grid: [
      [1, 2, 0, 1, 1],
      [1, 1, 0, 0, 1],
      [1, 0, 0, 1, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 3],
    ],
    start: [0, 1], end: [4, 4],
  },
  {
    grid: [
      [2, 0, 1, 1, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 1],
      [1, 0, 0, 1, 1],
      [1, 0, 0, 0, 3],
    ],
    start: [0, 0], end: [4, 4],
  },
];

const INTERMEDIATE_MAZES: MazeDef[] = [
  {
    grid: [
      [2, 0, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 3],
    ],
    start: [0, 0], end: [6, 6],
  },
  {
    grid: [
      [2, 0, 0, 1, 1, 1, 1],
      [1, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 1, 1, 0, 1],
      [1, 0, 1, 1, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 1],
      [1, 1, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 3],
    ],
    start: [0, 0], end: [6, 6],
  },
  {
    grid: [
      [1, 1, 1, 2, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 0, 3],
    ],
    start: [0, 3], end: [6, 6],
  },
  {
    grid: [
      [2, 0, 1, 1, 0, 0, 1],
      [1, 0, 0, 1, 0, 1, 1],
      [1, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 3],
    ],
    start: [0, 0], end: [6, 6],
  },
];

const EXPERIENCED_MAZES: MazeDef[] = [
  {
    grid: [
      [2, 0, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 0, 3],
    ],
    start: [0, 0], end: [8, 8],
  },
  {
    grid: [
      [1, 1, 1, 1, 2, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1],
    ],
    start: [0, 4], end: [8, 1],
  },
  {
    grid: [
      [2, 0, 1, 0, 0, 0, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1, 1, 1, 0, 1],
      [1, 1, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 0, 3],
    ],
    start: [0, 0], end: [8, 8],
  },
  {
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 0, 3],
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 1, 1],
      [1, 0, 1, 1, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1, 1, 1, 0, 2],
    ],
    start: [8, 8], end: [0, 8],
  },
];

const MAZE_POOLS: Record<Difficulty, MazeDef[]> = {
  beginner: BEGINNER_MAZES,
  intermediate: INTERMEDIATE_MAZES,
  experienced: EXPERIENCED_MAZES,
};

// Time bonus per difficulty
const TIME_MULTIPLIER: Record<Difficulty, number> = {
  beginner: 1.5,
  intermediate: 1.0,
  experienced: 0.75,
};

const MazeGame = ({ prompt, timeLimit, onComplete, successText, failText, difficulty = 'intermediate' }: MazeGameProps) => {
  const pool = MAZE_POOLS[difficulty];
  const [mazeIdx] = useState(() => Math.floor(Math.random() * pool.length));
  const maze = pool[mazeIdx];
  const adjustedTime = timeLimit * TIME_MULTIPLIER[difficulty];
  const [pos, setPos] = useState<[number, number]>(maze.start);
  const [timeLeft, setTimeLeft] = useState(adjustedTime);
  const [completed, setCompleted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [trail, setTrail] = useState<string[]>([`${maze.start[0]}-${maze.start[1]}`]);

  const gridSize = maze.grid.length;
  const cellSizeClass = gridSize <= 5 ? 'w-12 h-12 sm:w-14 sm:h-14' : gridSize <= 7 ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-7 h-7 sm:w-8 sm:h-8';
  const emojiSize = gridSize <= 5 ? 'text-lg' : gridSize <= 7 ? 'text-sm' : 'text-xs';

  useEffect(() => {
    if (completed) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(interval);
          setCompleted(true);
          setSuccess(false);
          setTimeout(() => onComplete(false), 1500);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [completed, onComplete]);

  const move = useCallback((dr: number, dc: number) => {
    if (completed) return;
    setPos(prev => {
      const nr = prev[0] + dr;
      const nc = prev[1] + dc;
      if (nr < 0 || nr >= maze.grid.length || nc < 0 || nc >= maze.grid[0].length) return prev;
      if (maze.grid[nr][nc] === 1) return prev;
      const newPos: [number, number] = [nr, nc];
      setTrail(t => [...t, `${nr}-${nc}`]);
      if (nr === maze.end[0] && nc === maze.end[1]) {
        setCompleted(true);
        setSuccess(true);
        setTimeout(() => onComplete(true), 1500);
      }
      return newPos;
    });
  }, [completed, maze, onComplete]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') move(-1, 0);
      if (e.key === 'ArrowDown' || e.key === 's') move(1, 0);
      if (e.key === 'ArrowLeft' || e.key === 'a') move(0, -1);
      if (e.key === 'ArrowRight' || e.key === 'd') move(0, 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  useEffect(() => {
    let startX = 0, startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 20) move(0, dx > 0 ? 1 : -1);
      } else {
        if (Math.abs(dy) > 20) move(dy > 0 ? 1 : -1, 0);
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [move]);

  const timerPercent = (timeLeft / adjustedTime) * 100;
  const timerColor = timerPercent > 50 ? 'bg-green-500' : timerPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

  const diffLabel = difficulty === 'beginner' ? '🌱 Easy' : difficulty === 'intermediate' ? '🌿 Medium' : '🔥 Hard';

  if (completed) {
    return (
      <motion.div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <div className="text-6xl mb-4">{success ? '🎉' : '😅'}</div>
          <p className="font-display text-xl mb-2 text-foreground">
            {success ? 'MAZE SOLVED!' : 'Time\'s Up!'}
          </p>
          <p className="text-sm text-muted-foreground">{success ? successText : failText}</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="bg-card rounded-3xl p-6 max-w-md w-full text-center shadow-2xl"
        initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>

        <div className="h-3 bg-muted rounded-full mb-3 overflow-hidden">
          <motion.div className={`h-full ${timerColor} rounded-full`}
            animate={{ width: `${timerPercent}%` }} transition={{ duration: 0.1 }} />
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-lg text-foreground">{prompt}</p>
          <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{diffLabel}</span>
        </div>

        <div className="flex flex-col items-center gap-0.5 mb-4">
          {maze.grid.map((row, ri) => (
            <div key={ri} className="flex gap-0.5">
              {row.map((cell, ci) => {
                const isPlayer = pos[0] === ri && pos[1] === ci;
                const isEnd = ri === maze.end[0] && ci === maze.end[1];
                const isTrail = trail.includes(`${ri}-${ci}`);
                return (
                  <div
                    key={ci}
                    className={`${cellSizeClass} rounded-md flex items-center justify-center ${emojiSize} font-bold transition-colors ${
                      cell === 1 ? 'bg-muted-foreground/30' :
                      isPlayer ? 'bg-primary' :
                      isEnd ? 'bg-green-500/40' :
                      isTrail ? 'bg-primary/20' :
                      'bg-muted/50'
                    }`}
                    onClick={() => {
                      const dr = ri - pos[0];
                      const dc = ci - pos[1];
                      if (Math.abs(dr) + Math.abs(dc) === 1) move(dr, dc);
                    }}
                  >
                    {isPlayer && '🏃'}
                    {isEnd && !isPlayer && '⭐'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-1">
          <button onClick={() => move(-1, 0)}
            className="w-12 h-10 rounded-xl bg-muted hover:bg-primary/20 text-foreground font-bold text-lg active:scale-90 transition-transform">↑</button>
          <div className="flex gap-1">
            <button onClick={() => move(0, -1)}
              className="w-12 h-10 rounded-xl bg-muted hover:bg-primary/20 text-foreground font-bold text-lg active:scale-90 transition-transform">←</button>
            <button onClick={() => move(1, 0)}
              className="w-12 h-10 rounded-xl bg-muted hover:bg-primary/20 text-foreground font-bold text-lg active:scale-90 transition-transform">↓</button>
            <button onClick={() => move(0, 1)}
              className="w-12 h-10 rounded-xl bg-muted hover:bg-primary/20 text-foreground font-bold text-lg active:scale-90 transition-transform">→</button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">Swipe, tap adjacent cells, or use arrow keys!</p>
      </motion.div>
    </motion.div>
  );
};

export default MazeGame;
