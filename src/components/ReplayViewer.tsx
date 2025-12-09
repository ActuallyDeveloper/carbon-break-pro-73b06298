import { useState, useRef, useEffect } from 'react';
import { useReplaySystem, Replay, ReplayFrame } from '@/hooks/useReplaySystem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Trash2, Film, Trophy, Clock, Zap, Square } from 'lucide-react';
import { useTheme } from '@/lib/theme';

interface ReplayViewerProps {
  mode?: 'single_player' | 'multiplayer';
}

export const ReplayViewer = ({ mode = 'single_player' }: ReplayViewerProps) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    savedReplays, 
    isPlaying, 
    currentReplay,
    playReplay, 
    stopPlayback, 
    deleteReplay,
    formatDuration 
  } = useReplaySystem(mode);
  
  const [currentFrame, setCurrentFrame] = useState<ReplayFrame | null>(null);

  const drawFrame = (frame: ReplayFrame) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = theme === 'dark';

    // Clear
    ctx.fillStyle = isDark ? 'hsl(240, 15%, 8%)' : 'hsl(220, 25%, 95%)';
    ctx.fillRect(0, 0, 600, 600);

    // Draw grid
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 600; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 0; y < 600; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }

    // Draw bricks
    const cols = 8, rows = 5;
    const brickW = 65, brickH = 20, padding = 8;
    const offsetX = 12, offsetY = 60;

    frame.bricksActive.forEach((active, idx) => {
      if (!active) return;
      
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * (brickW + padding) + offsetX;
      const y = row * (brickH + padding) + offsetY;

      const hue = row * 20;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.beginPath();
      ctx.roundRect(x, y, brickW, brickH, 4);
      ctx.fill();
    });

    // Draw paddle
    ctx.fillStyle = '#3b82f6';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(frame.paddleX, 550, 100, 14, 7);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw ball
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(frame.ballX, frame.ballY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw UI overlay
    ctx.fillStyle = isDark ? '#ffffff' : '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${frame.score}`, 10, 25);
    
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${'❤'.repeat(frame.lives)}`, 590, 25);

    // Draw "REPLAY" indicator
    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('● REPLAY', 300, 590);
  };

  useEffect(() => {
    if (currentFrame) {
      drawFrame(currentFrame);
    }
  }, [currentFrame, theme]);

  const handlePlay = (replay: Replay) => {
    playReplay(
      replay,
      (frame) => {
        setCurrentFrame(frame);
      },
      () => {
        setCurrentFrame(null);
      }
    );
  };

  if (savedReplays.length === 0 && !isPlaying) {
    return (
      <Card className="p-8 text-center">
        <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">No Replays Yet</h3>
        <p className="text-muted-foreground">
          Your best games will be automatically saved here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isPlaying && currentReplay && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-500">Playing Replay</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Score: {currentReplay.finalScore}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={stopPlayback}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          </div>
          
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              className="rounded-lg max-w-full"
              style={{ background: theme === 'dark' ? 'hsl(240, 15%, 6%)' : 'hsl(220, 25%, 95%)' }}
            />
          </div>
        </Card>
      )}

      {!isPlaying && (
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Film className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Saved Replays</h3>
            <span className="text-sm text-muted-foreground">({savedReplays.length}/10)</span>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2">
              {savedReplays.map((replay, index) => (
                <div 
                  key={replay.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold">#{index + 1}</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{replay.finalScore}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">{formatDuration(replay.duration)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm capitalize">{replay.difficulty}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(replay.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handlePlay(replay)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Play
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => deleteReplay(replay.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};
