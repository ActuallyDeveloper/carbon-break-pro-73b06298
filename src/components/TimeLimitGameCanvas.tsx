import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Trophy, Coins, Clock } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useGameSettings } from "@/hooks/useGameSettings";
import { getDifficultySettings, getTimeLimit } from "@/lib/gameUtils";
import { Coin, Brick, EquippedItems } from "@/types/game";

type TimeLimitGameCanvasProps = {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number, coins: number, timeBonus: number) => void;
  onCoinCollect?: (coins: number) => void;
  equippedItems?: EquippedItems;
};

export const TimeLimitGameCanvas = ({ onScoreUpdate, onGameOver, onCoinCollect, equippedItems }: TimeLimitGameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const { settings } = useGameSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [ballTrail, setBallTrail] = useState<Array<{x: number, y: number}>>([]);
  
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
    frame: 0,
    animationId: null as number | null,
  });

  const initGame = () => {
    const bricks: Brick[] = [];
    const brickRowCount = 5;
    const brickColumnCount = 8;
    // Adjusted dimensions for perfect centering on 600px canvas
    // 8 columns * 65px + 7 gaps * 8px = 520 + 56 = 576px total width
    // (600 - 576) / 2 = 12px margin on each side
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

    const { ball, paddle, bricks, coins, frame } = gameStateRef.current;
    const isDark = theme === 'dark';
    const defaultColor = isDark ? '#ffffff' : '#000000';

    const paddleItem = equippedItems?.paddle;
    const ballItem = equippedItems?.ball;
    const trailItem = equippedItems?.trail;
    const brickItem = equippedItems?.brick;
    const backgroundItem = equippedItems?.background;
    const auraItem = equippedItems?.aura;

    // Helper for paddle color mapping
    const getPaddleColor = () => {
      if (!paddleItem) return defaultColor;
      
      const material = paddleItem.properties?.material;
      if (material) {
        const paddleColors: Record<string, string> = {
          default: defaultColor,
          neon: "#10b981",
          chrome: "#94a3b8",
          gold: "#eab308",
          plasma: "#a855f7",
          rainbow: `hsl(${frame % 360}, 70%, 50%)`,
        };
        return paddleColors[material] || paddleItem.properties?.color || defaultColor;
      }
      
      return paddleItem.properties?.color || defaultColor;
    };
    
    // Helper for ball color mapping
    const getBallColor = () => {
      if (!ballItem) return defaultColor;
      
      const colorProp = ballItem.properties?.color;
      if (colorProp) {
         const ballColors: Record<string, string> = {
            default: defaultColor,
            red: "#ef4444",
            blue: "#3b82f6",
            purple: "#a855f7",
            neon: "#10b981",
            yellow: "#eab308",
            rainbow: `hsl(${frame % 360}, 70%, 50%)`,
          };
          return ballColors[colorProp] || colorProp;
      }
      return defaultColor;
    };
    
    const getBrickColor = () => {
      if (!brickItem) return defaultColor;
      return brickItem.properties?.color || defaultColor;
    };

    const paddleColor = getPaddleColor();
    const ballColor = getBallColor();
    const brickColor = getBrickColor();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    if (backgroundItem) {
        const bgTheme = backgroundItem.properties?.theme;
        if (bgTheme === "space") {
            for (let i = 0; i < 20; i++) {
              const x = ((frame + i * 50) % canvas.width);
              const y = (i * 30) % canvas.height;
              ctx.fillStyle = isDark ? "#ffffff" : "#000000";
              ctx.fillRect(x, y, 2, 2);
            }
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
        } else if (bgTheme === "matrix") {
            ctx.fillStyle = "#10b981";
            ctx.font = "14px monospace";
            ctx.globalAlpha = 0.1;
            for (let i = 0; i < 10; i++) {
              const x = i * 60;
              const y = (frame * 2 % canvas.height);
              ctx.fillText("01", x, y);
            }
            ctx.globalAlpha = 1;
        }
    }

    // Draw Aura
    if (auraItem) {
        const auraType = auraItem.properties?.type;
        const auraColors: Record<string, string> = {
            flower: "#ec4899",
            butterfly: "#8b5cf6",
            bat: "#6366f1",
            ice: "#3b82f6",
            fire: "#ef4444",
            lightning: "#eab308",
            shadow: "#64748b",
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

    // Draw ball trail if equipped
    if ((ballItem || trailItem) && ballTrail.length > 0) {
      const trailColor = trailItem?.properties?.color || ballColor;
      let r=239, g=68, b=68;
      if (trailColor.startsWith('#')) {
          const bigint = parseInt(trailColor.slice(1), 16);
          r = (bigint >> 16) & 255;
          g = (bigint >> 8) & 255;
          b = bigint & 255;
      }
      
      ballTrail.forEach((pos, index) => {
        const alpha = (index / ballTrail.length) * 0.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
        ctx.closePath();
      });
    }

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    ctx.fill();
    ctx.closePath();

    // Ball effect
    if (ballItem?.properties?.effect === "fire") {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ef4444";
        ctx.fill();
        ctx.shadowBlur = 0;
    } else if (ballItem?.properties?.effect === "glow") {
        ctx.shadowBlur = 10;
        ctx.shadowColor = ballColor;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Draw paddle
    if (paddleItem?.properties?.effect === "glow") {
      ctx.shadowBlur = 15;
      ctx.shadowColor = paddleColor;
    }
    ctx.fillStyle = paddleColor;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Draw bricks
    bricks.forEach((brick) => {
      if (brick.active) {
        ctx.fillStyle = brickColor;
        
        if (brickItem?.properties?.effect === "dissolve") {
             ctx.globalAlpha = 0.8 + Math.sin(frame * 0.1 + brick.x) * 0.2;
        }
        
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.globalAlpha = 1;
        
        if (brickItem?.properties?.effect === "particles") {
             ctx.fillStyle = `${defaultColor}44`;
             ctx.fillRect(brick.x + 5, brick.y + 5, 5, 5);
             ctx.fillRect(brick.x + brick.width - 10, brick.y + 10, 3, 3);
        }
      }
    });

    // Draw coins
    coins.forEach((coin) => {
      if (!coin.collected) {
        ctx.fillStyle = theme === 'dark' ? '#ffd700' : '#ff8c00';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = defaultColor;
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
    gameStateRef.current.frame++;

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

    // Update ball trail
    const trailItem = equippedItems?.trail;
    const ballItem = equippedItems?.ball;
    if (ballItem || trailItem) {
      const trailLength = trailItem?.properties?.length || 10;
      setBallTrail(prev => [...prev.slice(-trailLength), { x: ball.x, y: ball.y }]);
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
