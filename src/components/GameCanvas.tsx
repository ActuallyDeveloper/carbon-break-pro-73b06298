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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

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
  const [activePowerUps, setActivePowerUps] = useState<Set<PowerUpType>>(new Set());
  const [shieldActive, setShieldActive] = useState(false);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();
  
  const diffSettings = getDifficultySettings(settings.difficulty);
  
  const gameStateRef = useRef({
    ball: { x: 300, y: 300, dx: diffSettings.ballSpeed, dy: -diffSettings.ballSpeed, radius: 8 },
    paddle: { x: 260, y: 550, width: 80, height: 10, speed: diffSettings.paddleSpeed },
    bricks: [] as Brick[],
    coins: [] as Coin[],
    powerUps: [] as PowerUp[],
    balls: [] as Array<{ x: number, y: number, dx: number, dy: number, radius: number }>,
    particles: [] as Particle[],
    ballTrail: [] as Array<{x: number, y: number, alpha: number}>,
    score: 0,
    coinsCollected: 0,
    frame: 0,
  });

  const activatePowerUp = (type: PowerUpType) => {
    const { ball, paddle, balls } = gameStateRef.current;
    
    switch (type) {
      case 'multiBall':
        balls.push(
          { x: ball.x, y: ball.y, dx: ball.dx * 1.2, dy: ball.dy, radius: ball.radius },
          { x: ball.x, y: ball.y, dx: ball.dx * 0.8, dy: ball.dy, radius: ball.radius }
        );
        break;
      case 'paddleSize':
        paddle.width = Math.min(paddle.width + 40, 200);
        setTimeout(() => { paddle.width = 80; }, 10000);
        break;
      case 'slowBall':
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

  const createExplosion = (x: number, y: number, color: string, intensity: number = 1) => {
    const particleCount = Math.floor(20 * intensity);
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 3 * intensity;
      gameStateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 3,
      });
    }
    
    // Screen shake
    const shakeIntensity = 2 * intensity;
    setScreenShake({
      x: (Math.random() - 0.5) * shakeIntensity * 2,
      y: (Math.random() - 0.5) * shakeIntensity * 2,
    });
    setTimeout(() => setScreenShake({ x: 0, y: 0 }), 100);
  };

  const initGame = () => {
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
    gameStateRef.current.powerUps = [];
    gameStateRef.current.balls = [];
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
    gameStateRef.current.paddle.width = 80;
    gameStateRef.current.score = 0;
    gameStateRef.current.coinsCollected = 0;
    setScore(0);
    setCoinsCollected(0);
    setActivePowerUps(new Set());
    setShieldActive(false);
    setScreenShake({ x: 0, y: 0 });
  };

  // === COLOR HELPERS ===
  const getItemColor = (itemType: 'paddle' | 'ball' | 'brick', frame: number): string => {
    const isDark = theme === 'dark';
    const defaultColor = isDark ? '#ffffff' : '#000000';
    
    const skinItem = equippedItems?.skin;
    const colorItem = equippedItems?.color;
    const specificItem = equippedItems?.[itemType];
    
    // Check skin first
    if (skinItem?.properties?.target === itemType) {
      return skinItem.properties?.color || defaultColor;
    }
    
    // Check color theme
    if (colorItem?.properties) {
      if (itemType === 'ball' && colorItem.properties.secondary) {
        return colorItem.properties.secondary;
      }
      if ((itemType === 'paddle' || itemType === 'brick') && colorItem.properties.primary) {
        return colorItem.properties.primary;
      }
    }
    
    // Check specific item
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
      green: "#10b981",
      orange: "#f97316",
      pink: "#ec4899",
      silver: "#94a3b8",
      gold: "#eab308",
      brown: "#92400e",
    };
    
    if (color && colorMap[color]) return colorMap[color];
    if (color) return color;
    
    // Material-based colors for paddle
    if (itemType === 'paddle') {
      const material = specificItem.properties?.material;
      const materialMap: Record<string, string> = {
        chrome: "#94a3b8",
        gold: "#eab308",
        plasma: "#a855f7",
        crystal: "#3b82f6",
        diamond: "#e0e7ff",
      };
      if (material && materialMap[material]) return materialMap[material];
    }
    
    return defaultColor;
  };

  // === RENDERING HELPERS ===
  const drawBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: number) => {
    const backgroundItem = equippedItems?.background;
    const isDark = theme === 'dark';
    
    if (!backgroundItem) return;
    
    const bgTheme = backgroundItem.properties?.theme;
    
    switch (bgTheme) {
      case "space":
        for (let i = 0; i < 50; i++) {
          const x = ((frame + i * 50) % canvas.width);
          const y = ((i * 30) % canvas.height);
          ctx.fillStyle = isDark ? "#ffffff" : "#000000";
          ctx.globalAlpha = 0.3 + Math.random() * 0.4;
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
        break;
        
      case "neon":
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 10; i++) {
          const y = (i * 60 + frame % 60);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
        
      case "matrix":
        ctx.fillStyle = "#10b981";
        ctx.font = "14px monospace";
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 15; i++) {
          const x = i * 40;
          const y = (frame * 2 % canvas.height);
          ctx.fillText("01", x, y);
        }
        ctx.globalAlpha = 1;
        break;
        
      case "gradient":
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, backgroundItem.properties?.color1 || "#1e293b");
        gradient.addColorStop(1, backgroundItem.properties?.color2 || "#0f172a");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
    }
  };

  const drawAura = (ctx: CanvasRenderingContext2D, paddle: any, frame: number) => {
    const auraItem = equippedItems?.aura;
    if (!auraItem) return;
    
    const auraType = auraItem.properties?.type;
    const auraColors: Record<string, string> = {
      flower: "#ec4899",
      butterfly: "#8b5cf6",
      bat: "#6366f1",
      ice: "#3b82f6",
      fire: "#ef4444",
      lightning: "#eab308",
      shadow: "#64748b",
      energy: "#10b981",
    };
    
    const auraColor = auraColors[auraType] || "#a855f7";
    const centerX = paddle.x + paddle.width / 2;
    const centerY = paddle.y + paddle.height / 2;
    
    // Animated pulsing aura
    const baseRadius = 50;
    const pulseRadius = baseRadius + Math.sin(frame * 0.08) * 8;
    
    // Multiple aura rings for depth
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius - i * 10, 0, Math.PI * 2);
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 - i * 0.1;
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
  };

  const drawTrail = (ctx: CanvasRenderingContext2D, ballTrail: any[], ball: any, frame: number) => {
    const trailItem = equippedItems?.trail;
    const ballItem = equippedItems?.ball;
    
    if ((!trailItem && !ballItem) || ballTrail.length === 0) return;
    
    const trailEffect = trailItem?.properties?.effect || 'basic';
    let trailColor = trailItem?.properties?.color || getItemColor('ball', frame);
    
    // Parse color to rgb for alpha
    let r = 239, g = 68, b = 68;
    if (trailColor.startsWith('#')) {
      const bigint = parseInt(trailColor.slice(1), 16);
      r = (bigint >> 16) & 255;
      g = (bigint >> 8) & 255;
      b = bigint & 255;
    } else if (trailColor.startsWith('hsl')) {
      // For rainbow, use current frame color
      trailColor = `hsl(${frame % 360}, 70%, 50%)`;
    }
    
    ballTrail.forEach((pos, index) => {
      const alpha = pos.alpha * (index / ballTrail.length);
      const size = ball.radius * (0.5 + (index / ballTrail.length) * 0.5);
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      
      switch (trailEffect) {
        case 'fire':
          const fireGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size);
          fireGradient.addColorStop(0, `rgba(255, 165, 0, ${alpha})`);
          fireGradient.addColorStop(1, `rgba(255, 0, 0, ${alpha * 0.5})`);
          ctx.fillStyle = fireGradient;
          break;
          
        case 'ice':
          const iceGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size);
          iceGradient.addColorStop(0, `rgba(59, 130, 246, ${alpha})`);
          iceGradient.addColorStop(1, `rgba(147, 197, 253, ${alpha * 0.3})`);
          ctx.fillStyle = iceGradient;
          break;
          
        case 'lightning':
          ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#eab308';
          break;
          
        case 'rainbow':
          const hue = (frame + index * 10) % 360;
          ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;
          break;
          
        case 'shadow':
          ctx.fillStyle = `rgba(100, 116, 139, ${alpha * 0.6})`;
          break;
          
        default:
          if (trailColor.startsWith('rgba')) {
            ctx.fillStyle = trailColor;
          } else {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.closePath();
    });
  };

  const drawBall = (ctx: CanvasRenderingContext2D, ball: any, frame: number) => {
    const ballColor = getItemColor('ball', frame);
    const ballItem = equippedItems?.ball;
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    
    const effect = ballItem?.properties?.effect;
    
    switch (effect) {
      case 'fire':
        const fireGrad = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
        fireGrad.addColorStop(0, '#ffff00');
        fireGrad.addColorStop(0.5, '#ff6600');
        fireGrad.addColorStop(1, '#ff0000');
        ctx.fillStyle = fireGrad;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff4444';
        break;
        
      case 'ice':
        const iceGrad = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
        iceGrad.addColorStop(0, '#ffffff');
        iceGrad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = iceGrad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#3b82f6';
        break;
        
      case 'lightning':
        ctx.fillStyle = ballColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#eab308';
        // Lightning effect
        for (let i = 0; i < 3; i++) {
          const angle = (frame + i * 120) * 0.1;
          const x2 = ball.x + Math.cos(angle) * ball.radius * 1.5;
          const y2 = ball.y + Math.sin(angle) * ball.radius * 1.5;
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        break;
        
      case 'glow':
        ctx.fillStyle = ballColor;
        ctx.shadowBlur = 20;
        ctx.shadowColor = ballColor;
        break;
        
      case 'rainbow':
        const rainbowGrad = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
        rainbowGrad.addColorStop(0, `hsl(${frame % 360}, 100%, 70%)`);
        rainbowGrad.addColorStop(1, `hsl(${(frame + 60) % 360}, 100%, 50%)`);
        ctx.fillStyle = rainbowGrad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ballColor;
        break;
        
      default:
        ctx.fillStyle = ballColor;
    }
    
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();
  };

  const drawPaddle = (ctx: CanvasRenderingContext2D, paddle: any, frame: number) => {
    const paddleColor = getItemColor('paddle', frame);
    const paddleItem = equippedItems?.paddle;
    const effect = paddleItem?.properties?.effect;
    
    ctx.fillStyle = paddleColor;
    
    if (effect === 'glow') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = paddleColor;
    } else if (effect === 'sparkle') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = paddleColor;
      // Add sparkle particles
      for (let i = 0; i < 3; i++) {
        const sparkleX = paddle.x + Math.random() * paddle.width;
        const sparkleY = paddle.y + Math.random() * paddle.height;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(sparkleX, sparkleY, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = paddleColor;
    }
    
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;
    
    // Shield effect
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 4;
      ctx.strokeRect(paddle.x - 5, paddle.y - 5, paddle.width + 10, paddle.height + 10);
    }
  };

  const drawBricks = (ctx: CanvasRenderingContext2D, bricks: Brick[], frame: number) => {
    const brickColor = getItemColor('brick', frame);
    const brickItem = equippedItems?.brick;
    const brickEffect = brickItem?.properties?.effect;
    
    bricks.forEach((brick) => {
      if (!brick.active) return;
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
      switch (brickEffect) {
        case 'glow':
          ctx.shadowBlur = 12;
          ctx.shadowColor = brickColor;
          ctx.fillStyle = brickColor;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          break;
          
        case 'dissolve':
          ctx.globalAlpha = 0.7 + Math.sin(frame * 0.1 + brick.x) * 0.3;
          ctx.fillStyle = brickColor;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          break;
          
        case 'particles':
          ctx.fillStyle = brickColor;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          // Floating particles
          for (let i = 0; i < 4; i++) {
            const offsetX = Math.sin(frame * 0.05 + brick.x + i) * 4;
            const offsetY = Math.cos(frame * 0.05 + brick.y + i) * 4;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(
              brick.x + brick.width / 2 + offsetX - 2,
              brick.y + brick.height / 2 + offsetY - 2,
              3, 3
            );
          }
          ctx.globalAlpha = 1;
          break;
          
        case 'explode':
        case 'explosion':
          const pulseSize = Math.sin(frame * 0.15) * 2;
          ctx.fillStyle = brickColor;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444';
          ctx.fillRect(
            brick.x - pulseSize,
            brick.y - pulseSize,
            brick.width + pulseSize * 2,
            brick.height + pulseSize * 2
          );
          break;
          
        case 'shatter':
          ctx.fillStyle = brickColor;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          // Crack lines
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(brick.x, brick.y + brick.height / 2);
          ctx.lineTo(brick.x + brick.width, brick.y + brick.height / 2);
          ctx.moveTo(brick.x + brick.width / 2, brick.y);
          ctx.lineTo(brick.x + brick.width / 2, brick.y + brick.height);
          ctx.stroke();
          break;
          
        default:
          ctx.fillStyle = brickColor;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      }
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    });
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    particles.forEach((particle, index) => {
      if (particle.life <= 0) {
        particles.splice(index, 1);
        return;
      }
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life / 50;
      ctx.fill();
      ctx.closePath();
      
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.life -= 1;
    });
    ctx.globalAlpha = 1;
  };

  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { ball, paddle, bricks, coins, powerUps, balls, particles, ballTrail, frame } = gameStateRef.current;
    
    // Apply screen shake
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);
    
    // Clear canvas
    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

    // Draw all layers in order
    drawBackground(ctx, canvas, frame);
    drawAura(ctx, paddle, frame);
    drawTrail(ctx, ballTrail, ball, frame);
    drawBall(ctx, ball, frame);
    
    // Draw extra balls
    balls.forEach(extraBall => drawBall(ctx, extraBall, frame));
    
    drawPaddle(ctx, paddle, frame);
    
    // Opponent paddle
    if (opponentPaddleX !== undefined && opponentPaddleX !== null) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(opponentPaddleX, paddle.y + 30, paddle.width, paddle.height);
    }
    
    drawBricks(ctx, bricks, frame);
    drawParticles(ctx, particles);

    // Draw coins
    coins.forEach((coin) => {
      if (!coin.collected) {
        ctx.fillStyle = theme === 'dark' ? '#ffd700' : '#ff8c00';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme === 'dark' ? '#ffffff' : '#000000';
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
        ctx.strokeStyle = theme === 'dark' ? '#ffffff' : '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const icons: Record<PowerUpType, string> = {
          multiBall: '⚫',
          paddleSize: '📏',
          slowBall: '🐌',
          shield: '🛡️',
        };
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icons[powerUp.type], powerUp.x, powerUp.y);
      }
    });
    
    ctx.restore();
  };

  const updateGame = () => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    gameStateRef.current.frame++;
    const { ball, paddle, bricks, coins, powerUps, balls, ballTrail, frame } = gameStateRef.current;
    const explosionItem = equippedItems?.explosion;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    onBallMove?.(ball.x, ball.y);

    // Update ball trail
    const trailItem = equippedItems?.trail;
    const ballItem = equippedItems?.ball;
    if (ballItem || trailItem) {
      const trailLength = trailItem?.properties?.length || 10;
      ballTrail.push({ x: ball.x, y: ball.y, alpha: 0.8 });
      if (ballTrail.length > trailLength) {
        ballTrail.shift();
      }
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
      if (shieldActive) {
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

          // Explosion effect
          if (explosionItem) {
            const explosionType = explosionItem.properties?.type || explosionItem.properties?.effect;
            const explosionColors: Record<string, string> = {
              fire: "#ef4444",
              ice: "#3b82f6",
              lightning: "#eab308",
              plasma: "#a855f7",
              blackhole: "#000000",
              rainbow: `hsl(${frame % 360}, 70%, 50%)`,
              basic: "#ef4444",
            };
            const explosionColor = explosionColors[explosionType] || "#ef4444";
            const intensity = explosionType === 'blackhole' ? 2 : explosionType === 'plasma' ? 1.5 : 1;
            
            createExplosion(
              brick.x + brick.width / 2,
              brick.y + brick.height / 2,
              explosionColor,
              intensity
            );
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

    // Update power-ups
    powerUps.forEach((powerUp) => {
      if (!powerUp.collected) {
        powerUp.y += powerUp.dy;

        if (
          powerUp.y + 8 > paddle.y &&
          powerUp.y - 8 < paddle.y + paddle.height &&
          powerUp.x + 8 > paddle.x &&
          powerUp.x - 8 < paddle.x + paddle.width
        ) {
          powerUp.collected = true;
          activatePowerUp(powerUp.type);
        }

        if (powerUp.y > canvas.height) {
          powerUp.collected = true;
        }
      }
    });

    // Update extra balls
    balls.forEach((extraBall, index) => {
      extraBall.x += extraBall.dx;
      extraBall.y += extraBall.dy;

      if (extraBall.x + extraBall.dx > canvas.width - extraBall.radius || extraBall.x + extraBall.dx < extraBall.radius) {
        extraBall.dx = -extraBall.dx;
      }
      if (extraBall.y + extraBall.dy < extraBall.radius) {
        extraBall.dy = -extraBall.dy;
      }

      if (
        extraBall.y + extraBall.dy > paddle.y - extraBall.radius &&
        extraBall.x > paddle.x &&
        extraBall.x < paddle.x + paddle.width
      ) {
        extraBall.dy = -extraBall.dy;
      }

      if (extraBall.y + extraBall.dy > canvas.height) {
        balls.splice(index, 1);
      }

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
