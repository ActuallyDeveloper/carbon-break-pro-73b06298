import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Gamepad2, 
  Zap, 
  Target, 
  Heart,
  Coins,
  MousePointer,
  Keyboard,
  Smartphone
} from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
  action?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Brick Breaker!',
    description: 'This tutorial will teach you the basics of gameplay. Let\'s get started!',
    icon: <Target className="h-8 w-8" />,
  },
  {
    id: 'objective',
    title: 'Game Objective',
    description: 'Your goal is to break all the bricks on the screen by bouncing the ball off your paddle. Clear all bricks to win!',
    icon: <Target className="h-8 w-8" />,
  },
  {
    id: 'controls-desktop',
    title: 'Desktop Controls',
    description: 'Use Arrow Keys (← →) or A/D keys to move the paddle. You can also enable Mouse Hover mode in Settings for direct control.',
    icon: <Keyboard className="h-8 w-8" />,
  },
  {
    id: 'controls-mobile',
    title: 'Mobile Controls',
    description: 'On mobile devices, touch and drag your finger left or right to move the paddle. The paddle follows your finger position.',
    icon: <Smartphone className="h-8 w-8" />,
  },
  {
    id: 'lives',
    title: 'Lives System',
    description: 'You have 3 lives. Each time the ball falls past your paddle, you lose a life. Lose all lives and the game is over!',
    icon: <Heart className="h-8 w-8 text-red-500" />,
  },
  {
    id: 'scoring',
    title: 'Scoring Points',
    description: 'Breaking bricks earns you points. Different colored bricks may have different point values. Aim for high scores!',
    icon: <Target className="h-8 w-8" />,
  },
  {
    id: 'coins',
    title: 'Collecting Coins',
    description: 'Coins drop from broken bricks. Catch them with your paddle to earn currency for the shop. Higher difficulty = more coins!',
    icon: <Coins className="h-8 w-8 text-yellow-500" />,
  },
  {
    id: 'powerups',
    title: 'Power-Ups',
    description: 'Special power-ups may drop from bricks. These can expand your paddle, slow the ball, give you multi-ball, or add shields!',
    icon: <Zap className="h-8 w-8 text-primary" />,
  },
  {
    id: 'powerup-types',
    title: 'Power-Up Types',
    description: '🛡️ Shield - Protects from one miss\n📏 Wide Paddle - Larger paddle\n🐢 Slow Ball - Slower ball speed\n⚡ Fast Ball - Faster ball\n🔴 Multi-Ball - Multiple balls\n💎 Magnet - Ball sticks to paddle',
    icon: <Zap className="h-8 w-8" />,
  },
  {
    id: 'difficulty',
    title: 'Difficulty Levels',
    description: 'Easy: Slower ball, more time to react. Medium: Balanced gameplay. Hard: Fast ball, more coins earned!',
    icon: <Gamepad2 className="h-8 w-8" />,
  },
  {
    id: 'shop',
    title: 'The Shop',
    description: 'Use earned coins to buy cosmetics: custom paddles, balls, backgrounds, and special effects. Show off your style!',
    icon: <Coins className="h-8 w-8" />,
  },
  {
    id: 'multiplayer',
    title: 'Multiplayer Mode',
    description: 'Challenge friends in split-screen battles! Create or join rooms with room codes. The player with the highest score wins!',
    icon: <Gamepad2 className="h-8 w-8" />,
  },
  {
    id: 'ready',
    title: 'Ready to Play!',
    description: 'You now know the basics. Head to Single Player or Multiplayer to start playing. Good luck and have fun!',
    icon: <Target className="h-8 w-8" />,
  },
];

interface TutorialModeProps {
  onClose: () => void;
  onComplete: () => void;
}

export const TutorialMode = ({ onClose, onComplete }: TutorialModeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      localStorage.setItem('tutorialCompleted', 'true');
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  // Simple animation demo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let dx = 2;
    let dy = -2;
    const ballRadius = 8;
    const paddleWidth = 80;
    const paddleHeight = 10;
    let paddleX = (canvas.width - paddleWidth) / 2;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.fillStyle = 'hsl(var(--muted))';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bricks
      const brickRows = 3;
      const brickCols = 6;
      const brickWidth = (canvas.width - 40) / brickCols;
      const brickHeight = 15;

      for (let row = 0; row < brickRows; row++) {
        for (let col = 0; col < brickCols; col++) {
          const x = 20 + col * brickWidth;
          const y = 20 + row * (brickHeight + 5);
          
          const hue = (row * 40 + col * 20) % 360;
          ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
          ctx.fillRect(x + 2, y, brickWidth - 4, brickHeight);
        }
      }

      // Draw paddle
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.beginPath();
      ctx.roundRect(paddleX, canvas.height - 30, paddleWidth, paddleHeight, 5);
      ctx.fill();

      // Draw ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.fill();

      // Ball movement
      ballX += dx;
      ballY += dy;

      // Wall collision
      if (ballX + ballRadius > canvas.width || ballX - ballRadius < 0) dx = -dx;
      if (ballY - ballRadius < 0) dy = -dy;
      if (ballY + ballRadius > canvas.height) {
        dy = -dy;
        ballY = canvas.height - 30 - ballRadius;
      }

      // Paddle follows ball horizontally (demo mode)
      paddleX = ballX - paddleWidth / 2;
      paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, paddleX));

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 space-y-6 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Step {currentStep + 1} of {TUTORIAL_STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className={`transition-all duration-200 ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  {step.icon}
                </div>
                <h2 className="text-xl font-bold">{step.title}</h2>
              </div>
              
              <p className="text-muted-foreground whitespace-pre-line">
                {step.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={280}
              height={200}
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-1">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button onClick={nextStep} className="gap-2">
            {currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Hook to check if tutorial should be shown
export const useTutorialStatus = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(() => {
    return localStorage.getItem('tutorialCompleted') === 'true';
  });

  const openTutorial = () => setShowTutorial(true);
  const closeTutorial = () => setShowTutorial(false);
  const completeTutorial = () => {
    setHasCompleted(true);
    setShowTutorial(false);
  };
  const resetTutorial = () => {
    localStorage.removeItem('tutorialCompleted');
    setHasCompleted(false);
  };

  return {
    showTutorial,
    hasCompleted,
    openTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial,
  };
};
