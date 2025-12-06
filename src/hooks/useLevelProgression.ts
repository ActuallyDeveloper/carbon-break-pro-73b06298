import { useState, useCallback } from 'react';
import { Brick, Difficulty } from '@/types/game';

interface LevelConfig {
  level: number;
  brickRowCount: number;
  brickColumnCount: number;
  pattern: 'standard' | 'pyramid' | 'diamond' | 'zigzag' | 'fortress' | 'random' | 'bonus';
  hasStrongBricks: boolean;
  hasExplosiveBricks: boolean;
  ballSpeedMultiplier: number;
  coinDropBonus: number;
}

const levelConfigs: LevelConfig[] = [
  { level: 1, brickRowCount: 3, brickColumnCount: 8, pattern: 'standard', hasStrongBricks: false, hasExplosiveBricks: false, ballSpeedMultiplier: 1, coinDropBonus: 0 },
  { level: 2, brickRowCount: 4, brickColumnCount: 8, pattern: 'standard', hasStrongBricks: false, hasExplosiveBricks: false, ballSpeedMultiplier: 1.05, coinDropBonus: 0.05 },
  { level: 3, brickRowCount: 4, brickColumnCount: 8, pattern: 'pyramid', hasStrongBricks: false, hasExplosiveBricks: false, ballSpeedMultiplier: 1.1, coinDropBonus: 0.1 },
  { level: 4, brickRowCount: 5, brickColumnCount: 8, pattern: 'standard', hasStrongBricks: true, hasExplosiveBricks: false, ballSpeedMultiplier: 1.1, coinDropBonus: 0.1 },
  { level: 5, brickRowCount: 5, brickColumnCount: 8, pattern: 'bonus', hasStrongBricks: false, hasExplosiveBricks: false, ballSpeedMultiplier: 1, coinDropBonus: 0.5 },
  { level: 6, brickRowCount: 5, brickColumnCount: 8, pattern: 'diamond', hasStrongBricks: true, hasExplosiveBricks: false, ballSpeedMultiplier: 1.15, coinDropBonus: 0.15 },
  { level: 7, brickRowCount: 5, brickColumnCount: 8, pattern: 'zigzag', hasStrongBricks: true, hasExplosiveBricks: false, ballSpeedMultiplier: 1.2, coinDropBonus: 0.15 },
  { level: 8, brickRowCount: 6, brickColumnCount: 8, pattern: 'standard', hasStrongBricks: true, hasExplosiveBricks: true, ballSpeedMultiplier: 1.2, coinDropBonus: 0.2 },
  { level: 9, brickRowCount: 6, brickColumnCount: 8, pattern: 'fortress', hasStrongBricks: true, hasExplosiveBricks: true, ballSpeedMultiplier: 1.25, coinDropBonus: 0.2 },
  { level: 10, brickRowCount: 6, brickColumnCount: 8, pattern: 'bonus', hasStrongBricks: false, hasExplosiveBricks: true, ballSpeedMultiplier: 1.1, coinDropBonus: 1 },
];

export const useLevelProgression = (difficulty: Difficulty) => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [isBonusRound, setIsBonusRound] = useState(false);

  const getLevelConfig = useCallback((level: number): LevelConfig => {
    const baseConfig = levelConfigs[Math.min(level - 1, levelConfigs.length - 1)] || levelConfigs[levelConfigs.length - 1];
    
    // Scale difficulty for levels beyond 10
    if (level > 10) {
      return {
        ...baseConfig,
        level,
        brickRowCount: Math.min(7, baseConfig.brickRowCount + Math.floor((level - 10) / 3)),
        ballSpeedMultiplier: baseConfig.ballSpeedMultiplier + (level - 10) * 0.05,
        coinDropBonus: baseConfig.coinDropBonus + (level - 10) * 0.02,
        hasStrongBricks: true,
        hasExplosiveBricks: level > 12,
      };
    }
    
    return { ...baseConfig, level };
  }, []);

  const generateBricks = useCallback((level: number, canvasWidth: number = 600): Brick[] => {
    const config = getLevelConfig(level);
    const bricks: Brick[] = [];
    
    const brickWidth = 65;
    const brickHeight = 20;
    const brickPadding = 8;
    const brickOffsetTop = 60;
    const brickOffsetLeft = 12;

    const difficultyMultiplier = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.2 : 1;
    const coinChance = 0.3 + config.coinDropBonus;

    const createBrick = (c: number, r: number, type: 'normal' | 'strong' | 'explosive' = 'normal'): Brick => ({
      x: c * (brickWidth + brickPadding) + brickOffsetLeft,
      y: r * (brickHeight + brickPadding) + brickOffsetTop,
      width: brickWidth,
      height: brickHeight,
      active: true,
      hasCoin: Math.random() < coinChance,
      type,
      hits: type === 'strong' ? 2 : 1,
    });

    const getBrickType = (c: number, r: number): 'normal' | 'strong' | 'explosive' => {
      if (config.hasExplosiveBricks && Math.random() < 0.1) return 'explosive';
      if (config.hasStrongBricks && Math.random() < 0.2) return 'strong';
      return 'normal';
    };

    switch (config.pattern) {
      case 'pyramid':
        for (let r = 0; r < config.brickRowCount; r++) {
          const bricksInRow = config.brickColumnCount - r;
          const startCol = Math.floor((config.brickColumnCount - bricksInRow) / 2);
          for (let c = startCol; c < startCol + bricksInRow; c++) {
            bricks.push(createBrick(c, r, getBrickType(c, r)));
          }
        }
        break;

      case 'diamond':
        const midRow = Math.floor(config.brickRowCount / 2);
        for (let r = 0; r < config.brickRowCount; r++) {
          const distFromMid = Math.abs(r - midRow);
          const bricksInRow = config.brickColumnCount - distFromMid * 2;
          const startCol = Math.floor((config.brickColumnCount - bricksInRow) / 2);
          for (let c = startCol; c < startCol + bricksInRow; c++) {
            bricks.push(createBrick(c, r, getBrickType(c, r)));
          }
        }
        break;

      case 'zigzag':
        for (let r = 0; r < config.brickRowCount; r++) {
          const offset = r % 2 === 0 ? 0 : 1;
          for (let c = offset; c < config.brickColumnCount; c += 2) {
            bricks.push(createBrick(c, r, getBrickType(c, r)));
          }
        }
        break;

      case 'fortress':
        for (let r = 0; r < config.brickRowCount; r++) {
          for (let c = 0; c < config.brickColumnCount; c++) {
            // Create fortress pattern with gaps
            const isWall = c === 0 || c === config.brickColumnCount - 1;
            const isTop = r === 0;
            const isTower = (c === 2 || c === 5) && r < 3;
            if (isWall || isTop || isTower) {
              bricks.push(createBrick(c, r, isWall ? 'strong' : getBrickType(c, r)));
            }
          }
        }
        break;

      case 'bonus':
        // Bonus round - all coins, no strong bricks
        for (let c = 0; c < config.brickColumnCount; c++) {
          for (let r = 0; r < config.brickRowCount; r++) {
            const brick = createBrick(c, r, 'normal');
            brick.hasCoin = true; // All bricks have coins in bonus round
            bricks.push(brick);
          }
        }
        break;

      case 'random':
        for (let c = 0; c < config.brickColumnCount; c++) {
          for (let r = 0; r < config.brickRowCount; r++) {
            if (Math.random() > 0.3) {
              bricks.push(createBrick(c, r, getBrickType(c, r)));
            }
          }
        }
        break;

      default: // standard
        for (let c = 0; c < config.brickColumnCount; c++) {
          for (let r = 0; r < config.brickRowCount; r++) {
            bricks.push(createBrick(c, r, getBrickType(c, r)));
          }
        }
    }

    return bricks;
  }, [difficulty, getLevelConfig]);

  const advanceLevel = useCallback((scoreFromLevel: number) => {
    setTotalScore(prev => prev + scoreFromLevel);
    setCurrentLevel(prev => prev + 1);
    const nextConfig = getLevelConfig(currentLevel + 1);
    setIsBonusRound(nextConfig.pattern === 'bonus');
  }, [currentLevel, getLevelConfig]);

  const resetProgression = useCallback(() => {
    setCurrentLevel(1);
    setTotalScore(0);
    setIsBonusRound(false);
  }, []);

  const getBallSpeedMultiplier = useCallback(() => {
    return getLevelConfig(currentLevel).ballSpeedMultiplier;
  }, [currentLevel, getLevelConfig]);

  return {
    currentLevel,
    totalScore,
    isBonusRound,
    generateBricks,
    advanceLevel,
    resetProgression,
    getBallSpeedMultiplier,
    getLevelConfig,
  };
};
