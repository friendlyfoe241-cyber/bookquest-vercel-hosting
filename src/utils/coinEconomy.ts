/**
 * Coin Economy System
 * 
 * Max 30 coins per book (first read):
 *   - Reading:  beginner=3, intermediate=6, expert=10
 *   - Quiz:     up to 7 base (expert), doubled to 14 if perfect
 *   - QTE:      up to 6 for all passed
 * 
 * Reread cap: 5 coins total (reading + quiz combined)
 * 
 * Daily login: escalating from 5 coins on day 1
 */

export type Difficulty = 'beginner' | 'intermediate' | 'experienced';

// --- Reading coins by difficulty ---
const READING_COINS: Record<Difficulty, number> = {
  beginner: 3,
  intermediate: 6,
  experienced: 10,
};

// --- Quiz base coins by difficulty (before perfect bonus) ---
const QUIZ_BASE_COINS: Record<Difficulty, number> = {
  beginner: 4,
  intermediate: 5,
  experienced: 7,
};

// --- QTE coins by difficulty ---
const QTE_COINS: Record<Difficulty, number> = {
  beginner: 3,
  intermediate: 4,
  experienced: 6,
};

const MAX_COINS_PER_BOOK = 30;
const REREAD_CAP = 5;

export function calcReadingCoins(difficulty: Difficulty): number {
  return READING_COINS[difficulty] ?? 3;
}

export function calcQuizCoins(
  difficulty: Difficulty,
  correctAnswers: number,
  totalQuestions: number,
): number {
  if (totalQuestions === 0) return 0;
  const base = QUIZ_BASE_COINS[difficulty] ?? 4;
  const ratio = correctAnswers / totalQuestions;
  let coins = Math.round(base * ratio);
  // Perfect score doubles the quiz coins only
  if (correctAnswers === totalQuestions) {
    coins = base * 2;
  }
  return coins;
}

export function calcQTECoins(
  difficulty: Difficulty,
  passedCount: number,
  totalCount: number,
): number {
  if (totalCount === 0) return 0;
  const maxQte = QTE_COINS[difficulty] ?? 3;
  return Math.round(maxQte * (passedCount / totalCount));
}

export function calcTotalBookCoins(
  difficulty: Difficulty,
  quizCorrect: number,
  quizTotal: number,
  qtePassed: number,
  qteTotal: number,
  isReread: boolean,
): { reading: number; quiz: number; qte: number; total: number } {
  if (isReread) {
    // Reread: max 5 coins, split proportionally
    const reading = 1;
    const quiz = Math.min(REREAD_CAP - reading, calcQuizCoins(difficulty, quizCorrect, quizTotal));
    const qte = Math.min(REREAD_CAP - reading - quiz, calcQTECoins(difficulty, qtePassed, qteTotal));
    const total = Math.min(reading + quiz + qte, REREAD_CAP);
    return { reading, quiz, qte, total };
  }

  const reading = calcReadingCoins(difficulty);
  const quiz = calcQuizCoins(difficulty, quizCorrect, quizTotal);
  const qte = calcQTECoins(difficulty, qtePassed, qteTotal);
  const total = Math.min(reading + quiz + qte, MAX_COINS_PER_BOOK);
  return { reading, quiz, qte, total };
}

// --- Daily Login Rewards ---
// 30-day cycle, escalating rewards
export interface DailyReward {
  day: number;
  coins: number;
  specialReward?: string; // e.g. pet id
  label?: string;
}

export const DAILY_REWARDS: DailyReward[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  // Special milestone days
  if (day === 7) return { day, coins: 25, label: '🎁 Week 1 Bonus!' };
  if (day === 14) return { day, coins: 50, label: '🎁 Week 2 Bonus!' };
  if (day === 21) return { day, coins: 75, label: '🎁 Week 3 Bonus!' };
  if (day === 30) return { day, coins: 150, specialReward: 'golden-dragon', label: '🐉 Golden Dragon Pet! (3x XP)' };
  // Regular days: 5 base + 2 per week bracket
  const weekBracket = Math.floor(i / 7);
  const coins = 5 + weekBracket * 3 + Math.floor(i / 3);
  return { day, coins };
});

export function getDailyReward(consecutiveDay: number): DailyReward {
  // Cycle through 30 days
  const idx = ((consecutiveDay - 1) % 30);
  return DAILY_REWARDS[idx];
}
