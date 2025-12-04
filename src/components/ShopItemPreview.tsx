import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme";

interface ShopItemPreviewProps {
  type: string;
  properties: any;
  rarity: string;
}

export const ShopItemPreview = ({ type, properties, rarity }: ShopItemPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    let frame = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      frame++;

      const isDark = theme === "dark";
      const baseColor = isDark ? "#ffffff" : "#000000";
      
      // Rarity-based background effects
      if (rarity === 'legendary') {
        const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, 50);
        gradient.addColorStop(0, `hsla(${frame % 360}, 60%, 50%, 0.2)`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else if (rarity === 'epic') {
        ctx.fillStyle = `rgba(168, 85, 247, ${0.1 + Math.sin(frame * 0.05) * 0.05})`;
        ctx.fillRect(0, 0, width, height);
      } else if (rarity === 'rare') {
        ctx.fillStyle = `rgba(59, 130, 246, ${0.05 + Math.sin(frame * 0.03) * 0.03})`;
        ctx.fillRect(0, 0, width, height);
      }

      switch (type) {
        case "ball":
          const ballColors: Record<string, string> = {
            default: baseColor,
            red: "#ef4444",
            blue: "#3b82f6",
            purple: "#a855f7",
            neon: "#10b981",
            yellow: "#eab308",
            rainbow: `hsl(${frame % 360}, 70%, 50%)`,
          };
          const ballColor = ballColors[properties?.color] || baseColor;
          
          // Draw trail for legendary/epic
          if (rarity === 'legendary' || rarity === 'epic') {
            for (let i = 0; i < 5; i++) {
              const trailAlpha = (5 - i) / 10;
              ctx.beginPath();
              ctx.arc(width / 2 - i * 4, height / 2, 15 - i, 0, Math.PI * 2);
              if (rarity === 'legendary') {
                ctx.fillStyle = `hsla(${(frame + i * 20) % 360}, 70%, 50%, ${trailAlpha})`;
              } else {
                ctx.fillStyle = `rgba(168, 85, 247, ${trailAlpha})`;
              }
              ctx.fill();
            }
          }
          
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 15, 0, Math.PI * 2);
          ctx.fillStyle = ballColor;
          
          if (properties?.effect === "fire") {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#ef4444";
          } else if (properties?.effect === "glow" || rarity === 'legendary') {
            ctx.shadowBlur = 20;
            ctx.shadowColor = rarity === 'legendary' ? `hsl(${frame % 360}, 70%, 50%)` : ballColor;
          } else if (properties?.effect === "ice") {
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#3b82f6";
          }
          
          ctx.fill();
          ctx.shadowBlur = 0;
          break;

        case "paddle":
          const paddleColors: Record<string, string> = {
            default: baseColor,
            neon: "#10b981",
            chrome: "#94a3b8",
            gold: "#eab308",
            plasma: "#a855f7",
            rainbow: `hsl(${frame % 360}, 70%, 50%)`,
          };
          const paddleColor = paddleColors[properties?.material] || baseColor;
          
          if (rarity === 'legendary') {
            const gradient = ctx.createLinearGradient(width/2 - 30, 0, width/2 + 30, 0);
            for (let i = 0; i <= 6; i++) {
              gradient.addColorStop(i / 6, `hsl(${(frame * 2 + i * 60) % 360}, 70%, 50%)`);
            }
            ctx.fillStyle = gradient;
          } else {
            ctx.fillStyle = paddleColor;
          }
          
          if (properties?.effect === "glow" || rarity === 'epic') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = rarity === 'epic' ? '#a855f7' : paddleColor;
          }
          
          ctx.fillRect(width / 2 - 30, height - 25, 60, 10);
          ctx.shadowBlur = 0;
          break;

        case "brick":
          const brickX = width / 2 - 25;
          const brickY = height / 2 - 10;
          
          const brickColors: Record<string, string> = {
            default: baseColor,
            red: "#ef4444",
            blue: "#3b82f6",
            green: "#10b981",
            purple: "#a855f7",
            yellow: "#eab308",
            orange: "#f97316",
            pink: "#ec4899",
            rainbow: `hsl(${frame % 360}, 70%, 50%)`,
          };
          
          const effectColors: Record<string, string> = {
            dissolve: "#8b5cf6",
            particles: "#3b82f6",
            glow: "#10b981",
            explode: "#ef4444",
          };
          
          const brickColor = brickColors[properties?.color] || 
                             effectColors[properties?.effect] || 
                             baseColor;
          
          if (properties?.effect === "glow" || rarity !== 'common') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = rarity === 'legendary' ? `hsl(${frame % 360}, 70%, 50%)` : 
                              rarity === 'epic' ? '#a855f7' : brickColor;
          }
          
          if (properties?.effect === "dissolve") {
            ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
          }
          
          ctx.fillStyle = rarity === 'legendary' ? `hsl(${frame % 360}, 70%, 50%)` : brickColor;
          ctx.fillRect(brickX, brickY, 50, 20);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          
          if (properties?.effect === "particles") {
            for (let i = 0; i < 4; i++) {
              const offsetX = Math.sin(frame * 0.1 + i) * 12;
              const offsetY = Math.cos(frame * 0.1 + i) * 12;
              ctx.fillStyle = brickColor;
              ctx.globalAlpha = 0.6;
              ctx.fillRect(brickX + 25 + offsetX - 2, brickY + 10 + offsetY - 2, 4, 4);
            }
            ctx.globalAlpha = 1;
          }
          break;

        case "aura":
          const auraRadius = 25 + Math.sin(frame * 0.05) * 5;
          
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
          const auraColor = auraColors[properties?.type] || "#a855f7";
          
          // Multiple rings
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, auraRadius - i * 6, 0, Math.PI * 2);
            ctx.strokeStyle = rarity === 'legendary' ? `hsl(${(frame + i * 40) % 360}, 70%, 50%)` : auraColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6 - i * 0.15;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          
          // Orbiting particles
          for (let i = 0; i < 4; i++) {
            const angle = (frame * 0.02 + i * 1.57) % (Math.PI * 2);
            const x = width / 2 + Math.cos(angle) * 20;
            const y = height / 2 + Math.sin(angle) * 20;
            ctx.fillStyle = auraColor;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case "background":
          ctx.fillStyle = isDark ? '#1a1a2e' : '#f0f0f0';
          ctx.fillRect(0, 0, width, height);
          
          if (properties?.theme === "space") {
            for (let i = 0; i < 25; i++) {
              const x = ((frame * 0.5 + i * 15) % width);
              const y = (i * 12) % height;
              ctx.fillStyle = isDark ? "#ffffff" : "#000000";
              ctx.globalAlpha = 0.3 + Math.random() * 0.5;
              ctx.fillRect(x, y, 2, 2);
            }
            ctx.globalAlpha = 1;
          } else if (properties?.theme === "neon") {
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            for (let i = 0; i < 6; i++) {
              const y = (i * 15 + frame % 15);
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          } else if (properties?.theme === "matrix") {
            ctx.fillStyle = "#10b981";
            ctx.font = "10px monospace";
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 6; i++) {
              const x = i * 20;
              const y = (frame % height);
              ctx.fillText("01", x, y);
            }
            ctx.globalAlpha = 1;
          }
          break;

        case "trail":
          const trailColor = properties?.color || baseColor;
          
          // Draw animated trail
          for (let i = 0; i < 6; i++) {
            const alpha = (6 - i) / 8;
            const offset = i * 10;
            const size = 10 - i;
            ctx.beginPath();
            ctx.arc(width / 2 - offset + 20, height / 2, size, 0, Math.PI * 2);
            
            if (properties?.effect === 'fire') {
              ctx.fillStyle = `rgba(255, ${100 + i * 20}, 0, ${alpha})`;
            } else if (properties?.effect === 'ice') {
              ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
            } else if (properties?.effect === 'rainbow' || rarity === 'legendary') {
              ctx.fillStyle = `hsla(${(frame + i * 30) % 360}, 70%, 50%, ${alpha})`;
            } else {
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            }
            ctx.fill();
          }
          
          // Main ball
          ctx.beginPath();
          ctx.arc(width / 2 + 20, height / 2, 10, 0, Math.PI * 2);
          ctx.fillStyle = trailColor;
          ctx.fill();
          break;

        case "explosion":
          const explosionTypes: Record<string, string> = {
            fire: "#ef4444",
            ice: "#3b82f6",
            lightning: "#eab308",
            plasma: "#a855f7",
            blackhole: "#000000",
            rainbow: `hsl(${frame % 360}, 70%, 50%)`,
          };
          const explosionColor = explosionTypes[properties?.type] || "#ef4444";
          
          // Explosion ring
          const ringRadius = 15 + Math.sin(frame * 0.1) * 8;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = explosionColor;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.7;
          ctx.stroke();
          ctx.globalAlpha = 1;
          
          // Explosion particles
          for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10 + frame * 0.03;
            const particleRadius = 12 + Math.sin(frame * 0.1 + i) * 6;
            const x = width / 2 + Math.cos(angle) * particleRadius;
            const y = height / 2 + Math.sin(angle) * particleRadius;
            
            ctx.beginPath();
            ctx.arc(x, y, 3 + Math.sin(frame * 0.1 + i) * 1, 0, Math.PI * 2);
            ctx.fillStyle = rarity === 'legendary' ? `hsl(${(frame + i * 36) % 360}, 70%, 50%)` : explosionColor;
            ctx.globalAlpha = 0.8;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;

        default:
          ctx.fillStyle = baseColor;
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(type.toUpperCase(), width / 2, height / 2);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [type, properties, theme, rarity]);

  const rarityBorders: Record<string, string> = {
    common: "border-muted",
    rare: "border-blue-500/50",
    epic: "border-purple-500/50",
    legendary: "border-yellow-500/50",
  };

  const rarityGlows: Record<string, string> = {
    common: "",
    rare: "shadow-[0_0_8px_rgba(59,130,246,0.3)]",
    epic: "shadow-[0_0_12px_rgba(168,85,247,0.4)]",
    legendary: "shadow-[0_0_16px_rgba(234,179,8,0.5)]",
  };

  return (
    <div className={`border-2 ${rarityBorders[rarity]} ${rarityGlows[rarity]} rounded-lg p-1 bg-background/50 transition-all duration-300`}>
      <canvas 
        ref={canvasRef} 
        width={120} 
        height={80}
        className="w-full h-auto rounded"
      />
    </div>
  );
};