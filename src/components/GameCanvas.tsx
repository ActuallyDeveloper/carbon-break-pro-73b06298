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
  maxLife: number;
  color: string;
  size: number;
  type: 'explosion' | 'coin' | 'powerup' | 'rarity' | 'trail';
  hue?: number;
}

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number; radius: number };
  paddle: { x: number; y: number; width: number; height: number; speed: number };
  bricks: Brick[];
  coins: Coin[];
  powerUps: PowerUp[];
  extraBalls: Array<{ x: number; y: number; dx: number; dy: number; radius: number }>;
  particles: Particle[];
  ballTrail: Array<{ x: number; y: number; alpha: number; size: number }>;
  score: number;
  coinsCollected: number;
  lives: number;
  frame: number;
  gameActive: boolean;
  combo: number;
  lastBrickTime: number;
}

// Constants for consistent physics
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const PADDLE_Y = 550;
const BALL_START_Y = 480;
const MIN_BALL_SPEED = 4;
const MAX_BALL_SPEED = 12;

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
  const [activePowerUps, setActivePowerUps] = useState<Map<PowerUpType, number>>(new Map());
  const [shieldActive, setShieldActive] = useState(false);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0, duration: 0 });
  const [screenFlash, setScreenFlash] = useState<{ color: string; alpha: number } | null>(null);
  
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const soundRef = useRef(getGlobalSoundInstance());
  
  const currentDifficulty = propDifficulty || settings.difficulty;
  const diffSettings = getDifficultySettings(currentDifficulty);

  const gameStateRef = useRef<GameState>({
    ball: { x: CANVAS_WIDTH / 2, y: BALL_START_Y, dx: 0, dy: 0, radius: 10 },
    paddle: { x: CANVAS_WIDTH / 2 - 50, y: PADDLE_Y, width: 100, height: 14, speed: 20 },
    bricks: [],
    coins: [],
    powerUps: [],
    extraBalls: [],
    particles: [],
    ballTrail: [],
    score: 0,
    coinsCollected: 0,
    lives: 3,
    frame: 0,
    gameActive: false,
    combo: 0,
    lastBrickTime: 0,
  });

  // Utility functions
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  const lightenColor = (color: string, amount: number): string => {
    const { r, g, b } = hexToRgb(color);
    return `rgb(${clamp(r + amount, 0, 255)}, ${clamp(g + amount, 0, 255)}, ${clamp(b + amount, 0, 255)})`;
  };

  const darkenColor = (color: string, amount: number): string => {
    const { r, g, b } = hexToRgb(color);
    return `rgb(${clamp(r - amount, 0, 255)}, ${clamp(g - amount, 0, 255)}, ${clamp(b - amount, 0, 255)})`;
  };

  // Get item properties
  const getItemRarity = useCallback((itemType: string): string => {
    const item = equippedItems?.[itemType as keyof EquippedItems];
    return (item?.properties as any)?.rarity || 'common';
  }, [equippedItems]);

  const getItemColor = useCallback((itemType: 'paddle' | 'ball' | 'brick', frame: number): string => {
    const isDark = theme === 'dark';
    const defaultColors = { paddle: '#3b82f6', ball: '#ffffff', brick: '#ef4444' };
    
    const colorItem = equippedItems?.color;
    const specificItem = equippedItems?.[itemType];
    
    if (colorItem?.properties) {
      if (itemType === 'ball' && colorItem.properties.secondary) return colorItem.properties.secondary;
      if ((itemType === 'paddle' || itemType === 'brick') && colorItem.properties.primary) return colorItem.properties.primary;
    }
    
    if (!specificItem?.properties?.color) return isDark ? defaultColors[itemType] : defaultColors[itemType];
    
    const color = specificItem.properties.color;
    if (color === 'rainbow') return `hsl(${frame % 360}, 70%, 50%)`;
    
    const colorMap: Record<string, string> = {
      red: "#ef4444", blue: "#3b82f6", purple: "#a855f7", neon: "#10b981",
      yellow: "#eab308", green: "#22c55e", orange: "#f97316", pink: "#ec4899",
      silver: "#94a3b8", gold: "#eab308", white: "#ffffff", cyan: "#06b6d4",
    };
    
    return colorMap[color] || color || defaultColors[itemType];
  }, [theme, equippedItems]);

  // Particle system
  const createParticles = useCallback((x: number, y: number, count: number, color: string, type: Particle['type'], options?: Partial<Particle>) => {
    const state = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        color,
        size: 2 + Math.random() * 3,
        type,
        ...options,
      });
    }
  }, []);

  const triggerScreenFlash = useCallback((color: string, alpha = 0.3) => {
    setScreenFlash({ color, alpha });
    setTimeout(() => setScreenFlash(null), 120);
  }, []);

  const triggerScreenShake = useCallback((intensity: number) => {
    setScreenShake({
      x: (Math.random() - 0.5) * intensity * 4,
      y: (Math.random() - 0.5) * intensity * 4,
      duration: 100,
    });
    setTimeout(() => setScreenShake({ x: 0, y: 0, duration: 0 }), 100);
  }, []);

  // Power-up system
  const activatePowerUp = useCallback((type: PowerUpType) => {
    const state = gameStateRef.current;
    const { ball, paddle, extraBalls } = state;

    createParticles(paddle.x + paddle.width / 2, paddle.y, 20, 
      type === 'multiBall' ? '#ef4444' : type === 'paddleSize' ? '#3b82f6' : type === 'slowBall' ? '#10b981' : '#8b5cf6',
      'powerup'
    );
    triggerScreenFlash(type === 'multiBall' ? '#ef4444' : type === 'paddleSize' ? '#3b82f6' : '#10b981', 0.25);

    const duration = type === 'shield' ? 30000 : 10000;
    
    switch (type) {
      case 'multiBall':
        extraBalls.push(
          { x: ball.x, y: ball.y, dx: ball.dx * 1.3, dy: ball.dy * 0.9, radius: ball.radius },
          { x: ball.x, y: ball.y, dx: ball.dx * 0.7, dy: ball.dy * 1.1, radius: ball.radius }
        );
        break;
      case 'paddleSize':
        paddle.width = Math.min(paddle.width + 40, 200);
        setTimeout(() => { paddle.width = 100; }, duration);
        break;
      case 'slowBall':
        const speedMult = 0.6;
        ball.dx *= speedMult;
        ball.dy *= speedMult;
        extraBalls.forEach(b => { b.dx *= speedMult; b.dy *= speedMult; });
        setTimeout(() => {
          ball.dx /= speedMult;
          ball.dy /= speedMult;
          extraBalls.forEach(b => { b.dx /= speedMult; b.dy /= speedMult; });
        }, duration);
        break;
      case 'shield':
        setShieldActive(true);
        setTimeout(() => setShieldActive(false), duration);
        break;
    }

    setActivePowerUps(prev => new Map(prev).set(type, Date.now() + duration));
    setTimeout(() => {
      setActivePowerUps(prev => {
        const next = new Map(prev);
        next.delete(type);
        return next;
      });
    }, duration);
  }, [createParticles, triggerScreenFlash]);

  // Initialize game
  const initGame = useCallback(() => {
    const bricks: Brick[] = [];
    const cols = 8, rows = 5;
    const brickW = 65, brickH = 20, padding = 8;
    const offsetX = 12, offsetY = 60;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        bricks.push({
          x: c * (brickW + padding) + offsetX,
          y: r * (brickH + padding) + offsetY,
          width: brickW,
          height: brickH,
          active: true,
          hasCoin: Math.random() < diffSettings.coinDropChance,
          type: Math.random() < 0.1 ? 'strong' : 'normal',
          hits: Math.random() < 0.1 ? 2 : 1,
        });
      }
    }

    // Calculate initial velocity - always moving upward at an angle
    const speed = clamp(diffSettings.ballSpeed, MIN_BALL_SPEED, MAX_BALL_SPEED);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3; // -60 to -120 degrees
    
    gameStateRef.current = {
      ball: { 
        x: CANVAS_WIDTH / 2, 
        y: BALL_START_Y, 
        dx: Math.cos(angle) * speed, 
        dy: Math.sin(angle) * speed, 
        radius: 10 
      },
      paddle: { 
        x: CANVAS_WIDTH / 2 - 50, 
        y: PADDLE_Y, 
        width: 100, 
        height: 14, 
        speed: clamp(diffSettings.paddleSpeed, 15, 30) 
      },
      bricks,
      coins: [],
      powerUps: [],
      extraBalls: [],
      particles: [],
      ballTrail: [],
      score: 0,
      coinsCollected: 0,
      lives: 3,
      frame: 0,
      gameActive: true,
      combo: 0,
      lastBrickTime: 0,
    };

    setScore(0);
    setCoinsCollected(0);
    setLives(3);
    setActivePowerUps(new Map());
    setShieldActive(false);
    setScreenShake({ x: 0, y: 0, duration: 0 });
    setScreenFlash(null);
  }, [diffSettings]);

  // Drawing functions
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, frame: number) => {
    const isDark = theme === 'dark';
    const bgItem = equippedItems?.background;

    // Base gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    if (isDark) {
      grad.addColorStop(0, 'hsl(240, 15%, 8%)');
      grad.addColorStop(0.5, 'hsl(240, 18%, 5%)');
      grad.addColorStop(1, 'hsl(240, 20%, 3%)');
    } else {
      grad.addColorStop(0, 'hsl(220, 30%, 97%)');
      grad.addColorStop(0.5, 'hsl(220, 25%, 94%)');
      grad.addColorStop(1, 'hsl(220, 20%, 91%)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    if (!bgItem?.properties?.theme) return;

    const bgTheme = bgItem.properties.theme;
    ctx.save();

    switch (bgTheme) {
      case 'space':
        for (let i = 0; i < 60; i++) {
          const x = ((frame * 0.3 + i * 47) % CANVAS_WIDTH);
          const y = ((i * 37 + Math.sin(i) * 15) % CANVAS_HEIGHT);
          const size = 1 + (i % 3);
          const twinkle = 0.3 + Math.sin(frame * 0.05 + i * 0.3) * 0.4;
          ctx.fillStyle = isDark ? `rgba(255,255,255,${twinkle})` : `rgba(0,0,0,${twinkle * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'neon':
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 12; i++) {
          ctx.strokeStyle = i % 2 === 0 ? '#10b981' : '#3b82f6';
          ctx.lineWidth = 2;
          const offset = (frame * 0.5) % 50;
          ctx.beginPath();
          ctx.moveTo(0, i * 50 + offset);
          ctx.lineTo(CANVAS_WIDTH, i * 50 + offset);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;

      case 'matrix':
        ctx.fillStyle = '#10b981';
        ctx.font = '12px monospace';
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 15; i++) {
          const x = i * 40;
          const y = ((frame * (1 + i % 3)) % (CANVAS_HEIGHT + 100)) - 50;
          for (let j = 0; j < 6; j++) {
            ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, y + j * 16);
          }
        }
        ctx.globalAlpha = 1;
        break;

      case 'gradient':
        const gGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gGrad.addColorStop(0, bgItem.properties.color1 || 'hsl(240,40%,20%)');
        gGrad.addColorStop(0.5, bgItem.properties.color2 || 'hsl(280,40%,15%)');
        gGrad.addColorStop(1, bgItem.properties.color1 || 'hsl(240,40%,20%)');
        ctx.fillStyle = gGrad;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        break;
    }
    ctx.restore();
  }, [theme, equippedItems]);

  const drawBall = useCallback((ctx: CanvasRenderingContext2D, ball: GameState['ball'], frame: number, isExtra = false) => {
    const color = getItemColor('ball', frame);
    const effect = equippedItems?.ball?.properties?.effect;
    const rarity = getItemRarity('ball');

    ctx.save();

    // Outer glow
    const glowGrad = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.5, ball.x, ball.y, ball.radius + 8);
    glowGrad.addColorStop(0, 'transparent');
    glowGrad.addColorStop(0.6, `${color}40`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 8, 0, Math.PI * 2);
    ctx.fill();

    // Rarity effects
    if (rarity === 'legendary') {
      for (let i = 0; i < 5; i++) {
        const hue = (frame * 5 + i * 40) % 360;
        ctx.beginPath();
        ctx.arc(ball.x - ball.dx * i * 0.3, ball.y - ball.dy * i * 0.3, ball.radius * (1 - i * 0.12), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.5 - i * 0.08})`;
        ctx.fill();
      }
    } else if (rarity === 'epic') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#a855f7';
    }

    // Main ball
    const ballGrad = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0,
      ball.x, ball.y, ball.radius
    );

    switch (effect) {
      case 'fire':
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.2, '#ffff00');
        ballGrad.addColorStop(0.5, '#ff6600');
        ballGrad.addColorStop(1, '#cc0000');
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff4400';
        break;
      case 'ice':
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.3, '#a5d8ff');
        ballGrad.addColorStop(1, '#1d4ed8');
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#3b82f6';
        break;
      case 'lightning':
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.5, '#fef08a');
        ballGrad.addColorStop(1, '#ca8a04');
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#eab308';
        break;
      case 'rainbow':
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.4, `hsl(${frame % 360}, 100%, 65%)`);
        ballGrad.addColorStop(1, `hsl(${(frame + 60) % 360}, 100%, 45%)`);
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsl(${frame % 360}, 100%, 50%)`;
        break;
      default:
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.4, color);
        ballGrad.addColorStop(1, darkenColor(color, 60));
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
    }

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.35, ball.radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();

    ctx.restore();
  }, [getItemColor, getItemRarity, equippedItems]);

  const drawPaddle = useCallback((ctx: CanvasRenderingContext2D, paddle: GameState['paddle'], frame: number) => {
    const color = getItemColor('paddle', frame);
    const effect = equippedItems?.paddle?.properties?.effect;
    const rarity = getItemRarity('paddle');

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.roundRect(paddle.x + 3, paddle.y + 3, paddle.width, paddle.height, paddle.height / 2);
    ctx.fill();

    // Rarity glow
    if (rarity === 'legendary') {
      const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
      for (let i = 0; i <= 10; i++) {
        const hue = (frame * 3 + i * 36) % 360;
        gradient.addColorStop(i / 10, `hsla(${hue}, 70%, 50%, 0.4)`);
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(paddle.x - 4, paddle.y - 4, paddle.width + 8, paddle.height + 8, paddle.height / 2 + 4);
      ctx.fill();
    } else if (rarity === 'epic') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#a855f7';
    }

    // Main paddle
    const paddleGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    paddleGrad.addColorStop(0, lightenColor(color, 40));
    paddleGrad.addColorStop(0.3, color);
    paddleGrad.addColorStop(0.7, color);
    paddleGrad.addColorStop(1, darkenColor(color, 40));

    ctx.fillStyle = paddleGrad;
    ctx.shadowBlur = effect === 'glow' ? 30 : 15;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, paddle.height / 2);
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.moveTo(paddle.x + paddle.height / 2, paddle.y + 2);
    ctx.lineTo(paddle.x + paddle.width - paddle.height / 2, paddle.y + 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Shield effect
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
      ctx.lineWidth = 3;
      const shieldRadius = paddle.width / 2 + 15 + Math.sin(frame * 0.1) * 3;
      ctx.beginPath();
      ctx.arc(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Sparkle effect
    if (effect === 'sparkle') {
      for (let i = 0; i < 4; i++) {
        const sx = paddle.x + Math.random() * paddle.width;
        const sy = paddle.y + Math.random() * paddle.height;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [getItemColor, getItemRarity, equippedItems, shieldActive]);

  const drawBricks = useCallback((ctx: CanvasRenderingContext2D, bricks: Brick[], frame: number) => {
    const color = getItemColor('brick', frame);
    const effect = equippedItems?.brick?.properties?.effect;

    bricks.forEach((brick, idx) => {
      if (!brick.active) return;

      ctx.save();

      const row = Math.floor(idx / 8);
      const hueShift = row * 20;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.roundRect(brick.x + 2, brick.y + 2, brick.width, brick.height, 4);
      ctx.fill();

      // Effects
      if (effect === 'glow') {
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
      } else if (effect === 'dissolve') {
        ctx.globalAlpha = 0.7 + Math.sin(frame * 0.1 + brick.x * 0.05) * 0.25;
      }

      // Gradient
      const brickGrad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
      const useRainbow = color.startsWith('hsl');
      
      if (useRainbow) {
        brickGrad.addColorStop(0, `hsl(${(frame + hueShift) % 360}, 70%, 65%)`);
        brickGrad.addColorStop(0.5, `hsl(${(frame + hueShift) % 360}, 70%, 50%)`);
        brickGrad.addColorStop(1, `hsl(${(frame + hueShift) % 360}, 70%, 35%)`);
      } else {
        brickGrad.addColorStop(0, lightenColor(color, 25));
        brickGrad.addColorStop(0.5, color);
        brickGrad.addColorStop(1, darkenColor(color, 30));
      }

      ctx.fillStyle = brickGrad;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
      ctx.fill();

      // Strong brick indicator
      if (brick.type === 'strong' && (brick.hits || 1) > 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Highlight
      ctx.beginPath();
      ctx.moveTo(brick.x + 4, brick.y + 2);
      ctx.lineTo(brick.x + brick.width - 4, brick.y + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Coin indicator
      if (brick.hasCoin) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(brick.x + brick.width - 8, brick.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }, [getItemColor, equippedItems]);

  const drawTrail = useCallback((ctx: CanvasRenderingContext2D, trail: GameState['ballTrail'], ball: GameState['ball'], frame: number) => {
    const trailItem = equippedItems?.trail;
    if (!trailItem && trail.length === 0) return;

    const effect = trailItem?.properties?.effect || 'basic';
    const baseColor = trailItem?.properties?.color || getItemColor('ball', frame);
    const { r, g, b } = hexToRgb(baseColor);

    trail.forEach((pos, i) => {
      const alpha = pos.alpha * (i / trail.length);
      const size = pos.size * (0.4 + (i / trail.length) * 0.6);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);

      switch (effect) {
        case 'fire':
          const fireGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size);
          fireGrad.addColorStop(0, `rgba(255,165,0,${alpha})`);
          fireGrad.addColorStop(1, `rgba(255,0,0,${alpha * 0.4})`);
          ctx.fillStyle = fireGrad;
          break;
        case 'ice':
          ctx.fillStyle = `rgba(59,130,246,${alpha})`;
          break;
        case 'rainbow':
          const hue = (frame + i * 15) % 360;
          ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;
          break;
        default:
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      }
      ctx.fill();
    });
  }, [equippedItems, getItemColor]);

  const drawAura = useCallback((ctx: CanvasRenderingContext2D, paddle: GameState['paddle'], frame: number) => {
    const auraItem = equippedItems?.aura;
    if (!auraItem) return;

    const type = auraItem.properties?.type || 'energy';
    const colors: Record<string, string> = {
      fire: '#ef4444', ice: '#3b82f6', lightning: '#eab308',
      shadow: '#64748b', energy: '#10b981', flower: '#ec4899',
    };
    const color = colors[type] || '#a855f7';
    const cx = paddle.x + paddle.width / 2;
    const cy = paddle.y + paddle.height / 2;

    ctx.save();
    ctx.globalAlpha = 0.3;

    for (let i = 0; i < 3; i++) {
      const radius = 40 + Math.sin(frame * 0.08 + i) * 8 - i * 8;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }, [equippedItems]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[], frame: number) => {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;

      if (p.hue !== undefined) {
        ctx.fillStyle = `hsl(${(p.hue + frame) % 360}, 80%, 60%)`;
      } else {
        ctx.fillStyle = p.color;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= 1;
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawLives = useCallback((ctx: CanvasRenderingContext2D, currentLives: number) => {
    const size = 16;
    const spacing = 6;
    const startX = CANVAS_WIDTH - (3 * (size + spacing)) - 10;
    const startY = 12;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (size + spacing);
      ctx.fillStyle = i < currentLives ? '#ef4444' : 'rgba(239,68,68,0.2)';

      ctx.beginPath();
      ctx.moveTo(x + size / 2, startY + size * 0.3);
      ctx.bezierCurveTo(x + size / 2, startY, x, startY, x, startY + size * 0.3);
      ctx.bezierCurveTo(x, startY + size * 0.6, x + size / 2, startY + size * 0.8, x + size / 2, startY + size);
      ctx.bezierCurveTo(x + size / 2, startY + size * 0.8, x + size, startY + size * 0.6, x + size, startY + size * 0.3);
      ctx.bezierCurveTo(x + size, startY, x + size / 2, startY, x + size / 2, startY + size * 0.3);
      ctx.fill();
    }
  }, []);

  const drawCoinsAndPowerUps = useCallback((ctx: CanvasRenderingContext2D, coins: Coin[], powerUps: PowerUp[], frame: number) => {
    // Coins
    coins.forEach(coin => {
      if (coin.collected) return;
      
      const glow = ctx.createRadialGradient(coin.x, coin.y, 0, coin.x, coin.y, 8);
      glow.addColorStop(0, '#ffd700');
      glow.addColorStop(0.7, '#ffb700');
      glow.addColorStop(1, 'transparent');
      
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath();
      ctx.arc(coin.x - 1, coin.y - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Power-ups
    const puColors: Record<PowerUpType, string> = {
      multiBall: '#ef4444', paddleSize: '#3b82f6', slowBall: '#10b981', shield: '#8b5cf6'
    };
    const puIcons: Record<PowerUpType, string> = {
      multiBall: '●●', paddleSize: '↔', slowBall: '◎', shield: '◇'
    };

    powerUps.forEach(pu => {
      if (pu.collected) return;

      const pulse = Math.sin(frame * 0.1) * 2;
      const radius = 10 + pulse;

      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = puColors[pu.type];

      ctx.fillStyle = puColors[pu.type];
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(puIcons[pu.type], pu.x, pu.y);

      ctx.restore();
    });
  }, []);

  // Main draw function
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;
    const { ball, paddle, bricks, coins, powerUps, extraBalls, particles, ballTrail, frame, lives: currentLives } = state;

    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);

    ctx.clearRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);

    drawBackground(ctx, frame);
    drawAura(ctx, paddle, frame);
    drawTrail(ctx, ballTrail, ball, frame);
    drawBall(ctx, ball, frame);
    extraBalls.forEach(eb => drawBall(ctx, eb, frame, true));
    drawPaddle(ctx, paddle, frame);
    
    if (opponentPaddleX !== undefined) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(opponentPaddleX, paddle.y + 25, paddle.width, paddle.height, paddle.height / 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    drawBricks(ctx, bricks, frame);
    drawCoinsAndPowerUps(ctx, coins, powerUps, frame);
    drawParticles(ctx, particles, frame);
    drawLives(ctx, currentLives);

    // Screen flash
    if (screenFlash) {
      ctx.fillStyle = screenFlash.color;
      ctx.globalAlpha = screenFlash.alpha;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [drawBackground, drawAura, drawTrail, drawBall, drawPaddle, drawBricks, drawCoinsAndPowerUps, drawParticles, drawLives, screenShake, screenFlash, opponentPaddleX]);

  // Game update loop
  const updateGame = useCallback((timestamp: number) => {
    if (!isPlaying) return;

    const deltaTime = timestamp - lastTimeRef.current;
    if (deltaTime < 16) {
      animationRef.current = requestAnimationFrame(updateGame);
      return;
    }
    lastTimeRef.current = timestamp;

    const state = gameStateRef.current;
    state.frame++;
    const { ball, paddle, bricks, coins, powerUps, extraBalls, ballTrail, frame } = state;

    // Update ball position
    ball.x += ball.dx;
    ball.y += ball.dy;
    onBallMove?.(ball.x, ball.y);

    // Update trail
    if (equippedItems?.trail || equippedItems?.ball) {
      const trailLength = equippedItems?.trail?.properties?.length || 12;
      ballTrail.push({ x: ball.x, y: ball.y, alpha: 0.8, size: ball.radius });
      while (ballTrail.length > trailLength) ballTrail.shift();
    }

    // Create rarity particles
    if (frame % 8 === 0) {
      const rarity = getItemRarity('ball');
      if (rarity === 'legendary' || rarity === 'epic') {
        createParticles(ball.x, ball.y, rarity === 'legendary' ? 2 : 1, 
          rarity === 'legendary' ? '#ffd700' : '#a855f7', 'rarity', 
          { hue: rarity === 'legendary' ? Math.random() * 360 : undefined }
        );
      }
    }

    // Wall collisions
    if (ball.x + ball.dx > CANVAS_WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
      ball.dx = -ball.dx;
      soundRef.current?.playSound?.('ballHit');
    }
    if (ball.y + ball.dy < ball.radius) {
      ball.dy = -ball.dy;
      soundRef.current?.playSound?.('ballHit');
    }

    // Paddle collision with improved physics
    if (ball.y + ball.dy > paddle.y - ball.radius && 
        ball.y < paddle.y + paddle.height &&
        ball.x > paddle.x - ball.radius && 
        ball.x < paddle.x + paddle.width + ball.radius) {
      
      // Calculate hit position for angle adjustment
      const hitPos = (ball.x - paddle.x) / paddle.width;
      const angle = (hitPos - 0.5) * Math.PI * 0.6; // -54° to +54°
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
      
      ball.dx = Math.sin(angle) * speed;
      ball.dy = -Math.abs(Math.cos(angle) * speed);
      ball.y = paddle.y - ball.radius;
      
      soundRef.current?.playSound?.('paddle');
    }

    // Ball falls below screen
    if (ball.y > CANVAS_HEIGHT + ball.radius) {
      if (shieldActive) {
        ball.y = paddle.y - ball.radius - 10;
        ball.dy = -Math.abs(ball.dy);
        setShieldActive(false);
      } else {
        state.lives--;
        setLives(state.lives);
        soundRef.current?.playSound?.('loseLife');
        state.combo = 0;

        if (state.lives <= 0) {
          setIsPlaying(false);
          soundRef.current?.playSound?.('gameOver');
          onGameOver?.(state.score, state.coinsCollected);
          return;
        }

        // Reset ball with proper velocity
        const speed = clamp(diffSettings.ballSpeed, MIN_BALL_SPEED, MAX_BALL_SPEED);
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
        ball.x = CANVAS_WIDTH / 2;
        ball.y = BALL_START_Y;
        ball.dx = Math.cos(angle) * speed;
        ball.dy = Math.sin(angle) * speed;
      }
    }

    // Brick collisions
    bricks.forEach(brick => {
      if (!brick.active) return;

      if (ball.x + ball.radius > brick.x && 
          ball.x - ball.radius < brick.x + brick.width &&
          ball.y + ball.radius > brick.y && 
          ball.y - ball.radius < brick.y + brick.height) {
        
        // Determine collision side
        const fromTop = ball.y - ball.radius < brick.y;
        const fromBottom = ball.y + ball.radius > brick.y + brick.height;
        
        if (fromTop || fromBottom) {
          ball.dy = -ball.dy;
        } else {
          ball.dx = -ball.dx;
        }

        if (brick.type === 'strong' && (brick.hits || 1) > 1) {
          brick.hits = (brick.hits || 2) - 1;
        } else {
          brick.active = false;
          
          // Scoring with combo
          const now = Date.now();
          if (now - state.lastBrickTime < 1000) {
            state.combo = Math.min(state.combo + 1, 10);
          } else {
            state.combo = 1;
          }
          state.lastBrickTime = now;
          
          const points = 10 * state.combo;
          state.score += points;
          setScore(state.score);
          onScoreUpdate?.(state.score);

          // Effects
          const explosionItem = equippedItems?.explosion;
          const expColor = explosionItem?.properties?.color || '#ef4444';
          createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, 15, expColor, 'explosion');
          triggerScreenShake(explosionItem ? 1.5 : 0.5);

          // Spawn coin
          if (brick.hasCoin) {
            coins.push({
              x: brick.x + brick.width / 2,
              y: brick.y + brick.height / 2,
              dy: 2,
              value: diffSettings.coinValue,
              collected: false,
            });
          }

          // Spawn power-up
          if (enablePowerUps && Math.random() < 0.12) {
            const types: PowerUpType[] = ['multiBall', 'paddleSize', 'slowBall', 'shield'];
            powerUps.push({
              x: brick.x + brick.width / 2,
              y: brick.y + brick.height / 2,
              dy: 1.5,
              type: types[Math.floor(Math.random() * types.length)],
              collected: false,
            });
          }
        }

        soundRef.current?.playSound?.('brickBreak');
      }
    });

    // Update coins
    coins.forEach(coin => {
      if (coin.collected) return;
      coin.y += coin.dy;

      if (coin.y + 6 > paddle.y && coin.y - 6 < paddle.y + paddle.height &&
          coin.x + 6 > paddle.x && coin.x - 6 < paddle.x + paddle.width) {
        coin.collected = true;
        state.coinsCollected += coin.value;
        setCoinsCollected(state.coinsCollected);
        onCoinCollect?.(coin.value);
        createParticles(coin.x, coin.y, 12, '#ffd700', 'coin');
        triggerScreenFlash('#ffd70040', 0.15);
        soundRef.current?.playSound?.('coin');
      }

      if (coin.y > CANVAS_HEIGHT) coin.collected = true;
    });

    // Update power-ups
    powerUps.forEach(pu => {
      if (pu.collected) return;
      pu.y += pu.dy;

      if (pu.y + 10 > paddle.y && pu.y - 10 < paddle.y + paddle.height &&
          pu.x + 10 > paddle.x && pu.x - 10 < paddle.x + paddle.width) {
        pu.collected = true;
        activatePowerUp(pu.type);
        soundRef.current?.playSound?.('powerUp');
      }

      if (pu.y > CANVAS_HEIGHT) pu.collected = true;
    });

    // Update extra balls
    for (let i = extraBalls.length - 1; i >= 0; i--) {
      const eb = extraBalls[i];
      eb.x += eb.dx;
      eb.y += eb.dy;

      if (eb.x + eb.dx > CANVAS_WIDTH - eb.radius || eb.x + eb.dx < eb.radius) eb.dx = -eb.dx;
      if (eb.y + eb.dy < eb.radius) eb.dy = -eb.dy;

      if (eb.y + eb.dy > paddle.y - eb.radius && eb.x > paddle.x && eb.x < paddle.x + paddle.width) {
        eb.dy = -eb.dy;
      }

      if (eb.y > CANVAS_HEIGHT) {
        extraBalls.splice(i, 1);
        continue;
      }

      // Extra ball brick collisions
      bricks.forEach(brick => {
        if (!brick.active) return;
        if (eb.x > brick.x && eb.x < brick.x + brick.width &&
            eb.y > brick.y && eb.y < brick.y + brick.height) {
          eb.dy = -eb.dy;
          brick.active = false;
          state.score += 10;
          setScore(state.score);
          onScoreUpdate?.(state.score);
        }
      });
    }

    // Check win condition
    if (bricks.every(b => !b.active)) {
      setIsPlaying(false);
      onGameOver?.(state.score, state.coinsCollected);
      return;
    }

    drawGame();
    animationRef.current = requestAnimationFrame(updateGame);
  }, [isPlaying, equippedItems, enablePowerUps, shieldActive, diffSettings, onScoreUpdate, onGameOver, onCoinCollect, onBallMove, drawGame, getItemRarity, createParticles, triggerScreenFlash, triggerScreenShake, activatePowerUp]);

  // Input handling
  useEffect(() => {
    initGame();
    drawGame();

    const handleKeyDown = (e: KeyboardEvent) => {
      const { paddle } = gameStateRef.current;
      
      if (settings.desktopControl === 'arrows' || settings.desktopControl === 'keys') {
        if ((e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') && paddle.x > 0) {
          paddle.x = Math.max(0, paddle.x - paddle.speed);
          onPaddleMove?.(paddle.x);
          if (!isPlaying) drawGame();
        } else if ((e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') && paddle.x < CANVAS_WIDTH - paddle.width) {
          paddle.x = Math.min(CANVAS_WIDTH - paddle.width, paddle.x + paddle.speed);
          onPaddleMove?.(paddle.x);
          if (!isPlaying) drawGame();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (settings.desktopControl !== 'hover') return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      const { paddle } = gameStateRef.current;
      
      paddle.x = clamp(x - paddle.width / 2, 0, CANVAS_WIDTH - paddle.width);
      onPaddleMove?.(paddle.x);
      if (!isPlaying) drawGame();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      const { paddle } = gameStateRef.current;
      
      paddle.x = clamp(x - paddle.width / 2, 0, CANVAS_WIDTH - paddle.width);
      onPaddleMove?.(paddle.x);
      if (!isPlaying) drawGame();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      if (canvas) {
        canvas.removeEventListener('touchmove', handleTouchMove);
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [settings, isPlaying, initGame, drawGame, onPaddleMove]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(updateGame);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, updateGame]);

  const handleReset = () => {
    setIsPlaying(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    initGame();
    drawGame();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8 transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-foreground" />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Score</p>
                <p className="text-3xl font-bold tracking-tight">{score}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Coins</p>
                <p className="text-3xl font-bold tracking-tight text-yellow-500">{coinsCollected}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <Heart key={i} className={`h-6 w-6 transition-all ${i < lives ? 'text-red-500 fill-red-500' : 'text-red-500/30'}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="lg" onClick={() => setIsPlaying(!isPlaying)} className="gap-2">
              {isPlaying ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Play</>}
            </Button>
            <Button variant="outline" size="lg" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="rounded-lg max-w-full touch-none"
            style={{ background: theme === 'dark' ? 'hsl(240, 15%, 6%)' : 'hsl(220, 25%, 95%)' }}
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {settings.desktopControl === 'hover' ? 'Move mouse to control paddle' : 'Use arrow keys or A/D to move paddle'} • On mobile, touch and drag
        </p>
      </Card>
    </div>
  );
};
