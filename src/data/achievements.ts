export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: 'reading' | 'streak' | 'quiz' | 'social' | 'discovery';
  requirement: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  booksRead: number;
  streak: number;
  totalQuizScore: number;
  perfectQuizzes: number;
  likedBooks: number;
  reviewsWritten: number;
  genresExplored: number;
}

export const achievements: Achievement[] = [
  // Reading milestones
  { id: 'first-book', title: 'First Page Turner', description: 'Read your first book', emoji: '📖', category: 'reading', requirement: s => s.booksRead >= 1 },
  { id: 'bookworm', title: 'Bookworm', description: 'Read 3 books', emoji: '🐛', category: 'reading', requirement: s => s.booksRead >= 3 },
  { id: 'library-lover', title: 'Library Lover', description: 'Read 5 books', emoji: '📚', category: 'reading', requirement: s => s.booksRead >= 5 },
  { id: 'reading-champion', title: 'Reading Champion', description: 'Read all 11 books', emoji: '🏆', category: 'reading', requirement: s => s.booksRead >= 11 },

  // Streak achievements
  { id: 'on-fire', title: 'On Fire!', description: '3 day reading streak', emoji: '🔥', category: 'streak', requirement: s => s.streak >= 3 },
  { id: 'unstoppable', title: 'Unstoppable', description: '7 day reading streak', emoji: '⚡', category: 'streak', requirement: s => s.streak >= 7 },
  { id: 'legendary', title: 'Legendary Reader', description: '14 day reading streak', emoji: '👑', category: 'streak', requirement: s => s.streak >= 14 },

  // Quiz achievements
  { id: 'quiz-star', title: 'Quiz Star', description: 'Score perfectly on a quiz', emoji: '⭐', category: 'quiz', requirement: s => s.perfectQuizzes >= 1 },
  { id: 'genius', title: 'Little Genius', description: 'Score perfectly on 3 quizzes', emoji: '🧠', category: 'quiz', requirement: s => s.perfectQuizzes >= 3 },
  { id: 'quiz-master', title: 'Quiz Master', description: 'Score perfectly on 5 quizzes', emoji: '🎓', category: 'quiz', requirement: s => s.perfectQuizzes >= 5 },

  // Discovery achievements
  { id: 'explorer', title: 'Explorer', description: 'Like 5 books', emoji: '🧭', category: 'discovery', requirement: s => s.likedBooks >= 5 },
  { id: 'genre-hopper', title: 'Genre Hopper', description: 'Read books from 3 different genres', emoji: '🌈', category: 'discovery', requirement: s => s.genresExplored >= 3 },
  { id: 'all-genres', title: 'Well Rounded', description: 'Read books from all 4 genres', emoji: '🌟', category: 'discovery', requirement: s => s.genresExplored >= 4 },

  // Social achievements
  { id: 'critic', title: 'Book Critic', description: 'Write your first review', emoji: '✍️', category: 'social', requirement: s => s.reviewsWritten >= 1 },
  { id: 'reviewer', title: 'Top Reviewer', description: 'Write 3 reviews', emoji: '📝', category: 'social', requirement: s => s.reviewsWritten >= 3 },
];
