import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Trophy, Coins, Clock } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useGameSettings } from "@/hooks/useGameSettings";
import { getDifficultySettings, getTimeLimit } from "@/lib/gameUtils";
import { Coin, Brick } from "@/types/game";

type TimeLimitGameCanvasProps = {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number, coins: number, timeBonus: number) => void;
  onCoinCollect?: (coins: number) => void;
};

export const TimeLimitGameCanvas = ({ onScoreUpdate, onGameOver, onCoinCollect }: TimeLimitGameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const { settings } = useGameSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  
  const diffSettings = getDifficultySettings(settings.difficulty);
  const timeLimit = getTimeLimit(settings.difficulty);
  
  const gameStateRef = useRef({
    ball: { x: 300, y: 300, dx: diffSettings.ballSpeed, dy: -diffSettings.ballSpeed, radius: 8 },
    paddle: { x: 260, y: 550, width: 80, height: 10, speed: diffSettings.paddleSpeed },
    bricks: [] as Brick[],
    coins: [] as Coin[],
    score: 0,
    coinsCollected: 0,
    timeRemaining: timeLimit,
    startTime: 0,
    animationId: null as number | null,
  });

  const initGame = () => {
    const bricks: Brick[] = [];
    const brickRowCount = 5;
    const brickColumnCount = 8;
    const brickWidth = 70;
    const brickHeight = 20;
    const brickPadding = 5;
    const brickOffsetTop = 60;
    const brickOffsetLeft = 10;

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
    gameStateRef.current.timeRemaining = timeLimit;
    gameStateRef.current.startTime = Date.now();
    setScore(0);
    setCoinsCollected(0);
    setTimeRemaining(timeLimit);
  };

  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { ball, paddle, bricks, coins } = gameStateRef.current;
    const color = theme === 'dark' ? '#ffffff' : '#000000';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();

    // Draw paddle
    ctx.fillStyle = color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Draw bricks (without coin indicators)
    bricks.forEach((brick) => {
      if (brick.active) {
        ctx.fillStyle = color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      }
    });

    // Draw coins
    coins.forEach((coin) => {
      if (!coin.collected) {
        ctx.fillStyle = theme === 'dark' ? '#ffd700' : '#ff8c00';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  };

  const updateGame = () => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ball, paddle, bricks, coins } = gameStateRef.current;

    // Update time
    const elapsed = Math.floor((Date.now() - gameStateRef.current.startTime) / 1000);
    const remaining = Math.max(0, timeLimit - elapsed);
    gameStateRef.current.timeRemaining = remaining;
    setTimeRemaining(remaining);

    if (remaining === 0) {
      setIsPlaying(false);
      const timeBonus = 0;
      onGameOver?.(gameStateRef.current.score, gameStateRef.current.coinsCollected, timeBonus);
      return;
    }

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

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

    // Bottom collision (game over)
    if (ball.y + ball.dy > canvas.height) {
      setIsPlaying(false);
      const timeBonus = remaining * 10;
      onGameOver?.(gameStateRef.current.score, gameStateRef.current.coinsCollected, timeBonus);
      return;
    }

    // Brick collision
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

    // Check win condition
    const allBricksDestroyed = bricks.every(brick => !brick.active);
    if (allBricksDestroyed) {
      setIsPlaying(false);
      const timeBonus = remaining * 10;
      onGameOver?.(gameStateRef.current.score, gameStateRef.current.coinsCollected, timeBonus);
      return;
    }

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
    gameStateRef.current.animationId = requestAnimationFrame(updateGame);
  };

  useEffect(() => {
    initGame();
    drawGame();

    const handleKeyDown = (e: KeyboardEvent) => {
      const { paddle } = gameStateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (settings.desktopControl === 'arrows' || settings.desktopControl === 'keys') {
        if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && paddle.x > 0) {
          paddle.x -= paddle.speed;
          drawGame();
        } else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && paddle.x < canvas.width - paddle.width) {
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

      if (settings.mobileControl === 'swipe') {
        const diff = x - touchStartX;
        paddle.x = Math.max(0, Math.min(paddle.x + diff, canvas.width - paddle.width));
        setTouchStartX(x);
      } else if (settings.mobileControl === 'tap' || settings.mobileControl === 'touch') {
        paddle.x = Math.max(0, Math.min(x - paddle.width / 2, canvas.width - paddle.width));
      }
      
      if (!isPlaying) drawGame();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      if (gameStateRef.current.animationId) {
        cancelAnimationFrame(gameStateRef.current.animationId);
      }
    };
  }, [settings, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      updateGame();
    } else if (gameStateRef.current.animationId) {
      cancelAnimationFrame(gameStateRef.current.animationId);
    }
  }, [isPlaying]);

  const handleReset = () => {
    setIsPlaying(false);
    if (gameStateRef.current.animationId) {
      cancelAnimationFrame(gameStateRef.current.animationId);
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
              <Clock className={`h-6 w-6 ${timeRemaining < 30 ? 'text-red-500' : 'text-foreground'} transition-transform hover:scale-110`} />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Time</p>
                <p className={`text-3xl font-bold tracking-tight transition-all duration-200 ${timeRemaining < 30 ? 'text-red-500' : ''}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-foreground transition-transform hover:scale-110" />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Score</p>
                <p className="text-3xl font-bold tracking-tight transition-all duration-200">{score}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-400 transition-transform hover:scale-110" />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Coins</p>
                <p className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400 transition-all duration-200">{coinsCollected}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="lg"
              onClick={() => setIsPlaying(!isPlaying)}
              className="gap-2 transition-all duration-200 hover:scale-105"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleReset} 
              className="gap-2 transition-all duration-200 hover:scale-105"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="relative aspect-square max-w-2xl mx-auto transition-all duration-300">
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="w-full h-full border-2 border-border bg-background rounded-lg transition-all duration-300"
            style={{ touchAction: "none" }}
          />
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg transition-all duration-200 hover:bg-muted/80">
          <p className="text-sm text-center text-muted-foreground font-medium">
            {settings.desktopControl === 'arrows' && 'Use Arrow Keys (←→)'}
            {settings.desktopControl === 'keys' && 'Use A/D Keys or Arrows'}
            {settings.desktopControl === 'hover' && 'Move mouse to control paddle'}
            {' • '}
            Difficulty: <span className="capitalize font-bold">{settings.difficulty}</span>
            {' • '}
            Beat the clock! Time bonus: {timeRemaining * 10} points
          </p>
        </div>
      </Card>
    </div>
  );
};
