import { useRef, useCallback } from 'react';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'explosion' | 'coin' | 'powerup' | 'sparkle' | 'trail';
  hue?: number;
}

export interface ScreenFlash {
  color: string;
  alpha: number;
  duration: number;
  startTime: number;
}

export const useParticleEffects = () => {
  const particlesRef = useRef<Particle[]>([]);
  const flashRef = useRef<ScreenFlash | null>(null);

  const createExplosion = useCallback((x: number, y: number, color: string, intensity: number = 1) => {
    const particleCount = Math.floor(20 * intensity);
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4 * intensity;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        color,
        size: 2 + Math.random() * 4 * intensity,
        type: 'explosion',
      });
    }
  }, []);

  const createCoinParticles = useCallback((x: number, y: number, value: number) => {
    const particleCount = 12 + value * 3;
    
    // Create golden sparkles
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 1.5 + Math.random() * 3;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 35 + Math.random() * 20,
        maxLife: 55,
        color: '#ffd700',
        size: 2 + Math.random() * 3,
        type: 'coin',
      });
    }

    // Create coin symbol particles
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: -3 - Math.random() * 2,
        life: 50,
        maxLife: 50,
        color: '#ffec00',
        size: 6,
        type: 'sparkle',
      });
    }

    // Screen flash
    flashRef.current = {
      color: 'rgba(255, 215, 0, 0.2)',
      alpha: 0.3,
      duration: 150,
      startTime: Date.now(),
    };
  }, []);

  const createPowerUpParticles = useCallback((x: number, y: number, type: string) => {
    const colors: Record<string, string> = {
      multiBall: '#ef4444',
      paddleSize: '#3b82f6',
      slowBall: '#10b981',
      shield: '#8b5cf6',
    };
    const color = colors[type] || '#ffffff';
    
    // Create burst pattern
    for (let ring = 0; ring < 3; ring++) {
      const particleCount = 12 + ring * 4;
      const delay = ring * 2;
      
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 2 + ring * 1.5;
        
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 45 + Math.random() * 20 - delay * 3,
          maxLife: 65,
          color,
          size: 3 + Math.random() * 3,
          type: 'powerup',
          hue: type === 'shield' ? 270 : undefined,
        });
      }
    }

    // Strong screen flash
    flashRef.current = {
      color: `${color}40`,
      alpha: 0.4,
      duration: 200,
      startTime: Date.now(),
    };
  }, []);

  const createRarityTrail = useCallback((x: number, y: number, rarity: string) => {
    if (rarity === 'common') return;
    
    const count = rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : 1;
    
    for (let i = 0; i < count; i++) {
      const hue = rarity === 'legendary' ? Math.random() * 360 : undefined;
      const color = rarity === 'legendary' 
        ? `hsl(${hue}, 80%, 60%)` 
        : rarity === 'epic' 
          ? '#a855f7' 
          : '#3b82f6';
      
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        color,
        size: rarity === 'legendary' ? 4 : 3,
        type: 'trail',
        hue,
      });
    }
  }, []);

  const updateParticles = useCallback(() => {
    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Add gravity for some particle types
      if (particle.type === 'coin' || particle.type === 'sparkle') {
        particle.vy += 0.08;
      } else if (particle.type === 'explosion') {
        particle.vy += 0.05;
      }
      
      // Slow down
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      
      particle.life -= 1;
      return particle.life > 0;
    });

    // Update flash
    if (flashRef.current) {
      const elapsed = Date.now() - flashRef.current.startTime;
      if (elapsed > flashRef.current.duration) {
        flashRef.current = null;
      }
    }
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, frame: number) => {
    particlesRef.current.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      
      if (particle.hue !== undefined) {
        ctx.fillStyle = `hsla(${(particle.hue + frame * 5) % 360}, 80%, 60%, ${alpha})`;
      } else {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = alpha;
      }
      
      // Add glow for certain types
      if (particle.type === 'powerup' || particle.type === 'coin') {
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
      }
      
      ctx.fill();
      ctx.closePath();
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
  }, []);

  const drawFlash = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!flashRef.current) return;
    
    const elapsed = Date.now() - flashRef.current.startTime;
    const progress = elapsed / flashRef.current.duration;
    const alpha = flashRef.current.alpha * (1 - progress);
    
    ctx.fillStyle = flashRef.current.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }, []);

  const getParticleCount = useCallback(() => particlesRef.current.length, []);

  const clearParticles = useCallback(() => {
    particlesRef.current = [];
    flashRef.current = null;
  }, []);

  return {
    createExplosion,
    createCoinParticles,
    createPowerUpParticles,
    createRarityTrail,
    updateParticles,
    drawParticles,
    drawFlash,
    getParticleCount,
    clearParticles,
    particles: particlesRef,
  };
};
