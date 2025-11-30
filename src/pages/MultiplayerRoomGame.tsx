import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SplitScreenGameCanvas } from "@/components/SplitScreenGameCanvas";
import { EquippedItemsPanel } from "@/components/EquippedItemsPanel";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useInventory } from "@/hooks/useInventory";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useUserPresence } from "@/hooks/useUserPresence";
import { useAchievements } from "@/hooks/useAchievements";
import { ArrowLeft, Users, Trophy } from "lucide-react";

const MultiplayerRoomGame = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { equippedItems } = useInventory('multiplayer');
  const { settings } = useGameSettings();
  const { updatePresence } = useUserPresence();
  const { updateProgress } = useAchievements();
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [playerOneScore, setPlayerOneScore] = useState(0);
  const [playerTwoScore, setPlayerTwoScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (!roomCode || !user) return;
    
    fetchRoom();
    updatePresence({ in_game: true, room_id: roomCode });

    // Real-time subscriptions
    const roomChannel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          setRoom(payload.new);
          if (payload.new && (payload.new as any).status === 'active') {
            setGameStarted(true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
        },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      updatePresence({ in_game: false, room_id: undefined });
      supabase.removeChannel(roomChannel);
    };
  }, [roomCode, user]);

  const fetchRoom = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error) {
      toast.error('Failed to load room');
      navigate('/multiplayer');
      return;
    }

    setRoom(data);
    if (data.status === 'active') {
      setGameStarted(true);
    }
    
    fetchPlayers();
  };

  const fetchPlayers = async () => {
    if (!roomCode) return;

    const { data: roomData } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (!roomData) return;

    const { data, error } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('player_number');

    if (!error && data) {
      setPlayers(data);
    }
  };

  const handleGameOver = async (winner: 'player1' | 'player2', p1Score: number, p2Score: number) => {
    if (!user || !room) return;

    try {
      const winnerId = winner === 'player1' ? players[0]?.user_id : players[1]?.user_id;
      const isWinner = winnerId === user.id;

      await supabase
        .from('game_rooms')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', room.id);

      // Update stats and achievements
      if (isWinner) {
        await updateProgress('games_won_multi', 1);
        toast.success(`🏆 You won! Final Score: ${winner === 'player1' ? p1Score : p2Score}`);
      } else {
        toast.info(`Game Over! Final Score: ${winner === 'player1' ? p2Score : p1Score}`);
      }

      setTimeout(() => navigate('/multiplayer'), 3000);
    } catch (error) {
      console.error('Error ending game:', error);
      toast.error('Failed to save game results');
    }
  };

  const startGame = async () => {
    if (!room || !user || user.id !== room.host_id) return;

    await supabase
      .from('game_rooms')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', room.id);
  };

  if (!room) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </Layout>
    );
  }

  const isHost = user?.id === room.host_id;
  const canStart = isHost && players.length >= 2 && room.status === 'waiting';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/multiplayer')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lobby
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8" />
              <h1 className="text-4xl font-bold">Room: {roomCode}</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              {room.game_mode} • {players.length}/{room.max_players} Players
            </p>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              <div className="text-2xl font-bold">
                {playerOneScore} - {playerTwoScore}
              </div>
            </div>
          </Card>
        </div>

        {!gameStarted && (
          <Card className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Waiting for players...</h2>
            <p className="text-muted-foreground mb-4">
              {players.length < 2 ? 'Need at least 2 players to start' : 'All players ready!'}
            </p>
            {canStart && (
              <Button onClick={startGame} size="lg">
                Start Game
              </Button>
            )}
          </Card>
        )}

        {gameStarted && players.length >= 2 && (
          <>
            <EquippedItemsPanel equippedItems={equippedItems} />
            <SplitScreenGameCanvas
              playerOneName={`Player 1`}
              playerTwoName={`Player 2`}
              playerOneItems={equippedItems}
              playerTwoItems={equippedItems}
              onPlayerOneScore={setPlayerOneScore}
              onPlayerTwoScore={setPlayerTwoScore}
              onGameOver={handleGameOver}
              playerOneScore={playerOneScore}
              playerTwoScore={playerTwoScore}
              enablePowerUps={settings.powerUps.enabled && settings.powerUps.multiplayer}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default MultiplayerRoomGame;
