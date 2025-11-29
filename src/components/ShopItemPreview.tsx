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
          
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 15, 0, Math.PI * 2);
          ctx.fillStyle = ballColor;
          ctx.fill();
          
          if (properties?.effect === "fire") {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#ef4444";
          } else if (properties?.effect === "glow") {
            ctx.shadowBlur = 20;
            ctx.shadowColor = ballColor;
          }
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
          
          ctx.fillStyle = paddleColor;
          ctx.fillRect(width / 2 - 30, height - 20, 60, 8);
          
          if (properties?.effect === "glow") {
            ctx.shadowBlur = 15;
            ctx.shadowColor = paddleColor;
            ctx.fillRect(width / 2 - 30, height - 20, 60, 8);
            ctx.shadowBlur = 0;
          }
          break;

        case "brick":
          const brickX = width / 2 - 25;
          const brickY = height / 2 - 8;
          
          // Handle brick colors
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
          
          ctx.fillStyle = brickColor;
          
          if (properties?.effect === "glow") {
            ctx.shadowBlur = 10;
            ctx.shadowColor = brickColor;
          }
          
          if (properties?.effect === "dissolve") {
            ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
          }
          
          ctx.fillRect(brickX, brickY, 50, 16);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          
          if (properties?.effect === "particles") {
            for (let i = 0; i < 3; i++) {
              const offsetX = Math.sin(frame * 0.1 + i) * 10;
              const offsetY = Math.cos(frame * 0.1 + i) * 10;
              ctx.fillStyle = brickColor;
              ctx.globalAlpha = 0.5;
              ctx.fillRect(brickX + 25 + offsetX, brickY + 8 + offsetY, 3, 3);
            }
            ctx.globalAlpha = 1;
          }
          
          if (properties?.effect === "explode") {
            const pulseSize = Math.sin(frame * 0.1) * 2;
            ctx.fillRect(brickX - pulseSize, brickY - pulseSize, 50 + pulseSize * 2, 16 + pulseSize * 2);
          }
          break;

        case "aura":
          const auraRadius = 30 + Math.sin(frame * 0.05) * 5;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, auraRadius, 0, Math.PI * 2);
          
          const auraColors: Record<string, string> = {
            flower: "#ec4899",
            butterfly: "#8b5cf6",
            bat: "#6366f1",
            ice: "#3b82f6",
            fire: "#ef4444",
            lightning: "#eab308",
            shadow: "#64748b",
          };
          const auraColor = auraColors[properties?.type] || "#a855f7";
          
          ctx.strokeStyle = auraColor;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.6;
          ctx.stroke();
          ctx.globalAlpha = 1;
          
          if (properties?.animation === "petals") {
            for (let i = 0; i < 3; i++) {
              const angle = (frame * 0.02 + i * 2) % (Math.PI * 2);
              const x = width / 2 + Math.cos(angle) * 25;
              const y = height / 2 + Math.sin(angle) * 25;
              ctx.fillStyle = auraColor;
              ctx.beginPath();
              ctx.arc(x, y, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;

        case "background":
          if (properties?.theme === "space") {
            for (let i = 0; i < 20; i++) {
              const x = ((frame + i * 10) % width);
              const y = (i * 15) % height;
              ctx.fillStyle = isDark ? "#ffffff" : "#000000";
              ctx.fillRect(x, y, 1, 1);
            }
          } else if (properties?.theme === "neon") {
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
              const y = (i * 20 + frame % 20);
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }
          } else if (properties?.theme === "matrix") {
            ctx.fillStyle = "#10b981";
            ctx.font = "10px monospace";
            for (let i = 0; i < 5; i++) {
              const x = i * 20;
              const y = (frame % height);
              ctx.fillText("01", x, y);
            }
          }
          break;

        case "powerup":
          const powerupIcons: Record<string, string> = {
            bomb: "💣",
            magnet: "🧲",
            laser: "⚡",
            freeze: "❄️",
            shield: "🛡️",
            multiBall: "⚫",
            paddleSize: "📏",
            slowBall: "🐌",
          };
          const icon = powerupIcons[properties?.type] || "⭐";
          
          const powerupColors: Record<string, string> = {
            bomb: "#ef4444",
            magnet: "#8b5cf6",
            laser: "#eab308",
            freeze: "#3b82f6",
            shield: "#8b5cf6",
            multiBall: "#ef4444",
            paddleSize: "#3b82f6",
            slowBall: "#10b981",
          };
          const powerupColor = powerupColors[properties?.type] || baseColor;
          
          // Draw powerup circle
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2);
          ctx.fillStyle = powerupColor;
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = powerupColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw icon
          ctx.font = "24px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const scale = 1 + Math.sin(frame * 0.1) * 0.1;
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(scale, scale);
          ctx.fillText(icon, 0, 0);
          ctx.restore();
          break;

        case "trail":
          // Draw ball with trail effect
          const trailLength = properties?.length || 10;
          const trailColor = properties?.color || baseColor;
          
          for (let i = 0; i < 5; i++) {
            const alpha = (i / 5) * 0.5;
            const offset = i * 8;
            ctx.beginPath();
            ctx.arc(width / 2 - offset, height / 2, 10, 0, Math.PI * 2);
            ctx.fillStyle = trailColor;
            ctx.globalAlpha = alpha;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          
          // Main ball
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 10, 0, Math.PI * 2);
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
          
          // Draw explosion particles in a circle
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8 + frame * 0.05;
            const radius = 15 + Math.sin(frame * 0.1) * 5;
            const x = width / 2 + Math.cos(angle) * radius;
            const y = height / 2 + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = explosionColor;
            ctx.globalAlpha = 0.7 + Math.sin(frame * 0.1 + i) * 0.3;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;

        case "color":
          // Draw color theme preview
          const primaryColor = properties?.primary || baseColor;
          const secondaryColor = properties?.secondary || primaryColor;
          
          // Draw gradient background
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          gradient.addColorStop(0, primaryColor);
          gradient.addColorStop(1, secondaryColor);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          
          // Draw sparkles if enabled
          if (properties?.sparkle) {
            for (let i = 0; i < 5; i++) {
              const x = (width / 2) + Math.cos(frame * 0.05 + i) * 20;
              const y = (height / 2) + Math.sin(frame * 0.05 + i) * 20;
              ctx.fillStyle = "#ffffff";
              ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1 + i) * 0.5;
              ctx.fillRect(x, y, 2, 2);
            }
            ctx.globalAlpha = 1;
          }
          break;

        case "skin":
          // Draw skin preview based on target
          const skinTarget = properties?.target || "paddle";
          const skinColor = properties?.color || baseColor;
          
          if (skinTarget === "paddle") {
            ctx.fillStyle = skinColor;
            ctx.fillRect(width / 2 - 30, height - 20, 60, 8);
            if (properties?.pattern === "stripes") {
              ctx.fillStyle = isDark ? "#ffffff" : "#000000";
              for (let i = 0; i < 6; i++) {
                ctx.fillRect(width / 2 - 30 + i * 10, height - 20, 5, 8);
              }
            }
          } else if (skinTarget === "ball") {
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, 15, 0, Math.PI * 2);
            ctx.fillStyle = skinColor;
            ctx.fill();
            if (properties?.pattern === "dots") {
              ctx.fillStyle = isDark ? "#ffffff" : "#000000";
              for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(
                  width / 2 + Math.cos(angle) * 8,
                  height / 2 + Math.sin(angle) * 8,
                  2,
                  0,
                  Math.PI * 2
                );
                ctx.fill();
              }
            }
          }
          break;

        case "animation":
          // Draw animation preview (emote/celebration)
          const animType = properties?.type || "emote";
          const animDuration = properties?.duration || 3;
          
          ctx.font = "32px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          
          const animIcons: Record<string, string> = {
            emote: "🎉",
            taunt: "😎",
            celebration: "🏆",
            dance: "💃",
          };
          const animIcon = animIcons[animType] || "✨";
          
          // Animate icon
          const animScale = 1 + Math.sin(frame * 0.1) * 0.3;
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(animScale, animScale);
          ctx.fillText(animIcon, 0, 0);
          ctx.restore();
          
          // Draw particles if enabled
          if (properties?.particles) {
            for (let i = 0; i < 6; i++) {
              const angle = (frame * 0.05 + i) % (Math.PI * 2);
              const radius = 25;
              const x = width / 2 + Math.cos(angle) * radius;
              const y = height / 2 + Math.sin(angle) * radius;
              ctx.fillStyle = `hsl(${(frame + i * 60) % 360}, 70%, 50%)`;
              ctx.globalAlpha = 0.6;
              ctx.fillRect(x, y, 3, 3);
            }
            ctx.globalAlpha = 1;
          }
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
  }, [type, properties, theme]);

  const rarityColors: Record<string, string> = {
    common: "border-muted",
    rare: "border-primary",
    epic: "border-accent",
    legendary: "border-destructive",
  };

  return (
    <div className={`border-2 ${rarityColors[rarity]} rounded p-2 bg-background`}>
      <canvas 
        ref={canvasRef} 
        width={120} 
        height={80}
        className="w-full h-auto"
      />
    </div>
  );
};
