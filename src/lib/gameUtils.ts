import { Difficulty } from '@/types/game';

export const getDifficultySettings = (difficulty: Difficulty) => {
  switch (difficulty) {
    case 'easy':
      return {
        paddleSpeed: 10,
        ballSpeed: 3,
        coinValue: 1,
        coinDropChance: 0.3,
      };
    case 'medium':
      return {
        paddleSpeed: 14,
        ballSpeed: 4,
        coinValue: 2,
        coinDropChance: 0.4,
      };
    case 'hard':
      return {
        paddleSpeed: 18,
        ballSpeed: 5,
        coinValue: 4,
        coinDropChance: 0.5,
      };
  }
};

export const getTimeLimit = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case 'easy':
      return 180; // 3 minutes
    case 'medium':
      return 120; // 2 minutes
    case 'hard':
      return 90; // 1.5 minutes
  }
};
