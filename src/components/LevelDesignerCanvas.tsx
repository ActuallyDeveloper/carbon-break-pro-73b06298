import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Square, Grid3x3 } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { Brick } from '@/types/game';

interface LevelDesignerCanvasProps {
  bricks: Brick[];
  onBricksChange: (bricks: Brick[]) => void;
}

export const LevelDesignerCanvas = ({ bricks, onBricksChange }: LevelDesignerCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [selectedBrickType, setSelectedBrickType] = useState<'normal' | 'strong' | 'explosive'>('normal');

  const BRICK_WIDTH = 70;
  const BRICK_HEIGHT = 20;
  const BRICK_PADDING = 5;
  const BRICK_OFFSET_TOP = 60;
  const BRICK_OFFSET_LEFT = 10;
  const COLUMNS = 8;
  const ROWS = 10;

  useEffect(() => {
    drawCanvas();
  }, [bricks, theme]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = theme === 'dark' ? '#ffffff' : '#000000';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = theme === 'dark' ? '#333333' : '#cccccc';
    ctx.lineWidth = 1;

    for (let c = 0; c < COLUMNS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const x = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
        const y = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
        ctx.strokeRect(x, y, BRICK_WIDTH, BRICK_HEIGHT);
      }
    }

    // Draw bricks
    bricks.forEach((brick) => {
      if (brick.active) {
        if (brick.type === 'strong') {
          ctx.fillStyle = theme === 'dark' ? '#4a5568' : '#718096';
        } else if (brick.type === 'explosive') {
          ctx.fillStyle = theme === 'dark' ? '#f56565' : '#fc8181';
        } else {
          ctx.fillStyle = color;
        }
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

        // Draw type indicator
        ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (brick.type === 'strong') {
          ctx.fillText('S', brick.x + brick.width / 2, brick.y + brick.height / 2);
        } else if (brick.type === 'explosive') {
          ctx.fillText('E', brick.x + brick.width / 2, brick.y + brick.height / 2);
        }
      }
    });
  };

  const getGridPosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const col = Math.floor((x - BRICK_OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));
    const row = Math.floor((y - BRICK_OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));

    if (col < 0 || col >= COLUMNS || row < 0 || row >= ROWS) return null;

    return { col, row };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getGridPosition(e.clientX, e.clientY);
    if (!pos) return;

    const brickX = pos.col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
    const brickY = pos.row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;

    const existingBrickIndex = bricks.findIndex(
      (b) => b.x === brickX && b.y === brickY
    );

    let newBricks: Brick[];

    if (isErasing) {
      if (existingBrickIndex !== -1) {
        newBricks = bricks.filter((_, i) => i !== existingBrickIndex);
      } else {
        return;
      }
    } else {
      if (existingBrickIndex !== -1) {
        newBricks = [...bricks];
        newBricks[existingBrickIndex] = {
          ...newBricks[existingBrickIndex],
          type: selectedBrickType,
        };
      } else {
        const newBrick: Brick = {
          x: brickX,
          y: brickY,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          active: true,
          type: selectedBrickType,
          hasCoin: Math.random() > 0.7,
        };
        newBricks = [...bricks, newBrick];
      }
    }

    onBricksChange(newBricks);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    handleCanvasClick(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    handleCanvasClick(e);
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    onBricksChange([]);
  };

  const fillGrid = () => {
    const newBricks: Brick[] = [];
    for (let c = 0; c < COLUMNS; c++) {
      for (let r = 0; r < ROWS; r++) {
        newBricks.push({
          x: c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          active: true,
          type: 'normal',
          hasCoin: Math.random() > 0.7,
        });
      }
    }
    onBricksChange(newBricks);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={!isErasing && selectedBrickType === 'normal' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setIsErasing(false);
            setSelectedBrickType('normal');
          }}
        >
          <Square className="h-4 w-4 mr-2" />
          Normal
        </Button>
        <Button
          variant={!isErasing && selectedBrickType === 'strong' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setIsErasing(false);
            setSelectedBrickType('strong');
          }}
        >
          <Square className="h-4 w-4 mr-2" />
          Strong
        </Button>
        <Button
          variant={!isErasing && selectedBrickType === 'explosive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setIsErasing(false);
            setSelectedBrickType('explosive');
          }}
        >
          <Square className="h-4 w-4 mr-2" />
          Explosive
        </Button>
        <Button
          variant={isErasing ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsErasing(!isErasing)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Erase
        </Button>
        <Button variant="outline" size="sm" onClick={fillGrid}>
          <Grid3x3 className="h-4 w-4 mr-2" />
          Fill Grid
        </Button>
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          Clear All
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="w-full h-full bg-background cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Click or drag to place bricks • {bricks.length} bricks placed
      </p>
    </div>
  );
};
