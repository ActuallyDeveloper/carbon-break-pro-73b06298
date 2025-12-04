import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Trophy, Coins, Clock, Heart } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useGameSettings } from "@/hooks/useGameSettings";
import { getDifficultySettings, getTimeLimit } from "@/lib/gameUtils";
import { Coin, Brick, EquippedItems, Difficulty } from "@/types/game";

type TimeLimitGameCanvasProps = {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number, coins: number, timeBonus: number) => void;
  onCoinCollect?: (coins: number) => void;
  equippedItems?: EquippedItems;
  difficulty?: Difficulty;
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export const TimeLimitGameCanvas = ({ 
  onScoreUpdate, 
  onGameOver, 
  onCoinCollect, 
  equippedItems,
  difficulty: propDifficulty 
}: TimeLimitGameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const { settings } = useGameSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lives, setLives] = useState(3);
  const [touchStartX, setTouchStartX] = useState(0);
  const animationRef = useRef<number>();
  
  const currentDifficulty = propDifficulty || settings.difficulty;
  const diffSettings = getDifficultySettings(currentDifficulty);
  const timeLimit = getTimeLimit(currentDifficulty);
  
  const gameStateRef = useRef({
    ball: { x: 300, y: 300, dx: diffSettings.ballSpeed, dy: -diffSettings.ballSpeed, radius: 8 },
    paddle: { x: 260, y: 550, width: 80, height: 10, speed: diffSettings.paddleSpeed },
    bricks: [] as Brick[],
    coins: [] as Coin[],
    particles: [] as Particle[],
    ballTrail: [] as Array<{x: number, y: number, alpha: number}>,
    score: 0,
    coinsCollected: 0,
    lives: 3,
    timeRemaining: timeLimit,
    startTime: 0,
    frame: 0,
  });

  const getItemColor = useCallback((itemType: 'paddle' | 'ball' | 'brick', frame: number): string => {
    const isDark = theme === 'dark';
    const defaultColor = isDark ? '#ffffff' : '#000000';
    
    const specificItem = equippedItems?.[itemType];
    const colorItem = equippedItems?.color;
    
    if (colorItem?.properties) {
      if (itemType === 'ball' && colorItem.properties.secondary) {
        return colorItem.properties.secondary;
      }
      if ((itemType === 'paddle' || itemType === 'brick') && colorItem.properties.primary) {
        return colorItem.properties.primary;
      }
    }
    
    if (!specificItem) return defaultColor;
    
    const color = specificItem.properties?.color;
    if (color === 'rainbow') return `hsl(${frame % 360}, 70%, 50%)`;
    
    const colorMap: Record<string, string> = {
      default: defaultColor,
      red: "#ef4444",
      blue: "#3b82f6",
      purple: "#a855f7",
      neon: "#10b981",
      yellow: "#eab308",
    };
    
    return colorMap[color] || color || defaultColor;
  }, [theme, equippedItems]);

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 2;
      gameStateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 15,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  };

  const initGame = useCallback(() => {
    const bricks: Brick[] = [];
    const brickRowCount = 5;
    const brickColumnCount = 8;
    const brickWidth = 65;
    const brickHeight = 20;
    const brickPadding = 8;
    const brickOffsetTop = 60;
    const brickOffsetLeft = 12;

    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        bricks.push({
          x: c * (brickWidth + brickPadding) + brickOffsetLeft,
          y: r * (brickHeight + brickPadding) + brickOffsetTop,
          width: brickWidth,
          height: brickHeight,
          active: true,
          hasCoin: Math.random() < diffSettings.coinDropChance,
        });
      }
    }

    gameStateRef.current.bricks = bricks;
    gameStateRef.current.coins = [];
    gameStateRef.current.particles = [];
    gameStateRef.current.ballTrail = [];
    gameStateRef.current.ball = { 
      x: 300, 
      y: 300, 
      dx: diffSettings.ballSpeed, 
      dy: -diffSettings.ballSpeed, 
      radius: 8 
    };
    gameStateRef.current.paddle.speed = diffSettings.paddleSpeed;
    gameStateRef.current.score = 0;
    gameStateRef.current.coinsCollected = 0;
    gameStateRef.current.lives = 3;
    gameStateRef.current.timeRemaining = timeLimit;
    gameStateRef.current.startTime = Date.now();
    setScore(0);
    setCoinsCollected(0);
    setLives(3);
    setTimeRemaining(timeLimit);
  }, [diffSettings, timeLimit]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { ball, paddle, bricks, coins, particles, ballTrail, frame } = gameStateRef.current;
    const isDark = theme === 'dark';

    const paddleColor = getItemColor('paddle', frame);
    const ballColor = getItemColor('ball', frame);
    const brickColor = getItemColor('brick', frame);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    const backgroundItem = equippedItems?.background;
    if (backgroundItem) {
      const bgTheme = backgroundItem.properties?.theme;
      if (bgTheme === "space") {
        for (let i = 0; i < 30; i++) {
          const x = ((frame + i * 50) % canvas.width);
          const y = (i * 30) % canvas.height;
          ctx.fillStyle = isDark ? "#ffffff" : "#000000";
          ctx.globalAlpha = 0.3 + Math.random() * 0.4;
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
      } else if (bgTheme === "neon") {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 10; i++) {
          const y = (i * 60 + frame % 60);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    // Draw Aura
    const auraItem = equippedItems?.aura;
    if (auraItem) {
      const auraType = auraItem.properties?.type;
      const auraColors: Record<string, string> = {
        flower: "#ec4899",
        butterfly: "#8b5cf6",
        ice: "#3b82f6",
        fire: "#ef4444",
        lightning: "#eab308",
      };
      const auraColor = auraColors[auraType] || "#a855f7";
      
      const centerX = paddle.x + paddle.width / 2;
      const centerY = paddle.y + paddle.height / 2;
      const radius = 50 + Math.sin(frame * 0.05) * 5;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw ball trail
    const trailItem = equippedItems?.trail;
    const ballItem = equippedItems?.ball;
    if ((ballItem || trailItem) && ballTrail.length > 0) {
      ballTrail.forEach((pos, index) => {
        const alpha = pos.alpha * (index / ballTrail.length);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ball.radius * (0.5 + index / ballTrail.length * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fill();
      });
    }

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    
    if (ballItem?.properties?.effect === "glow") {
      ctx.shadowBlur = 15;
      ctx.shadowColor = ballColor;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw paddle
    const paddleItem = equippedItems?.paddle;
    if (paddleItem?.properties?.effect === "glow") {
      ctx.shadowBlur = 15;
      ctx.shadowColor = paddleColor;
    }
    ctx.fillStyle = paddleColor;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Draw bricks
    const brickItem = equippedItems?.brick;
    bricks.forEach((brick) => {
      if (brick.active) {
        const brickEffect = brickItem?.properties?.effect;
        
        if (brickEffect === "glow") {
          ctx.shadowBlur = 10;
          ctx.shadowColor = brickColor;
        }
        
        if (brickEffect === "dissolve") {
          ctx.globalAlpha = 0.8 + Math.sin(frame * 0.1 + brick.x) * 0.2;
        }
        
        ctx.fillStyle = brickColor;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });

    // Draw particles
    particles.forEach((particle, index) => {
      if (particle.life <= 0) {
        particles.splice(index, 1);
        return;
      }
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life / 40;
      ctx.fill();
      
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1;
      particle.life -= 1;
    });
    ctx.globalAlpha = 1;

    // Draw coins
    coins.forEach((coin) => {
      if (!coin.collected) {
        ctx.fillStyle = theme === 'dark' ? '#ffd700' : '#ff8c00';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw lives
    const heartSize = 18;
    const startX = canvas.width - heartSize * 3 - 20;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < gameStateRef.current.lives ? '#ef4444' : 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      const x = startX + i * (heartSize + 5);
      const y = 15;
      ctx.moveTo(x + heartSize / 2, y + heartSize * 0.3);
      ctx.bezierCurveTo(x + heartSize / 2, y, x, y, x, y + heartSize * 0.3);
      ctx.bezierCurveTo(x, y + heartSize * 0.6, x + heartSize / 2, y + heartSize * 0.8, x + heartSize / 2, y + heartSize);
      ctx.bezierCurveTo(x + heartSize / 2, y + heartSize * 0.8, x + heartSize, y + heartSize * 0.6, x + heartSize, y + heartSize * 0.3);
      ctx.bezierCurveTo(x + heartSize, y, x + heartSize / 2, y, x + heartSize / 2, y + heartSize * 0.3);
      ctx.fill();
    }
  }, [theme, equippedItems, getItemColor]);

  const updateGame = useCallback(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ball, paddle, bricks, coins, ballTrail } = gameStateRef.current;
    gameStateRef.current.frame++;

    // Update time
    const elapsed = Math.floor((Date.now() - gameStateRef.current.startTime) / 1000);
    const remaining = Math.max(0, timeLimit - elapsed);
    gameStateRef.current.timeRemaining = remaining;
    setTimeRemaining(remaining);

    if (remaining === 0) {
      setIsPlaying(false);
      onGameOver?.(gameStateRef.current.score, gameStateRef.current.coinsCollected, 0);
      return;
    }

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Update ball trail
    const trailItem = equippedItems?.trail;
    const ballItem = equippedItems?.ball;
    if (ballItem || trailItem) {
      ballTrail.push({ x: ball.x, y: ball.y, alpha: 0.8 });
      if (ballTrail.length > 10) ballTrail.shift();
    }

    // Wall collision
    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
      ball.dx = -ball.dx;
    }
    if (ball.y + ball.dy < ball.radius) {
      ball.dy = -ball.dy;
    }

    // Paddle collision
    if (
      ball.y + ball.dy > paddle.y - ball.radius &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width
    ) {
      ball.dy = -ball.dy;
    }

    // Bottom collision
    if (ball.y + ball.dy > canvas.height) {
      gameStateRef.current.lives--;
      setLives(gameStateRef.current.lives);
      
      if (gameStateRef.current.lives <= 0) {
        setIsPlaying(false);
        const timeBonus = remaining * 10;
        onGameOver?.(gameStateRef.current.score, gameStateRef.current.coinsCollected, timeBonus);
        return;
      } else {
        ball.x = 300;
        ball.y = 300;
        ball.dx = diffSettings.ballSpeed;
        ball.dy = -diffSettings.ballSpeed;
      }
    }

    // Brick collision
    const explosionItem = equippedItems?.explosion;
    bricks.forEach((brick) => {
      if (brick.active) {
        if (
          ball.x > brick.x &&
          ball.x < brick.x + brick.width &&
          ball.y > brick.y &&
          ball.y < brick.y + brick.height
        ) {
          ball.dy = -ball.dy;
          brick.active = false;
          gameStateRef.current.score += 10;
          setScore(gameStateRef.current.score);
          onScoreUpdate?.(gameStateRef.current.score);

          if (explosionItem) {
            const explosionType = explosionItem.properties?.type;
            const explosionColors: Record<string, string> = {
              fire: "#ef4444",
              ice: "#3b82f6",
              lightning: "#eab308",
              plasma: "#a855f7",
            };
            createExplosion(
              brick.x + brick.width / 2,
              brick.y + brick.height / 2,
              explosionColors[explosionType] || "#ef4444"
            );
          }

          if (brick.hasCoin) {
            coins.push({
              x: brick.x + brick.width / 2,
              y: brick.y + brick.height / 2,
              dy: 2,
              value: diffSettings.coinValue,
              collected: false,
            });
          }
        }
      }
    });

    // Update coins
    coins.forEach((coin) => {
      if (!coin.collected) {
        coin.y += coin.dy;

        if (
          coin.y + 6 > paddle.y &&
          coin.y - 6 < paddle.y + paddle.height &&
          coin.x + 6 > paddle.x &&
          coin.x - 6 < paddle.x + paddle.width
        ) {
          coin.collected = true;
          gameStateRef.current.coinsCollected += coin.value;
          setCoinsCollected(gameStateRef.current.coinsCollected);
          onCoinCollect?.(coin.value);
        }

        if (coin.y > canvas.height) {
          coin.collected = true;
        }
      }
    });

    drawGame();
    animationRef.current = requestAnimationFrame(updateGame);
  }, [isPlaying, timeLimit, diffSettings, equippedItems, onScoreUpdate, onGameOver, onCoinCollect, drawGame]);

  useEffect(() => {
    initGame();
    drawGame();

    const handleKeyDown = (e: KeyboardEvent) => {
      const { paddle } = gameStateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (settings.desktopControl === 'arrows' || settings.desktopControl === 'keys') {
        if ((e.key === "ArrowLeft" || e.key === "a") && paddle.x > 0) {
          paddle.x -= paddle.speed;
          drawGame();
        } else if ((e.key === "ArrowRight" || e.key === "d") && paddle.x < canvas.width - paddle.width) {
          paddle.x += paddle.speed;
          drawGame();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (settings.desktopControl !== 'hover') return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const { paddle } = gameStateRef.current;
      
      paddle.x = Math.max(0, Math.min(x - paddle.width / 2, canvas.width - paddle.width));
      if (!isPlaying) drawGame();
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setTouchStartX(touch.clientX - rect.left);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const { paddle } = gameStateRef.current;
      
      paddle.x = Math.max(0, Math.min(x - paddle.width / 2, canvas.width - paddle.width));
      if (!isPlaying) drawGame();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
      if (canvas) {
        canvas.removeEventListener("touchstart", handleTouchStart);
        canvas.removeEventListener("touchmove", handleTouchMove);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [settings, isPlaying, initGame, drawGame]);

  useEffect(() => {
    if (isPlaying) {
      updateGame();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, updateGame]);

  const handleReset = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    initGame();
    drawGame();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8 transition-all duration-300 hover:shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Clock className={`h-6 w-6 ${timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-foreground'}`} />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Time</p>
                <p className={`text-3xl font-bold tracking-tight ${timeRemaining < 30 ? 'text-red-500' : ''}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6" />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Score</p>
                <p className="text-3xl font-bold">{score}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Coins</p>
                <p className="text-3xl font-bold text-yellow-500">{coinsCollected}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`h-6 w-6 transition-all ${i < lives ? 'text-red-500 fill-red-500' : 'text-red-500/30'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="lg"
              onClick={() => setIsPlaying(!isPlaying)}
              className="gap-2"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button variant="outline" size="lg" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="relative aspect-square max-w-2xl mx-auto">
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="w-full h-full bg-background rounded-lg"
            style={{ touchAction: "none" }}
          />
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-center text-muted-foreground font-medium">
            Difficulty: <span className="capitalize font-bold">{currentDifficulty}</span>
            {' • '}
            Lives: {lives}/3
            {' • '}
            Break bricks before time runs out!
          </p>
        </div>
      </Card>
    </div>
  );
};