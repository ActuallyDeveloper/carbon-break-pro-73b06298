import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trophy, Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Brick, Coin } from "@/types/game";

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
}

export const LevelPlayer = ({ level, onBack }: LevelPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);

  const gameStateRef = useRef({
    ball: { x: 300, y: 300, dx: 4, dy: -4, radius: 8 },
    paddle: { x: 260, y: 550, width: 80, height: 10, speed: 20 },
    bricks: [] as Brick[],
    coins: [] as Coin[],
    score: 0,
    coinsCollected: 0,
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

    // Draw bricks
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
      }
    });
  };

  const updateGame = () => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ball, paddle, bricks, coins } = gameStateRef.current;

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
