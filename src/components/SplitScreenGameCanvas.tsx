import { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { GameCanvas } from '@/components/GameCanvas';
import { EquippedItems } from '@/types/game';

interface SplitScreenGameCanvasProps {
  playerOneName: string;
  playerTwoName: string;
  playerOneItems: EquippedItems;
  playerTwoItems: EquippedItems;
  onPlayerOneScore: (score: number) => void;
  onPlayerTwoScore: (score: number) => void;
  onGameOver: (winner: 'player1' | 'player2', p1Score: number, p2Score: number) => void;
  playerOneScore: number;
  playerTwoScore: number;
  enablePowerUps?: boolean;
  onPlayerOnePaddleMove?: (x: number) => void;
  onPlayerTwoPaddleMove?: (x: number) => void;
  opponentPaddleX?: number;
}

export const SplitScreenGameCanvas = ({
  playerOneName,
  playerTwoName,
  playerOneItems,
  playerTwoItems,
  onPlayerOneScore,
  onPlayerTwoScore,
  onGameOver,
  playerOneScore,
  playerTwoScore,
  enablePowerUps = true,
  onPlayerOnePaddleMove,
  onPlayerTwoPaddleMove,
  opponentPaddleX,
}: SplitScreenGameCanvasProps) => {
  const player1GameOverRef = useRef(false);
  const player2GameOverRef = useRef(false);

  const handlePlayer1GameOver = (score: number, coins: number) => {
    player1GameOverRef.current = true;
    checkBothGameOver();
  };

  const handlePlayer2GameOver = (score: number, coins: number) => {
    player2GameOverRef.current = true;
    checkBothGameOver();
  };

  const checkBothGameOver = () => {
    if (player1GameOverRef.current && player2GameOverRef.current) {
      const winner = playerOneScore > playerTwoScore ? 'player1' : 'player2';
      onGameOver(winner, playerOneScore, playerTwoScore);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{playerOneName}</h3>
          <div className="text-2xl font-bold">{playerOneScore}</div>
        </div>
        <GameCanvas
          onScoreUpdate={onPlayerOneScore}
          onGameOver={handlePlayer1GameOver}
          onCoinCollect={() => {}}
          equippedItems={playerOneItems}
          enablePowerUps={enablePowerUps}
          onPaddleMove={onPlayerOnePaddleMove}
        />
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{playerTwoName}</h3>
          <div className="text-2xl font-bold">{playerTwoScore}</div>
        </div>
        <GameCanvas
          onScoreUpdate={onPlayerTwoScore}
          onGameOver={handlePlayer2GameOver}
          onCoinCollect={() => {}}
          equippedItems={playerTwoItems}
          enablePowerUps={enablePowerUps}
          onPaddleMove={onPlayerTwoPaddleMove}
          opponentPaddleX={opponentPaddleX}
        />
      </Card>
    </div>
  );
};
