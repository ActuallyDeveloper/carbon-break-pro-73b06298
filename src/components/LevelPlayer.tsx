import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trophy, Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Brick, Coin, EquippedItems } from "@/types/game";

interface LevelPlayerProps {
  level: {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    creator_name: string;
    level_data: {
      bricks: Brick[];
      powerups: any[];
    };
  };
  onBack: () => void;
  equippedItems?: EquippedItems;
}

export const LevelPlayer = ({ level, onBack, equippedItems }: LevelPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [ballTrail, setBallTrail] = useState<Array<{x: number, y: number}>>([]);

  const gameStateRef = useRef({
    ball: { x: 300, y: 300, dx: 4, dy: -4, radius: 8 },
    paddle: { x: 260, y: 550, width: 80, height: 10, speed: 20 },
    bricks: [] as Brick[],
    coins: [] as Coin[],
    score: 0,
    coinsCollected: 0,
    frame: 0,
    animationId: null as number | null,
  });

  const initGame = () => {
    gameStateRef.current.bricks = level.level_data.bricks.map(b => ({ ...b, active: true }));
    gameStateRef.current.coins = [];
    gameStateRef.current.ball = { x: 300, y: 300, dx: 4, dy: -4, radius: 8 };
    gameStateRef.current.score = 0;
    gameStateRef.current.coinsCollected = 0;
    setScore(0);
    setCoinsCollected(0);
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
      }
    });
  };

  const updateGame = () => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ball, paddle, bricks, coins } = gameStateRef.current;
    gameStateRef.current.frame++;

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

    // Bottom collision
    if (ball.y + ball.dy > canvas.height) {
      setIsPlaying(false);
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

          if (brick.hasCoin) {
            coins.push({
              x: brick.x + brick.width / 2,
              y: brick.y + brick.height / 2,
              dy: 2,
              value: 5,
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

      if ((e.key === "ArrowLeft" || e.key === "a") && paddle.x > 0) {
        paddle.x -= paddle.speed;
        drawGame();
      } else if ((e.key === "ArrowRight" || e.key === "d") && paddle.x < canvas.width - paddle.width) {
        paddle.x += paddle.speed;
        drawGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gameStateRef.current.animationId) {
        cancelAnimationFrame(gameStateRef.current.animationId);
      }
    };
  }, [level]);

  useEffect(() => {
    if (isPlaying) {
      updateGame();
    } else if (gameStateRef.current.animationId) {
      cancelAnimationFrame(gameStateRef.current.animationId);
    }
  }, [isPlaying]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Browser
            </Button>
            <h1 className="text-3xl font-bold">{level.name}</h1>
            <p className="text-muted-foreground">
              By {level.creator_name} • {level.difficulty}
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{score}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Coins</p>
                  <p className="text-2xl font-bold text-yellow-500">{coinsCollected}</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsPlaying(!isPlaying)} size="lg">
              {isPlaying ? "Pause" : "Play"}
            </Button>
          </div>

          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="w-full border-2 border-border bg-background rounded-lg"
          />
        </Card>
      </div>
    </Layout>
  );
};
