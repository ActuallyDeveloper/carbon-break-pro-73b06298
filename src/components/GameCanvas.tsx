import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Trophy, Coins, Heart } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useGameSettings } from "@/hooks/useGameSettings";
import { getDifficultySettings } from "@/lib/gameUtils";
import { Coin, Brick, Difficulty } from "@/types/game";
import { EquippedItems, PowerUp, PowerUpType } from "@/types/game";
import { getGlobalSoundInstance } from "@/hooks/useSoundEffects";

type GameCanvasProps = {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number, coins: number) => void;
  onCoinCollect?: (coins: number) => void;
  equippedItems?: EquippedItems;
  enablePowerUps?: boolean;
  onPaddleMove?: (paddleX: number) => void;
  onBallMove?: (ballX: number, ballY: number) => void;
  opponentPaddleX?: number;
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

export const GameCanvas = ({ 
  onScoreUpdate, 
  onGameOver, 
  onCoinCollect, 
  equippedItems, 
  enablePowerUps = true,
  onPaddleMove,
  onBallMove,
  opponentPaddleX,
  difficulty: propDifficulty,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const { settings } = useGameSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [lives, setLives] = useState(3);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchHolding, setTouchHolding] = useState(false);
  const [activePowerUps, setActivePowerUps] = useState<Set<PowerUpType>>(new Set());
  const [shieldActive, setShieldActive] = useState(false);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const [screenFlash, setScreenFlash] = useState<{ color: string; alpha: number } | null>(null);
  const animationRef = useRef<number>();
  const gameStartedRef = useRef(false);
  
  const currentDifficulty = propDifficulty || settings.difficulty;
  const diffSettings = getDifficultySettings(currentDifficulty);
  const soundRef = useRef(getGlobalSoundInstance());
  
  // Initialize with proper speed values
  const initialSpeed = Math.max(diffSettings.ballSpeed, 3);
  
  const gameStateRef = useRef({
    ball: { x: 300, y: 450, dx: initialSpeed, dy: -initialSpeed, radius: 10 },
    paddle: { x: 250, y: 550, width: 100, height: 14, speed: diffSettings.paddleSpeed },
    bricks: [] as Brick[],
    coins: [] as Coin[],
    powerUps: [] as PowerUp[],
    balls: [] as Array<{ x: number, y: number, dx: number, dy: number, radius: number }>,
    particles: [] as Particle[],
    rarityParticles: [] as RarityParticle[],
    ballTrail: [] as Array<{x: number, y: number, alpha: number}>,
    score: 0,
    coinsCollected: 0,
    lives: 3,
    frame: 0,
    gameActive: false,
  });

  // Get item rarity from equipped items
  const getItemRarity = useCallback((itemType: string): string => {
    const item = equippedItems?.[itemType as keyof EquippedItems];
    return (item?.properties as any)?.rarity || 'common';
  }, [equippedItems]);

  // Create rarity-based particles
  const createRarityParticles = useCallback((x: number, y: number, rarity: string) => {
    const count = rarity === 'legendary' ? 8 : rarity === 'epic' ? 5 : rarity === 'rare' ? 3 : 0;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 1 + Math.random() * 2;
      
      let color = '#ffffff';
      let hue = undefined;
      
      if (rarity === 'legendary') {
        hue = Math.random() * 360; // Rainbow
      } else if (rarity === 'epic') {
        color = '#a855f7'; // Purple glow
      } else if (rarity === 'rare') {
        color = '#3b82f6'; // Blue shine
      }
      
      gameStateRef.current.rarityParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        color,
        size: rarity === 'legendary' ? 4 : 3,
        hue,
      });
    }
  }, []);

  const triggerScreenFlash = (color: string, alpha: number = 0.3) => {
    setScreenFlash({ color, alpha });
    setTimeout(() => setScreenFlash(null), 150);
  };

  const createCoinParticles = (x: number, y: number, value: number) => {
    const particleCount = 10 + value * 2;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 1.5 + Math.random() * 2.5;
      gameStateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 40 + Math.random() * 20,
        color: '#ffd700',
        size: 3 + Math.random() * 3,
      });
    }
    triggerScreenFlash('rgba(255, 215, 0, 0.3)', 0.25);
  };

  const createPowerUpParticles = (x: number, y: number, type: PowerUpType) => {
    const colors: Record<PowerUpType, string> = {
      multiBall: '#ef4444',
      paddleSize: '#3b82f6',
      slowBall: '#10b981',
      shield: '#8b5cf6',
    };
    const color = colors[type];
    
    for (let ring = 0; ring < 2; ring++) {
      const particleCount = 15 + ring * 5;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 2.5 + ring * 1.5;
        gameStateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 50 + Math.random() * 25,
          color,
          size: 3 + Math.random() * 4,
        });
      }
    }
    triggerScreenFlash(color + '40', 0.4);
  };

  const activatePowerUp = (type: PowerUpType) => {
    const { ball, paddle, balls } = gameStateRef.current;
    
    // Create power-up activation particles
    createPowerUpParticles(paddle.x + paddle.width / 2, paddle.y, type);
    
    switch (type) {
      case 'multiBall':
        balls.push(
          { x: ball.x, y: ball.y, dx: ball.dx * 1.2, dy: ball.dy, radius: ball.radius },
          { x: ball.x, y: ball.y, dx: ball.dx * 0.8, dy: ball.dy, radius: ball.radius }
        );
        break;
      case 'paddleSize':
        paddle.width = Math.min(paddle.width + 40, 200);
        setTimeout(() => { paddle.width = 100; }, 10000);
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
    
    const shakeIntensity = 2 * intensity;
    setScreenShake({
      x: (Math.random() - 0.5) * shakeIntensity * 2,
      y: (Math.random() - 0.5) * shakeIntensity * 2,
    });
    setTimeout(() => setScreenShake({ x: 0, y: 0 }), 100);
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

    // FIXED: Ensure ball ALWAYS has proper initial velocity
    const speed = Math.max(diffSettings.ballSpeed, 4);
    const randomAngle = -Math.PI / 4 - Math.random() * Math.PI / 2; // Between -45 and -135 degrees (upward)
    const ballDx = Math.cos(randomAngle) * speed;
    const ballDy = Math.sin(randomAngle) * speed;

    gameStateRef.current.bricks = bricks;
    gameStateRef.current.coins = [];
    gameStateRef.current.powerUps = [];
    gameStateRef.current.balls = [];
    gameStateRef.current.particles = [];
    gameStateRef.current.rarityParticles = [];
    gameStateRef.current.ballTrail = [];
    gameStateRef.current.ball = { 
      x: 300, 
      y: 480,
      dx: ballDx, 
      dy: ballDy, 
      radius: 10
    };
    gameStateRef.current.paddle = { 
      x: 250, 
      y: 550, 
      width: 100,
      height: 14,
      speed: Math.max(diffSettings.paddleSpeed, 15)
    };
    gameStateRef.current.score = 0;
    gameStateRef.current.coinsCollected = 0;
    gameStateRef.current.lives = 3;
    gameStateRef.current.frame = 0;
    gameStateRef.current.gameActive = true;
    gameStartedRef.current = false;
    setScore(0);
    setCoinsCollected(0);
    setLives(3);
    setActivePowerUps(new Set());
    setShieldActive(false);
    setScreenShake({ x: 0, y: 0 });
    setScreenFlash(null);
  }, [diffSettings]);

  const getItemColor = (itemType: 'paddle' | 'ball' | 'brick', frame: number): string => {
    const isDark = theme === 'dark';
    const defaultColor = isDark ? '#ffffff' : '#000000';
    
    const skinItem = equippedItems?.skin;
    const colorItem = equippedItems?.color;
    const specificItem = equippedItems?.[itemType];
    
    if (skinItem?.properties?.target === itemType) {
      return skinItem.properties?.color || defaultColor;
    }
    
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
      green: "#10b981",
      orange: "#f97316",
      pink: "#ec4899",
      silver: "#94a3b8",
      gold: "#eab308",
      brown: "#92400e",
    };
    
    if (color && colorMap[color]) return colorMap[color];
    if (color) return color;
    
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

  const drawBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: number) => {
    const backgroundItem = equippedItems?.background;
    const isDark = theme === 'dark';
    
    // Always draw a base gradient background for better game feel
    const baseGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isDark) {
      baseGradient.addColorStop(0, 'hsl(240, 10%, 8%)');
      baseGradient.addColorStop(0.5, 'hsl(240, 15%, 6%)');
      baseGradient.addColorStop(1, 'hsl(240, 20%, 4%)');
    } else {
      baseGradient.addColorStop(0, 'hsl(220, 30%, 98%)');
      baseGradient.addColorStop(0.5, 'hsl(220, 25%, 95%)');
      baseGradient.addColorStop(1, 'hsl(220, 20%, 92%)');
    }
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw subtle grid pattern
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    if (!backgroundItem) return;
    
    const bgTheme = backgroundItem.properties?.theme;
    
    switch (bgTheme) {
      case "space":
        for (let i = 0; i < 80; i++) {
          const x = ((frame * 0.5 + i * 50) % canvas.width);
          const y = ((i * 30 + Math.sin(i) * 20) % canvas.height);
          const size = 1 + Math.random() * 2;
          ctx.fillStyle = isDark ? "#ffffff" : "#000000";
          ctx.globalAlpha = 0.2 + Math.sin(frame * 0.05 + i) * 0.3;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
        
      case "neon":
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 15; i++) {
          const y = (i * 40 + (frame * 0.5) % 40);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        ctx.strokeStyle = "#3b82f6";
        for (let i = 0; i < 15; i++) {
          const x = (i * 40 + (frame * 0.3) % 40);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
        
      case "matrix":
        ctx.fillStyle = "#10b981";
        ctx.font = "12px monospace";
        ctx.globalAlpha = 0.12;
        for (let i = 0; i < 20; i++) {
          const x = i * 30;
          const speed = 1 + (i % 3);
          const y = ((frame * speed) % (canvas.height + 100)) - 50;
          const chars = "01";
          for (let j = 0; j < 8; j++) {
            ctx.fillText(chars[Math.floor(Math.random() * 2)], x, y + j * 14);
          }
        }
        ctx.globalAlpha = 1;
        break;
        
      case "gradient":
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, backgroundItem.properties?.color1 || "hsl(240, 40%, 20%)");
        gradient.addColorStop(0.5, backgroundItem.properties?.color2 || "hsl(280, 40%, 15%)");
        gradient.addColorStop(1, backgroundItem.properties?.color1 || "hsl(240, 40%, 20%)");
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
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
    
    const baseRadius = 50;
    const pulseRadius = baseRadius + Math.sin(frame * 0.08) * 8;
    
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

  const drawRarityEffects = (ctx: CanvasRenderingContext2D, ball: any, paddle: any, frame: number) => {
    const ballRarity = getItemRarity('ball');
    const paddleRarity = getItemRarity('paddle');
    
    // Legendary rainbow trail
    if (ballRarity === 'legendary') {
      for (let i = 0; i < 5; i++) {
        const hue = (frame * 5 + i * 30) % 360;
        const offset = i * 3;
        ctx.beginPath();
        ctx.arc(ball.x - ball.dx * offset * 0.5, ball.y - ball.dy * offset * 0.5, ball.radius * (1 - i * 0.15), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.6 - i * 0.1})`;
        ctx.fill();
      }
    }
    
    // Epic pulsing glow
    if (ballRarity === 'epic') {
      const glowSize = ball.radius + 5 + Math.sin(frame * 0.1) * 3;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.fill();
    }
    
    // Rare shine effect
    if (ballRarity === 'rare') {
      const shineAngle = (frame * 0.05) % (Math.PI * 2);
      const shineX = ball.x + Math.cos(shineAngle) * ball.radius * 0.5;
      const shineY = ball.y + Math.sin(shineAngle) * ball.radius * 0.5;
      ctx.beginPath();
      ctx.arc(shineX, shineY, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    }
    
    // Paddle rarity effects
    if (paddleRarity === 'legendary') {
      const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
      for (let i = 0; i <= 10; i++) {
        const hue = (frame * 3 + i * 36) % 360;
        gradient.addColorStop(i / 10, `hsla(${hue}, 70%, 50%, 0.5)`);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(paddle.x, paddle.y - 3, paddle.width, paddle.height + 6);
    }
    
    if (paddleRarity === 'epic') {
      const pulseAlpha = 0.3 + Math.sin(frame * 0.1) * 0.2;
      ctx.fillStyle = `rgba(168, 85, 247, ${pulseAlpha})`;
      ctx.fillRect(paddle.x - 2, paddle.y - 2, paddle.width + 4, paddle.height + 4);
    }
  };

  const drawTrail = (ctx: CanvasRenderingContext2D, ballTrail: any[], ball: any, frame: number) => {
    const trailItem = equippedItems?.trail;
    const ballItem = equippedItems?.ball;
    
    if ((!trailItem && !ballItem) || ballTrail.length === 0) return;
    
    const trailEffect = trailItem?.properties?.effect || 'basic';
    let trailColor = trailItem?.properties?.color || getItemColor('ball', frame);
    
    let r = 239, g = 68, b = 68;
    if (trailColor.startsWith('#')) {
      const bigint = parseInt(trailColor.slice(1), 16);
      r = (bigint >> 16) & 255;
      g = (bigint >> 8) & 255;
      b = bigint & 255;
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
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.closePath();
    });
  };

  const drawBall = (ctx: CanvasRenderingContext2D, ball: any, frame: number) => {
    const ballColor = getItemColor('ball', frame);
    const ballItem = equippedItems?.ball;
    const effect = ballItem?.properties?.effect;
    const isDark = theme === 'dark';
    
    // Draw outer glow for all balls
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 4, 0, Math.PI * 2);
    const glowGrad = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.5, ball.x, ball.y, ball.radius + 4);
    glowGrad.addColorStop(0, 'transparent');
    glowGrad.addColorStop(0.7, `${ballColor}40`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fill();
    
    // Main ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    
    switch (effect) {
      case 'fire':
        const fireGrad = ctx.createRadialGradient(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0, ball.x, ball.y, ball.radius);
        fireGrad.addColorStop(0, '#ffffff');
        fireGrad.addColorStop(0.2, '#ffff00');
        fireGrad.addColorStop(0.5, '#ff6600');
        fireGrad.addColorStop(1, '#ff0000');
        ctx.fillStyle = fireGrad;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff4444';
        break;
        
      case 'ice':
        const iceGrad = ctx.createRadialGradient(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0, ball.x, ball.y, ball.radius);
        iceGrad.addColorStop(0, '#ffffff');
        iceGrad.addColorStop(0.3, '#a5d8ff');
        iceGrad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = iceGrad;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#3b82f6';
        break;
        
      case 'lightning':
        ctx.fillStyle = '#eab308';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#eab308';
        ctx.fill();
        for (let i = 0; i < 4; i++) {
          const angle = (frame * 0.15 + i * 90) * (Math.PI / 180) * 4;
          const x2 = ball.x + Math.cos(angle) * ball.radius * 2;
          const y2 = ball.y + Math.sin(angle) * ball.radius * 2;
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
        
      case 'glow':
        ctx.fillStyle = ballColor;
        ctx.shadowBlur = 25;
        ctx.shadowColor = ballColor;
        break;
        
      case 'rainbow':
        const rainbowGrad = ctx.createRadialGradient(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0, ball.x, ball.y, ball.radius);
        rainbowGrad.addColorStop(0, '#ffffff');
        rainbowGrad.addColorStop(0.3, `hsl(${frame % 360}, 100%, 70%)`);
        rainbowGrad.addColorStop(1, `hsl(${(frame + 60) % 360}, 100%, 50%)`);
        ctx.fillStyle = rainbowGrad;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsl(${frame % 360}, 100%, 50%)`;
        break;
        
      default:
        // Beautiful default ball with 3D effect
        const defaultGrad = ctx.createRadialGradient(
          ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0,
          ball.x, ball.y, ball.radius
        );
        defaultGrad.addColorStop(0, isDark ? '#ffffff' : '#ffffff');
        defaultGrad.addColorStop(0.4, ballColor);
        defaultGrad.addColorStop(1, isDark ? 'hsl(240, 20%, 30%)' : 'hsl(220, 20%, 60%)');
        ctx.fillStyle = defaultGrad;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ballColor;
    }
    
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();
    
    // Add highlight
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
  };

  const drawPaddle = (ctx: CanvasRenderingContext2D, paddle: any, frame: number) => {
    const paddleColor = getItemColor('paddle', frame);
    const paddleItem = equippedItems?.paddle;
    const effect = paddleItem?.properties?.effect;
    const isDark = theme === 'dark';
    
    // Draw paddle shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(paddle.x + 3, paddle.y + 3, paddle.width, paddle.height);
    
    // Draw paddle glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddleColor;
    
    // Create 3D paddle with gradient
    const paddleGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    paddleGrad.addColorStop(0, isDark ? '#ffffff' : '#ffffff');
    paddleGrad.addColorStop(0.2, paddleColor);
    paddleGrad.addColorStop(0.8, paddleColor);
    paddleGrad.addColorStop(1, isDark ? 'hsl(240, 20%, 20%)' : 'hsl(220, 20%, 40%)');
    
    if (effect === 'glow') {
      ctx.shadowBlur = 30;
      ctx.shadowColor = paddleColor;
    } else if (effect === 'sparkle') {
      ctx.shadowBlur = 15;
      ctx.shadowColor = paddleColor;
      for (let i = 0; i < 5; i++) {
        const sparkleX = paddle.x + Math.random() * paddle.width;
        const sparkleY = paddle.y + Math.random() * paddle.height;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.random() * 0.6 + 0.3;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    
    // Draw rounded paddle
    const radius = paddle.height / 2;
    ctx.beginPath();
    ctx.moveTo(paddle.x + radius, paddle.y);
    ctx.lineTo(paddle.x + paddle.width - radius, paddle.y);
    ctx.arc(paddle.x + paddle.width - radius, paddle.y + radius, radius, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(paddle.x + radius, paddle.y + paddle.height);
    ctx.arc(paddle.x + radius, paddle.y + radius, radius, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fillStyle = paddleGrad;
    ctx.fill();
    
    // Add highlight
    ctx.beginPath();
    ctx.moveTo(paddle.x + radius, paddle.y + 2);
    ctx.lineTo(paddle.x + paddle.width - radius, paddle.y + 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2, paddle.width / 2 + 10, 0, Math.PI * 2);
      ctx.stroke();
      
      // Shield pulse effect
      const pulseSize = 5 + Math.sin(frame * 0.1) * 3;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2, paddle.width / 2 + 10 + pulseSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  const drawBricks = (ctx: CanvasRenderingContext2D, bricks: Brick[], frame: number) => {
    const brickColor = getItemColor('brick', frame);
    const brickItem = equippedItems?.brick;
    const brickEffect = brickItem?.properties?.effect;
    const isDark = theme === 'dark';
    
    bricks.forEach((brick, index) => {
      if (!brick.active) return;
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
      // Calculate row-based color variation for visual appeal
      const row = Math.floor(index / 8);
      const hueShift = row * 15;
      
      // Draw brick shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width, brick.height);
      
      switch (brickEffect) {
        case 'glow':
          ctx.shadowBlur = 15;
          ctx.shadowColor = brickColor;
          break;
          
        case 'dissolve':
          ctx.globalAlpha = 0.7 + Math.sin(frame * 0.1 + brick.x * 0.1) * 0.3;
          break;
          
        case 'explode':
        case 'explosion':
          const pulseSize = Math.sin(frame * 0.15 + index * 0.1) * 1.5;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#ef4444';
          brick.width += pulseSize;
          brick.height += pulseSize;
          break;
      }
      
      // Create 3D brick gradient
      const brickGrad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
      const baseHue = brickColor.startsWith('hsl') ? brickColor : null;
      
      if (baseHue) {
        brickGrad.addColorStop(0, `hsl(${(frame + hueShift) % 360}, 70%, 65%)`);
        brickGrad.addColorStop(0.5, `hsl(${(frame + hueShift) % 360}, 70%, 50%)`);
        brickGrad.addColorStop(1, `hsl(${(frame + hueShift) % 360}, 70%, 35%)`);
      } else {
        brickGrad.addColorStop(0, isDark ? lightenColor(brickColor, 30) : lightenColor(brickColor, 20));
        brickGrad.addColorStop(0.5, brickColor);
        brickGrad.addColorStop(1, isDark ? darkenColor(brickColor, 30) : darkenColor(brickColor, 20));
      }
      
      ctx.fillStyle = brickGrad;
      
      // Draw rounded brick
      const radius = 3;
      ctx.beginPath();
      ctx.moveTo(brick.x + radius, brick.y);
      ctx.lineTo(brick.x + brick.width - radius, brick.y);
      ctx.quadraticCurveTo(brick.x + brick.width, brick.y, brick.x + brick.width, brick.y + radius);
      ctx.lineTo(brick.x + brick.width, brick.y + brick.height - radius);
      ctx.quadraticCurveTo(brick.x + brick.width, brick.y + brick.height, brick.x + brick.width - radius, brick.y + brick.height);
      ctx.lineTo(brick.x + radius, brick.y + brick.height);
      ctx.quadraticCurveTo(brick.x, brick.y + brick.height, brick.x, brick.y + brick.height - radius);
      ctx.lineTo(brick.x, brick.y + radius);
      ctx.quadraticCurveTo(brick.x, brick.y, brick.x + radius, brick.y);
      ctx.closePath();
      ctx.fill();
      
      // Add highlight on top
      ctx.beginPath();
      ctx.moveTo(brick.x + radius, brick.y + 2);
      ctx.lineTo(brick.x + brick.width - radius, brick.y + 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add particles effect
      if (brickEffect === 'particles') {
        for (let i = 0; i < 3; i++) {
          const offsetX = Math.sin(frame * 0.08 + brick.x + i) * 6;
          const offsetY = Math.cos(frame * 0.08 + brick.y + i) * 6;
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(brick.x + brick.width / 2 + offsetX, brick.y + brick.height / 2 + offsetY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Shatter effect cracks
      if (brickEffect === 'shatter') {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(brick.x + brick.width * 0.3, brick.y);
        ctx.lineTo(brick.x + brick.width * 0.5, brick.y + brick.height);
        ctx.moveTo(brick.x + brick.width * 0.7, brick.y);
        ctx.lineTo(brick.x + brick.width * 0.4, brick.y + brick.height);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    });
  };
  
  // Helper functions for color manipulation
  const lightenColor = (color: string, percent: number): string => {
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.min(255, ((num >> 16) & 255) + percent);
      const g = Math.min(255, ((num >> 8) & 255) + percent);
      const b = Math.min(255, (num & 255) + percent);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  };
  
  const darkenColor = (color: string, percent: number): string => {
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.max(0, ((num >> 16) & 255) - percent);
      const g = Math.max(0, ((num >> 8) & 255) - percent);
      const b = Math.max(0, (num & 255) - percent);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
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
      particle.vy += 0.1;
      particle.life -= 1;
    });
    ctx.globalAlpha = 1;
  };

  const drawRarityParticles = (ctx: CanvasRenderingContext2D, particles: RarityParticle[], frame: number) => {
    particles.forEach((particle, index) => {
      if (particle.life <= 0) {
        particles.splice(index, 1);
        return;
      }
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      
      if (particle.hue !== undefined) {
        ctx.fillStyle = `hsla(${(particle.hue + frame * 5) % 360}, 80%, 60%, ${particle.life / particle.maxLife})`;
      } else {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / particle.maxLife;
      }
      
      ctx.fill();
      ctx.closePath();
      
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 1;
    });
    ctx.globalAlpha = 1;
  };

  const drawLives = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, currentLives: number) => {
    const heartSize = 20;
    const spacing = 5;
    const startX = canvas.width - (heartSize + spacing) * 3;
    const startY = 15;
    
    for (let i = 0; i < 3; i++) {
      const x = startX + i * (heartSize + spacing);
      ctx.fillStyle = i < currentLives ? '#ef4444' : 'rgba(239, 68, 68, 0.2)';
      
      // Draw heart shape
      ctx.beginPath();
      ctx.moveTo(x + heartSize / 2, startY + heartSize * 0.3);
      ctx.bezierCurveTo(
        x + heartSize / 2, startY,
        x, startY,
        x, startY + heartSize * 0.3
      );
      ctx.bezierCurveTo(
        x, startY + heartSize * 0.6,
        x + heartSize / 2, startY + heartSize * 0.8,
        x + heartSize / 2, startY + heartSize
      );
      ctx.bezierCurveTo(
        x + heartSize / 2, startY + heartSize * 0.8,
        x + heartSize, startY + heartSize * 0.6,
        x + heartSize, startY + heartSize * 0.3
      );
      ctx.bezierCurveTo(
        x + heartSize, startY,
        x + heartSize / 2, startY,
        x + heartSize / 2, startY + heartSize * 0.3
      );
      ctx.fill();
    }
  };

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { ball, paddle, bricks, coins, powerUps, balls, particles, rarityParticles, ballTrail, frame } = gameStateRef.current;
    
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);
    
    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

    drawBackground(ctx, canvas, frame);
    drawAura(ctx, paddle, frame);
    drawTrail(ctx, ballTrail, ball, frame);
    drawRarityEffects(ctx, ball, paddle, frame);
    drawBall(ctx, ball, frame);
    
    balls.forEach(extraBall => drawBall(ctx, extraBall, frame));
    
    drawPaddle(ctx, paddle, frame);
    
    if (opponentPaddleX !== undefined && opponentPaddleX !== null) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(opponentPaddleX, paddle.y + 30, paddle.width, paddle.height);
    }
    
    drawBricks(ctx, bricks, frame);
    drawParticles(ctx, particles);
    drawRarityParticles(ctx, rarityParticles, frame);

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
    
    drawLives(ctx, canvas, gameStateRef.current.lives);
    
    ctx.restore();
  }, [theme, equippedItems, screenShake, opponentPaddleX, getItemRarity]);

  const updateGame = useCallback(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    gameStateRef.current.frame++;
    const { ball, paddle, bricks, coins, powerUps, balls, ballTrail, frame } = gameStateRef.current;
    const explosionItem = equippedItems?.explosion;

    ball.x += ball.dx;
    ball.y += ball.dy;

    onBallMove?.(ball.x, ball.y);

    const trailItem = equippedItems?.trail;
    const ballItem = equippedItems?.ball;
    if (ballItem || trailItem) {
      const trailLength = trailItem?.properties?.length || 10;
      ballTrail.push({ x: ball.x, y: ball.y, alpha: 0.8 });
      if (ballTrail.length > trailLength) {
        ballTrail.shift();
      }
    }

    // Create rarity particles periodically
    if (frame % 10 === 0) {
      const ballRarity = getItemRarity('ball');
      if (ballRarity !== 'common') {
        createRarityParticles(ball.x, ball.y, ballRarity);
      }
    }

    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
      ball.dx = -ball.dx;
      soundRef.current?.playSound?.('ballHit');
    }
    if (ball.y + ball.dy < ball.radius) {
      ball.dy = -ball.dy;
      soundRef.current?.playSound?.('ballHit');
    }

    if (
      ball.y + ball.dy > paddle.y - ball.radius &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width
    ) {
      ball.dy = -ball.dy;
      soundRef.current?.playSound?.('paddle');
    }

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
        gameStateRef.current.lives--;
        setLives(gameStateRef.current.lives);
        soundRef.current?.playSound?.('loseLife');
        
        if (gameStateRef.current.lives <= 0) {
          setIsPlaying(false);
          soundRef.current?.playSound?.('gameOver');
          onGameOver?.(gameStateRef.current.score, gameStateRef.current.coinsCollected);
          return;
        } else {
          // Reset ball position with proper velocity
          const resetSpeed = Math.max(diffSettings.ballSpeed, 3);
          ball.x = 300;
          ball.y = 450;
          ball.dx = resetSpeed * (Math.random() > 0.5 ? 1 : -1);
          ball.dy = -resetSpeed;
        }
      }
    }

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
          soundRef.current?.playSound?.('brickBreak');

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

          if (brick.hasCoin) {
            coins.push({
              x: brick.x + brick.width / 2,
              y: brick.y + brick.height / 2,
              dy: 2,
              value: diffSettings.coinValue,
              collected: false,
            });
          }

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
          soundRef.current?.playSound?.('coin');
        }

        if (coin.y > canvas.height) {
          coin.collected = true;
        }
      }
    });

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
          soundRef.current?.playSound?.('powerUp');
        }

        if (powerUp.y > canvas.height) {
          powerUp.collected = true;
        }
      }
    });

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
  }, [isPlaying, equippedItems, enablePowerUps, shieldActive, diffSettings, onScoreUpdate, onGameOver, onCoinCollect, onBallMove, drawGame, getItemRarity, createRarityParticles]);

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

    // Improved touch controls - hold and swipe with desktop-like speed
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setTouchStartX(touch.clientX - rect.left);
      setTouchHolding(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const { paddle } = gameStateRef.current;
      
      // Use direct position control like desktop hover - matches desktop speed
      const targetX = Math.max(0, Math.min(x - paddle.width / 2, canvas.width - paddle.width));
      paddle.x = targetX;
      
      onPaddleMove?.(paddle.x);
      if (!isPlaying) drawGame();
    };

    const handleTouchEnd = () => {
      setTouchHolding(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
      canvas.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
      if (canvas) {
        canvas.removeEventListener("touchstart", handleTouchStart);
        canvas.removeEventListener("touchmove", handleTouchMove);
        canvas.removeEventListener("touchend", handleTouchEnd);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [settings, isPlaying, initGame, drawGame, onPaddleMove]);

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
            className="w-full h-full bg-background rounded-lg transition-all duration-300"
            style={{ touchAction: "none" }}
          />
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg transition-all duration-200 hover:bg-muted/80">
          <p className="text-sm text-center text-muted-foreground font-medium">
            {settings.desktopControl === 'arrows' && 'Use Arrow Keys (←→)'}
            {settings.desktopControl === 'keys' && 'Use A/D Keys or Arrows'}
            {settings.desktopControl === 'hover' && 'Move mouse to control paddle'}
            {' • '}
            Difficulty: <span className="capitalize font-bold">{currentDifficulty}</span>
            {' • '}
            Lives: {lives}/3
          </p>
        </div>
      </Card>
    </div>
  );
};