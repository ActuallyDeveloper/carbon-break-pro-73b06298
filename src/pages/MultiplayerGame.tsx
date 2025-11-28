import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameCanvas } from "@/components/GameCanvas";
import { InventoryPanel } from "@/components/InventoryPanel";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useRealtimeMatch } from "@/hooks/useRealtimeMatch";
import { useInventory } from "@/hooks/useInventory";
import { useGameSettings } from "@/hooks/useGameSettings";
import { ArrowLeft, Users } from "lucide-react";

const MultiplayerGame = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { equippedItems } = useInventory('multiplayer');
  const { settings } = useGameSettings();
  const [match, setMatch] = useState<any>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const { opponentState, broadcastGameState } = useRealtimeMatch(matchId || null);

  useEffect(() => {
    if (!matchId || !user) return;
    fetchMatch();

    const channel = supabase
      .channel(`match_updates:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "multiplayer_matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatch(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  useEffect(() => {
    if (opponentState) {
      setOpponentScore(opponentState.score);
    }
  }, [opponentState]);

  const fetchMatch = async () => {
    if (!matchId) return;

    const { data, error } = await supabase
      .from("multiplayer_matches")
      .select("*, host:profiles!multiplayer_matches_host_id_fkey(username), opponent:profiles!multiplayer_matches_opponent_id_fkey(username)")
      .eq("id", matchId)
      .single();

    if (error) {
      toast.error("Failed to load match");
      navigate("/multiplayer");
      return;
    }

    setMatch(data);
  };

  const handleScoreUpdate = async (score: number) => {
    if (!user || !matchId) return;
    setMyScore(score);

    const isHost = match?.host_id === user.id;

    try {
      await supabase
        .from("multiplayer_matches")
        .update({
          [isHost ? "host_score" : "opponent_score"]: score,
        })
        .eq("id", matchId);

      broadcastGameState({
        ballX: 0,
        ballY: 0,
        paddleX: 0,
        score,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  const handleGameOver = async (finalScore: number, totalCoins: number) => {
    if (!user || !matchId) return;

    try {
      const isHost = match?.host_id === user.id;
      const winnerId = finalScore > opponentScore ? user.id : match?.opponent_id;

      await supabase
        .from("multiplayer_matches")
        .update({
          status: "completed",
          winner_id: winnerId,
          ended_at: new Date().toISOString(),
          [isHost ? "host_score" : "opponent_score"]: finalScore,
        })
        .eq("id", matchId);

      const { data: currency } = await supabase
        .from("user_currency")
        .select("multiplayer_coins")
        .eq("user_id", user.id)
        .single();

      await supabase
        .from("user_currency")
        .update({
          multiplayer_coins: (currency?.multiplayer_coins || 0) + totalCoins,
        })
        .eq("user_id", user.id);

      if (winnerId === user.id) {
        toast.success(`You won! Final Score: ${finalScore}, Coins: ${totalCoins}`);
      } else {
        toast.info(`Game Over! Final Score: ${finalScore}, Coins: ${totalCoins}`);
      }

      setTimeout(() => navigate("/multiplayer"), 3000);
    } catch (error) {
      console.error("Error ending game:", error);
      toast.error("Failed to save match results");
    }
  };

  if (!match) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading match...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/multiplayer")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8" />
              <h1 className="text-4xl font-bold">Multiplayer Match</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              {match.host?.username} vs {match.opponent?.username || "Waiting..."}
            </p>
          </div>
          <Card className="p-4">
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                <p className="text-3xl font-bold">{myScore}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Opponent</p>
                <p className="text-3xl font-bold">{opponentScore}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GameCanvas
              onScoreUpdate={handleScoreUpdate}
              onGameOver={handleGameOver}
              onCoinCollect={() => {}}
              equippedItems={equippedItems}
              enablePowerUps={settings.powerUps.enabled && settings.powerUps.multiplayer}
            />
          </div>
          <div>
            <InventoryPanel mode="multiplayer" />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MultiplayerGame;
