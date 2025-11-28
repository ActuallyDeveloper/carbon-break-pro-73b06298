import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Trophy, Coins } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useGameSettings } from "@/hooks/useGameSettings";
import { getDifficultySettings } from "@/lib/gameUtils";
import { Coin, Brick } from "@/types/game";
import { EquippedItems, PowerUp, PowerUpType } from "@/types/game";

type GameCanvasProps = {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number, coins: number) => void;
  onCoinCollect?: (coins: number) => void;
  equippedItems?: EquippedItems;
  enablePowerUps?: boolean;
};

export const GameCanvas = ({ onScoreUpdate, onGameOver, onCoinCollect, equippedItems, enablePowerUps = true }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const { settings } = useGameSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [ballTrail, setBallTrail] = useState<Array<{x: number, y: number}>>([]);
  const [activePowerUps, setActivePowerUps] = useState<Set<PowerUpType>>(new Set());
  const [shieldActive, setShieldActive] = useState(false);
  
  const diffSettings = getDifficultySettings(settings.difficulty);
  
  const gameStateRef = useRef({
    ball: { x: 300, y: 300, dx: diffSettings.ballSpeed, dy: -diffSettings.ballSpeed, radius: 8 },
    paddle: { x: 260, y: 550, width: 80, height: 10, speed: diffSettings.paddleSpeed },
    bricks: [] as Brick[],
    coins: [] as Coin[],
    powerUps: [] as PowerUp[],
    balls: [] as Array<{ x: number, y: number, dx: number, dy: number, radius: number }>,
    score: 0,
    coinsCollected: 0,
    animationId: null as number | null,
  });

  const activatePowerUp = (type: PowerUpType) => {
    const { ball, paddle, balls } = gameStateRef.current;
    
    switch (type) {
      case 'multiBall':
        // Spawn 2 extra balls
        balls.push(
          { x: ball.x, y: ball.y, dx: ball.dx * 1.2, dy: ball.dy, radius: ball.radius },
          { x: ball.x, y: ball.y, dx: ball.dx * 0.8, dy: ball.dy, radius: ball.radius }
        );
        break;
      case 'paddleSize':
        // Increase paddle width for 10 seconds
        paddle.width = Math.min(paddle.width + 40, 200);
        setTimeout(() => {
          paddle.width = 80;
        }, 10000);
        break;
      case 'slowBall':
        // Reduce ball speed for 8 seconds
        const originalDx = ball.dx;
        const originalDy = ball.dy;
        ball.dx *= 0.6;
        ball.dy *= 0.6;
        setTimeout(() => {
          ball.dx = originalDx;
          ball.dy = originalDy;
        }, 8000);
        break;
      case 'shield':
        // Activate shield
        setShieldActive(true);
        break;
    }

    setActivePowerUps(prev => new Set([...prev, type]));
    setTimeout(() => {
      setActivePowerUps(prev => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }, type === 'shield' ? 30000 : 10000);
  };

  const createBrickParticles = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 3;
      const particle = {
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        life: 20,
      };
      
      const animate = () => {
        if (particle.life <= 0) return;
        
        ctx.fillStyle = `rgba(59, 130, 246, ${particle.life / 20})`;
        ctx.fillRect(particle.x, particle.y, 3, 3);
        
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        
        if (particle.life > 0) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  };

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
    gameStateRef.current.powerUps = [];
    gameStateRef.current.balls = [];
    gameStateRef.current.ball = { 
      x: 300, 
      y: 300, 
      dx: diffSettings.ballSpeed, 
      dy: -diffSettings.ballSpeed, 
      radius: 8 
    };
    gameStateRef.current.paddle.speed = diffSettings.paddleSpeed;
    gameStateRef.current.paddle.width = 80;
    gameStateRef.current.score = 0;
    gameStateRef.current.coinsCollected = 0;
    setScore(0);
    setCoinsCollected(0);
    setActivePowerUps(new Set());
    setShieldActive(false);
  };

  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { ball, paddle, bricks, coins, powerUps, balls } = gameStateRef.current;
    const isDark = theme === 'dark';
    const defaultColor = isDark ? '#ffffff' : '#000000';
    
    // Get equipped item colors based on equipped items
    const getPaddleColor = () => {
      if (!equippedItems?.paddle) return defaultColor;
      return '#10b981'; // Neon green for equipped paddles
    };
    
    const getBallColor = () => {
      if (!equippedItems?.ball) return defaultColor;
      return '#ef4444'; // Red for equipped balls
    };

    const paddleColor = getPaddleColor();
    const ballColor = getBallColor();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw shield effect if active
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(paddle.x - 5, paddle.y - 5, paddle.width + 10, paddle.height + 10);
    }

    // Draw ball trail if equipped
    if (equippedItems?.ball && ballTrail.length > 0) {
      ballTrail.forEach((pos, index) => {
        const alpha = (index / ballTrail.length) * 0.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.fill();
        ctx.closePath();
      });
    }

    // Draw main ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    ctx.fill();
    ctx.closePath();

    // Draw extra balls
    balls.forEach((extraBall) => {
      ctx.beginPath();
      ctx.arc(extraBall.x, extraBall.y, extraBall.radius, 0, Math.PI * 2);
      ctx.fillStyle = ballColor;
      ctx.fill();
      ctx.closePath();
    });

    // Draw paddle with glow effect if equipped
    if (equippedItems?.paddle) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = paddleColor;
    }
    ctx.fillStyle = paddleColor;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Draw bricks
    bricks.forEach((brick) => {
      if (brick.active) {
        ctx.fillStyle = defaultColor;
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
        ctx.strokeStyle = defaultColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw power-ups
    powerUps.forEach((powerUp) => {
      if (!powerUp.collected) {
        const powerUpColors: Record<PowerUpType, string> = {
          multiBall: '#ef4444',
          paddleSize: '#3b82f6',
          slowBall: '#10b981',
          shield: '#8b5cf6',
        };
        
        ctx.fillStyle = powerUpColors[powerUp.type];
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = defaultColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw icon indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons: Record<PowerUpType, string> = {
          multiBall: '⚫',
          paddleSize: '📏',
          slowBall: '🐌',
          shield: '🛡️',
        };
        ctx.fillText(icons[powerUp.type], powerUp.x, powerUp.y);
      }
    });
  };

  const updateGame = () => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { ball, paddle, bricks, coins, powerUps, balls } = gameStateRef.current;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Update ball trail
    if (equippedItems?.ball) {
      setBallTrail(prev => [...prev.slice(-10), { x: ball.x, y: ball.y }]);
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
      if (shieldActive) {
        // Shield protects once
        ball.y = paddle.y - ball.radius;
        ball.dy = -Math.abs(ball.dy);
        setShieldActive(false);
        setActivePowerUps(prev => {
          const next = new Set(prev);
          next.delete('shield');
          return next;
        });
      } else {
        setIsPlaying(false);
        onGameOver?.(gameStateRef.current.score, gameStateRef.current.coinsCollected);
        return;
      }
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

          // Particle effect for brick breaking
          if (equippedItems?.powerup) {
            createBrickParticles(ctx, brick.x + brick.width / 2, brick.y + brick.height / 2);
          }

          // Drop coin
          if (brick.hasCoin) {
            coins.push({
              x: brick.x + brick.width / 2,
              y: brick.y + brick.height / 2,
              dy: 2,
              value: diffSettings.coinValue,
              collected: false,
            });
          }

          // Drop power-up
          if (enablePowerUps && Math.random() < 0.15) {
            const powerUpTypes: PowerUpType[] = ['multiBall', 'paddleSize', 'slowBall', 'shield'];
            const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            powerUps.push({
              x: brick.x + brick.width / 2,
              y: brick.y + brick.height / 2,
              dy: 2,
              type: randomType,
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

        // Check paddle collision
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

        // Remove coins that fall off screen
        if (coin.y > canvas.height) {
          coin.collected = true;
        }
      }
    });

    // Update power-ups
    powerUps.forEach((powerUp) => {
      if (!powerUp.collected) {
        powerUp.y += powerUp.dy;

        // Check paddle collision
        if (
          powerUp.y + 8 > paddle.y &&
          powerUp.y - 8 < paddle.y + paddle.height &&
          powerUp.x + 8 > paddle.x &&
          powerUp.x - 8 < paddle.x + paddle.width
        ) {
          powerUp.collected = true;
          activatePowerUp(powerUp.type);
        }

        // Remove power-ups that fall off screen
        if (powerUp.y > canvas.height) {
          powerUp.collected = true;
        }
      }
    });

    // Update extra balls
    balls.forEach((extraBall, index) => {
      extraBall.x += extraBall.dx;
      extraBall.y += extraBall.dy;

      // Wall collision
      if (extraBall.x + extraBall.dx > canvas.width - extraBall.radius || extraBall.x + extraBall.dx < extraBall.radius) {
        extraBall.dx = -extraBall.dx;
      }
      if (extraBall.y + extraBall.dy < extraBall.radius) {
        extraBall.dy = -extraBall.dy;
      }

      // Paddle collision
      if (
        extraBall.y + extraBall.dy > paddle.y - extraBall.radius &&
        extraBall.x > paddle.x &&
        extraBall.x < paddle.x + paddle.width
      ) {
        extraBall.dy = -extraBall.dy;
      }

      // Bottom collision - remove ball
      if (extraBall.y + extraBall.dy > canvas.height) {
        balls.splice(index, 1);
      }

      // Brick collision
      bricks.forEach((brick) => {
        if (brick.active) {
          if (
            extraBall.x > brick.x &&
            extraBall.x < brick.x + brick.width &&
            extraBall.y > brick.y &&
            extraBall.y < brick.y + brick.height
          ) {
            extraBall.dy = -extraBall.dy;
            brick.active = false;
            gameStateRef.current.score += 10;
            setScore(gameStateRef.current.score);
            onScoreUpdate?.(gameStateRef.current.score);
          }
        }
      });
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

      // Arrow keys control
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

  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8 transition-all duration-300 hover:shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6">
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
            Collect coins for extra currency!
          </p>
        </div>
      </Card>
    </div>
  );
};
