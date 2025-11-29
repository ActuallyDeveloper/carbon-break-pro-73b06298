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
  onPaddleMove?: (paddleX: number) => void;
  onBallMove?: (ballX: number, ballY: number) => void;
  opponentPaddleX?: number;
};

export const GameCanvas = ({ 
  onScoreUpdate, 
  onGameOver, 
  onCoinCollect, 
  equippedItems, 
  enablePowerUps = true,
  onPaddleMove,
  onBallMove,
  opponentPaddleX,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const { settings } = useGameSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [ballTrail, setBallTrail] = useState<Array<{x: number, y: number}>>([]);
  const [activePowerUps, setActivePowerUps] = useState<Set<PowerUpType>>(new Set());
  const [shieldActive, setShieldActive] = useState(false);
  const animationRef = useRef<number>();
  
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
    frame: 0,
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

    const { ball, paddle, bricks, coins, powerUps, balls, frame } = gameStateRef.current;
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
      
      const effect = brickItem.properties?.effect;
      const color = brickItem.properties?.color;
      
      if (color) {
        const brickColors: Record<string, string> = {
          default: defaultColor,
          red: "#ef4444",
          blue: "#3b82f6",
          green: "#10b981",
          purple: "#a855f7",
          yellow: "#eab308",
          orange: "#f97316",
          pink: "#ec4899",
          rainbow: `hsl(${frame % 360}, 70%, 50%)`,
        };
        return brickColors[color] || color;
      }
      
      if (effect) {
        const effectColors: Record<string, string> = {
          dissolve: "#8b5cf6",
          particles: "#3b82f6",
          glow: "#10b981",
          explode: "#ef4444",
        };
        return effectColors[effect] || defaultColor;
      }
      
      return defaultColor;
    };

    const paddleColor = getPaddleColor();
    const ballColor = getBallColor();
    const brickColor = getBrickColor();

    // Clear canvas
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
        
        // Draw aura around paddle center
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

    // Draw shield effect if active
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(paddle.x - 5, paddle.y - 5, paddle.width + 10, paddle.height + 10);
    }

    // Draw ball trail if equipped
    if ((ballItem || trailItem) && ballTrail.length > 0) {
      const trailColor = trailItem?.properties?.color || ballColor;
      // Simple hex to rgb conversion for alpha
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

    // Draw main ball
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

    // Draw extra balls
    balls.forEach((extraBall) => {
      ctx.beginPath();
      ctx.arc(extraBall.x, extraBall.y, extraBall.radius, 0, Math.PI * 2);
      ctx.fillStyle = ballColor;
      ctx.fill();
      ctx.closePath();
    });

    // Draw paddle with glow effect if equipped
    if (paddleItem?.properties?.effect === "glow") {
      ctx.shadowBlur = 15;
      ctx.shadowColor = paddleColor;
    }
    ctx.fillStyle = paddleColor;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Draw opponent paddle if in multiplayer
    if (opponentPaddleX !== undefined && opponentPaddleX !== null) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; // Red semi-transparent
      ctx.fillRect(opponentPaddleX, paddle.y + 30, paddle.width, paddle.height);
    }

    // Draw bricks
    bricks.forEach((brick) => {
      if (brick.active) {
        const brickEffect = brickItem?.properties?.effect;
        
        // Apply brick glow effect
        if (brickEffect === "glow") {
          ctx.shadowBlur = 10;
          ctx.shadowColor = brickColor;
        }
        
        // Apply dissolve opacity
        if (brickEffect === "dissolve") {
          ctx.globalAlpha = 0.8 + Math.sin(frame * 0.1 + brick.x) * 0.2;
        }
        
        ctx.fillStyle = brickColor;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        // Brick particles effect
        if (brickEffect === "particles") {
          for (let i = 0; i < 3; i++) {
            const offsetX = Math.sin(frame * 0.1 + brick.x + i) * 3;
            const offsetY = Math.cos(frame * 0.1 + brick.y + i) * 3;
            ctx.fillStyle = brickColor;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(
              brick.x + brick.width / 2 + offsetX - 2, 
              brick.y + brick.height / 2 + offsetY - 2, 
              4, 
              4
            );
          }
          ctx.globalAlpha = 1;
        }
        
        // Explode effect (pulsing)
        if (brickEffect === "explode") {
          const pulseSize = Math.sin(frame * 0.1) * 2;
          ctx.fillStyle = brickColor;
          ctx.fillRect(
            brick.x - pulseSize, 
            brick.y - pulseSize, 
            brick.width + pulseSize * 2, 
            brick.height + pulseSize * 2
          );
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

    gameStateRef.current.frame++;
    const { ball, paddle, bricks, coins, powerUps, balls } = gameStateRef.current;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Broadcast ball position for multiplayer
    onBallMove?.(ball.x, ball.y);

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
    animationRef.current = requestAnimationFrame(updateGame);
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
          onPaddleMove?.(paddle.x);
          drawGame();
        } else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && paddle.x < canvas.width - paddle.width) {
          paddle.x += paddle.speed;
          onPaddleMove?.(paddle.x);
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
      onPaddleMove?.(paddle.x);
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
      
      onPaddleMove?.(paddle.x);
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [settings, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      updateGame();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying]);

  const handleReset = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
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
