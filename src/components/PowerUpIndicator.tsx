import { useEffect, useState } from 'react';
import { PowerUpType } from '@/types/game';
import { Shield, Maximize2, CircleDot, Snowflake } from 'lucide-react';

interface PowerUpTimer {
  type: PowerUpType;
  endTime: number;
  duration: number;
}

interface PowerUpIndicatorProps {
  activePowerUps: Set<PowerUpType>;
  className?: string;
}

const POWER_UP_DURATIONS: Record<PowerUpType, number> = {
  shield: 30000,
  paddleSize: 10000,
  slowBall: 8000,
  multiBall: 0, // No timer, lasts until balls are lost
};

const POWER_UP_CONFIG: Record<PowerUpType, { icon: typeof Shield; label: string; color: string }> = {
  shield: { icon: Shield, label: 'Shield', color: 'hsl(262, 83%, 58%)' },
  paddleSize: { icon: Maximize2, label: 'Big Paddle', color: 'hsl(217, 91%, 60%)' },
  slowBall: { icon: Snowflake, label: 'Slow Ball', color: 'hsl(160, 84%, 39%)' },
  multiBall: { icon: CircleDot, label: 'Multi Ball', color: 'hsl(0, 84%, 60%)' },
};

export const PowerUpIndicator = ({ activePowerUps, className = '' }: PowerUpIndicatorProps) => {
  const [timers, setTimers] = useState<Map<PowerUpType, PowerUpTimer>>(new Map());
  const [timeLeft, setTimeLeft] = useState<Map<PowerUpType, number>>(new Map());

  useEffect(() => {
    // Add new power-ups
    activePowerUps.forEach((type) => {
      if (!timers.has(type)) {
        const duration = POWER_UP_DURATIONS[type];
        if (duration > 0) {
          setTimers((prev) => {
            const newMap = new Map(prev);
            newMap.set(type, {
              type,
              endTime: Date.now() + duration,
              duration,
            });
            return newMap;
          });
        }
      }
    });

    // Remove inactive power-ups
    timers.forEach((_, type) => {
      if (!activePowerUps.has(type)) {
        setTimers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(type);
          return newMap;
        });
      }
    });
  }, [activePowerUps, timers]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft = new Map<PowerUpType, number>();
      timers.forEach((timer, type) => {
        const remaining = Math.max(0, timer.endTime - Date.now());
        newTimeLeft.set(type, remaining);
      });
      setTimeLeft(newTimeLeft);
    }, 100);

    return () => clearInterval(interval);
  }, [timers]);

  if (activePowerUps.size === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {Array.from(activePowerUps).map((type) => {
        const config = POWER_UP_CONFIG[type];
        const Icon = config.icon;
        const remaining = timeLeft.get(type);
        const timer = timers.get(type);
        const progress = timer && remaining ? (remaining / timer.duration) * 100 : 100;

        return (
          <div
            key={type}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: `${config.color}20`,
              border: `2px solid ${config.color}`,
              boxShadow: `0 0 12px ${config.color}50`,
            }}
          >
            <Icon className="h-4 w-4" style={{ color: config.color }} />
            <span className="text-sm font-semibold" style={{ color: config.color }}>
              {config.label}
            </span>
            {remaining !== undefined && remaining > 0 && (
              <>
                <span className="text-xs font-mono" style={{ color: config.color }}>
                  {Math.ceil(remaining / 1000)}s
                </span>
                <div
                  className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-100"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: config.color,
                  }}
                />
              </>
            )}
            
            {/* Pulsing animation for active effect */}
            <div
              className="absolute inset-0 rounded-full animate-pulse opacity-30"
              style={{ backgroundColor: config.color }}
            />
          </div>
        );
      })}
    </div>
  );
};
