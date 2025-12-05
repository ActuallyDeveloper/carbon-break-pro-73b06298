import { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { EquippedItems, Difficulty, Brick, Coin, PowerUp, PowerUpType } from '@/types/game';
import { getDifficultySettings } from '@/lib/gameUtils';
import { useTheme } from '@/lib/theme';
import { Heart } from 'lucide-react';
import { getGlobalSoundInstance } from '@/hooks/useSoundEffects';

interface SplitScreenGameCanvasProps {
  playerOneName: string;
  playerTwoName: string;
  playerOneItems: EquippedItems;
  playerTwoItems: EquippedItems;
  onPlayerOneScore: (score: number) => void;
  onPlayerTwoScore: (score: number) => void;
  onGameOver: (winner: 'player1' | 'player2', p1Score: number, p2Score: number) => void;
  playerOneScore: number;
  playerTwoScore: number;
  enablePowerUps?: boolean;
  difficulty?: Difficulty;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface RarityParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  hue?: number;
}

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number; radius: number };
  paddle: { x: number; y: number; width: number; height: number };
  bricks: Brick[];
  coins: Coin[];
  powerUps: PowerUp[];
  particles: Particle[];
  rarityParticles: RarityParticle[];
  ballTrail: Array<{ x: number; y: number; alpha: number }>;
  score: number;
  lives: number;
  frame: number;
  isPlaying: boolean;
  gameOver: boolean;
}

const SplitScreenCanvas = ({
  playerName,
  equippedItems,
  onScoreUpdate,
  onLivesUpdate,
  onGameOver,
  enablePowerUps,
  difficulty = 'medium',
  canvasId,
}: {
  playerName: string;
  equippedItems: EquippedItems;
  onScoreUpdate: (score: number) => void;
  onLivesUpdate: (lives: number) => void;
  onGameOver: (score: number) => void;
  enablePowerUps: boolean;
  difficulty: Difficulty;
  canvasId: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const animationRef = useRef<number>();
  const diffSettings = getDifficultySettings(difficulty);
  const soundRef = useRef(getGlobalSoundInstance());

  const gameStateRef = useRef<GameState>({
    ball: { x: 200, y: 250, dx: diffSettings.ballSpeed, dy: -diffSettings.ballSpeed, radius: 6 },
    paddle: { x: 160, y: 370, width: 70, height: 8 },
    bricks: [],
    coins: [],
    powerUps: [],
    particles: [],
    rarityParticles: [],
    ballTrail: [],
    score: 0,
    lives: 3,
    frame: 0,
    isPlaying: true,
    gameOver: false,
  });

  const getItemRarity = useCallback((itemType: string): string => {
    const item = equippedItems?.[itemType as keyof EquippedItems];
    return (item?.properties as any)?.rarity || 'common';
  }, [equippedItems]);

  const getItemColor = useCallback((itemType: 'paddle' | 'ball' | 'brick', frame: number): string => {
    const isDark = theme === 'dark';
    const defaultColor = isDark ? '#ffffff' : '#000000';
    const item = equippedItems?.[itemType];
    if (!item) return defaultColor;
    
    const color = item.properties?.color;
    if (color === 'rainbow') return `hsl(${frame % 360}, 70%, 50%)`;
    
    const colorMap: Record<string, string> = {
      default: defaultColor, red: "#ef4444", blue: "#3b82f6", purple: "#a855f7",
      neon: "#10b981", yellow: "#eab308", green: "#10b981", orange: "#f97316",
      pink: "#ec4899", silver: "#94a3b8", gold: "#eab308",
    };
    
    return colorMap[color] || color || defaultColor;
  }, [theme, equippedItems]);

  const createExplosion = useCallback((x: number, y: number, color: string, intensity: number = 1) => {
    const count = Math.floor(15 * intensity);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 1.5 + Math.random() * 2 * intensity;
      gameStateRef.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 15,
        color,
        size: 1.5 + Math.random() * 2,
      });
    }
  }, []);

  const createRarityParticles = useCallback((x: number, y: number, rarity: string) => {
    const count = rarity === 'legendary' ? 6 : rarity === 'epic' ? 4 : rarity === 'rare' ? 2 : 0;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 0.8 + Math.random() * 1.5;
      let color = '#ffffff';
      let hue = undefined;
      
      if (rarity === 'legendary') hue = Math.random() * 360;
      else if (rarity === 'epic') color = '#a855f7';
      else if (rarity === 'rare') color = '#3b82f6';
      
      gameStateRef.current.rarityParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 15,
        maxLife: 45,
        color, size: rarity === 'legendary' ? 3 : 2, hue,
      });
    }
  }, []);

  const initGame = useCallback(() => {
    const bricks: Brick[] = [];
    const brickWidth = 45;
    const brickHeight = 14;
    const brickPadding = 4;
    const cols = 7;
    const rows = 4;
    const offsetX = 10;
    const offsetY = 40;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        bricks.push({
          x: c * (brickWidth + brickPadding) + offsetX,
          y: r * (brickHeight + brickPadding) + offsetY,
          width: brickWidth,
          height: brickHeight,
          active: true,
          hasCoin: Math.random() < diffSettings.coinDropChance,
        });
      }
    }

    // Ensure ball has proper initial velocity
    const initialSpeed = Math.max(diffSettings.ballSpeed, 3);
    const initialDx = initialSpeed * (Math.random() > 0.5 ? 1 : -1);
    const initialDy = -initialSpeed;

    gameStateRef.current = {
      ball: { x: 200, y: 300, dx: initialDx, dy: initialDy, radius: 8 },
      paddle: { x: 160, y: 370, width: 80, height: 10 },
      bricks,
      coins: [],
      powerUps: [],
      particles: [],
      rarityParticles: [],
      ballTrail: [],
      score: 0,
      lives: 3,
      frame: 0,
      isPlaying: true,
      gameOver: false,
    };
    onLivesUpdate(3);
  }, [diffSettings, onLivesUpdate]);

  const drawRarityEffects = useCallback((ctx: CanvasRenderingContext2D, ball: any, paddle: any, frame: number) => {
    const ballRarity = getItemRarity('ball');
    const paddleRarity = getItemRarity('paddle');
    
    if (ballRarity === 'legendary') {
      for (let i = 0; i < 4; i++) {
        const hue = (frame * 5 + i * 30) % 360;
        const offset = i * 2;
        ctx.beginPath();
        ctx.arc(ball.x - ball.dx * offset * 0.4, ball.y - ball.dy * offset * 0.4, ball.radius * (1 - i * 0.15), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.5 - i * 0.1})`;
        ctx.fill();
      }
    }
    
    if (ballRarity === 'epic') {
      const glowSize = ball.radius + 4 + Math.sin(frame * 0.1) * 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.fill();
    }
    
    if (ballRarity === 'rare') {
      const shineAngle = (frame * 0.05) % (Math.PI * 2);
      const shineX = ball.x + Math.cos(shineAngle) * ball.radius * 0.4;
      const shineY = ball.y + Math.sin(shineAngle) * ball.radius * 0.4;
      ctx.beginPath();
      ctx.arc(shineX, shineY, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
    }
    
    if (paddleRarity === 'legendary') {
      const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
      for (let i = 0; i <= 8; i++) {
        const hue = (frame * 3 + i * 45) % 360;
        gradient.addColorStop(i / 8, `hsla(${hue}, 70%, 50%, 0.4)`);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(paddle.x, paddle.y - 2, paddle.width, paddle.height + 4);
    }
    
    if (paddleRarity === 'epic') {
      const pulseAlpha = 0.25 + Math.sin(frame * 0.1) * 0.15;
      ctx.fillStyle = `rgba(168, 85, 247, ${pulseAlpha})`;
      ctx.fillRect(paddle.x - 1, paddle.y - 1, paddle.width + 2, paddle.height + 2);
    }
  }, [getItemRarity]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;
    if (!state.isPlaying || state.gameOver) return;

    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#0a0a0a' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    state.frame++;
    const { ball, paddle, bricks, coins, particles, rarityParticles, ballTrail } = state;

    // Update ball trail
    ballTrail.unshift({ x: ball.x, y: ball.y, alpha: 0.6 });
    if (ballTrail.length > 8) ballTrail.pop();
    ballTrail.forEach(p => p.alpha *= 0.9);

    // Draw trail
    ballTrail.forEach((pos, i) => {
      const size = ball.radius * (0.4 + (i / ballTrail.length) * 0.4);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168, 85, 247, ${pos.alpha * 0.3})`;
      ctx.fill();
    });

    // Draw rarity effects
    drawRarityEffects(ctx, ball, paddle, state.frame);

    // Update and draw particles
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
        return;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Update and draw rarity particles
    rarityParticles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        rarityParticles.splice(i, 1);
        return;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      if (p.hue !== undefined) {
        ctx.fillStyle = `hsla(${(p.hue + state.frame * 5) % 360}, 80%, 60%, ${p.life / p.maxLife})`;
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collisions
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
      ball.dx = -ball.dx;
      soundRef.current?.playSound?.('paddle');
    }
    if (ball.y - ball.radius <= 0) {
      ball.dy = -ball.dy;
      soundRef.current?.playSound?.('paddle');
    }

    // Bottom collision - lose life
    if (ball.y + ball.radius >= canvas.height) {
      state.lives--;
      onLivesUpdate(state.lives);
      soundRef.current?.playSound?.('gameOver');
      
      if (state.lives <= 0) {
        state.gameOver = true;
        onGameOver(state.score);
        return;
      }
      
      // Reset ball position with proper velocity
      const resetSpeed = Math.max(diffSettings.ballSpeed, 3);
      ball.x = 200;
      ball.y = 300;
      ball.dx = resetSpeed * (Math.random() > 0.5 ? 1 : -1);
      ball.dy = -resetSpeed;
    }

    // Paddle collision
    if (
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.width
    ) {
      ball.dy = -Math.abs(ball.dy);
      const hitPos = (ball.x - paddle.x) / paddle.width;
      ball.dx = diffSettings.ballSpeed * (hitPos - 0.5) * 2;
      soundRef.current?.playSound?.('paddle');
      createRarityParticles(ball.x, ball.y, getItemRarity('paddle'));
    }

    // Brick collisions
    bricks.forEach((brick, i) => {
      if (!brick.active) return;
      if (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
      ) {
        brick.active = false;
        ball.dy = -ball.dy;
        state.score += 10;
        onScoreUpdate(state.score);
        soundRef.current?.playSound?.('brickBreak');
        createExplosion(brick.x + brick.width / 2, brick.y + brick.height / 2, getItemColor('brick', state.frame));
        createRarityParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, getItemRarity('brick'));
        
        if (brick.hasCoin) {
          coins.push({
            x: brick.x + brick.width / 2,
            y: brick.y + brick.height / 2,
            dy: 1.5,
            value: diffSettings.coinValue,
            collected: false,
          });
        }
      }
    });

    // Draw bricks
    const brickColor = getItemColor('brick', state.frame);
    bricks.forEach(brick => {
      if (!brick.active) return;
      ctx.fillStyle = brickColor;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    });

    // Update and draw coins
    coins.forEach((coin, i) => {
      if (coin.collected) return;
      coin.y += coin.dy;
      
      if (
        coin.y + 8 >= paddle.y &&
        coin.y - 8 <= paddle.y + paddle.height &&
        coin.x >= paddle.x &&
        coin.x <= paddle.x + paddle.width
      ) {
        coin.collected = true;
        state.score += coin.value * 5;
        onScoreUpdate(state.score);
        soundRef.current?.playSound?.('coin');
      }
      
      if (coin.y > canvas.height) {
        coins.splice(i, 1);
        return;
      }
      
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.fill();
    });

    // Draw paddle
    ctx.fillStyle = getItemColor('paddle', state.frame);
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = getItemColor('ball', state.frame);
    ctx.fill();

    // Draw lives
    for (let i = 0; i < state.lives; i++) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      const hx = 15 + i * 18;
      const hy = 15;
      ctx.moveTo(hx, hy + 4);
      ctx.bezierCurveTo(hx, hy, hx - 6, hy, hx - 6, hy + 4);
      ctx.bezierCurveTo(hx - 6, hy + 8, hx, hy + 12, hx, hy + 14);
      ctx.bezierCurveTo(hx, hy + 12, hx + 6, hy + 8, hx + 6, hy + 4);
      ctx.bezierCurveTo(hx + 6, hy, hx, hy, hx, hy + 4);
      ctx.fill();
    }

    // Check win condition
    if (bricks.every(b => !b.active)) {
      state.gameOver = true;
      onGameOver(state.score);
      return;
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [theme, diffSettings, createExplosion, createRarityParticles, drawRarityEffects, getItemColor, getItemRarity, onScoreUpdate, onLivesUpdate, onGameOver]);

  useEffect(() => {
    initGame();
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [initGame, gameLoop]);

  // Mouse/Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      gameStateRef.current.paddle.x = Math.max(0, Math.min(canvas.width - gameStateRef.current.paddle.width, x - gameStateRef.current.paddle.width / 2));
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      gameStateRef.current.paddle.x = Math.max(0, Math.min(canvas.width - gameStateRef.current.paddle.width, x - gameStateRef.current.paddle.width / 2));
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id={canvasId}
      width={370}
      height={400}
      className="w-full max-w-[370px] h-auto rounded-lg bg-background cursor-none touch-none"
    />
  );
};

export const SplitScreenGameCanvas = ({
  playerOneName,
  playerTwoName,
  playerOneItems,
  playerTwoItems,
  onPlayerOneScore,
  onPlayerTwoScore,
  onGameOver,
  playerOneScore,
  playerTwoScore,
  enablePowerUps = true,
  difficulty = 'medium',
}: SplitScreenGameCanvasProps) => {
  const [p1Lives, setP1Lives] = useState(3);
  const [p2Lives, setP2Lives] = useState(3);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const player1GameOverRef = useRef(false);
  const player2GameOverRef = useRef(false);

  const handlePlayer1ScoreUpdate = (score: number) => {
    setP1Score(score);
    onPlayerOneScore(score);
  };

  const handlePlayer2ScoreUpdate = (score: number) => {
    setP2Score(score);
    onPlayerTwoScore(score);
  };

  const handlePlayer1GameOver = (score: number) => {
    player1GameOverRef.current = true;
    checkBothGameOver(score, p2Score);
  };

  const handlePlayer2GameOver = (score: number) => {
    player2GameOverRef.current = true;
    checkBothGameOver(p1Score, score);
  };

  const checkBothGameOver = (finalP1: number, finalP2: number) => {
    if (player1GameOverRef.current && player2GameOverRef.current) {
      const winner = finalP1 > finalP2 ? 'player1' : 'player2';
      onGameOver(winner, finalP1, finalP2);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{playerOneName}</h3>
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`h-4 w-4 ${i < p1Lives ? 'fill-red-500 text-red-500' : 'text-muted-foreground/30'}`}
                />
              ))}
            </div>
          </div>
          <div className="text-2xl font-bold">{p1Score}</div>
        </div>
        <SplitScreenCanvas
          playerName={playerOneName}
          equippedItems={playerOneItems}
          onScoreUpdate={handlePlayer1ScoreUpdate}
          onLivesUpdate={setP1Lives}
          onGameOver={handlePlayer1GameOver}
          enablePowerUps={enablePowerUps}
          difficulty={difficulty}
          canvasId="player1-canvas"
        />
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{playerTwoName}</h3>
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`h-4 w-4 ${i < p2Lives ? 'fill-red-500 text-red-500' : 'text-muted-foreground/30'}`}
                />
              ))}
            </div>
          </div>
          <div className="text-2xl font-bold">{p2Score}</div>
        </div>
        <SplitScreenCanvas
          playerName={playerTwoName}
          equippedItems={playerTwoItems}
          onScoreUpdate={handlePlayer2ScoreUpdate}
          onLivesUpdate={setP2Lives}
          onGameOver={handlePlayer2GameOver}
          enablePowerUps={enablePowerUps}
          difficulty={difficulty}
          canvasId="player2-canvas"
        />
      </Card>
    </div>
  );
};
