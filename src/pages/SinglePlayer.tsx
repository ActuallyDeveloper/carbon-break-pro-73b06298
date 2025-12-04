import { Layout } from "@/components/Layout";
import { GameCanvas } from "@/components/GameCanvas";
import { TimeLimitGameCanvas } from "@/components/TimeLimitGameCanvas";
import { InventoryPanel } from "@/components/InventoryPanel";
import { EquippedItemsPanel } from "@/components/EquippedItemsPanel";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Target, Clock, Zap } from "lucide-react";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useInventory } from "@/hooks/useInventory";
import { useAchievements } from "@/hooks/useAchievements";
import { Difficulty } from "@/types/game";

const SinglePlayer = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = useGameSettings();
  const { equippedItems } = useInventory('single_player');
  const { updateProgress } = useAchievements();
  const [currentLevel] = useState(1);
  const [gameMode, setGameMode] = useState<'normal' | 'time-limit'>('normal');
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.difficulty);

  const handleDifficultyChange = (value: Difficulty) => {
    setDifficulty(value);
    updateSettings({ difficulty: value });
  };

  const handleScoreUpdate = async (score: number) => {
    if (!user) return;

    try {
      await supabase
        .from("game_progress")
        .upsert({
          user_id: user.id,
          level: currentLevel,
          score: score,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  const handleCoinCollect = async (coins: number) => {
    if (!user) return;

    try {
      const { data: currency } = await supabase
        .from("user_currency")
        .select("single_player_coins")
        .eq("user_id", user.id)
        .single();

      const newTotal = (currency?.single_player_coins || 0) + coins;

      await supabase
        .from("user_currency")
        .update({ single_player_coins: newTotal })
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error updating coins:", error);
    }
  };

  const handleGameOver = async (finalScore: number, totalCoins: number, timeBonus: number = 0) => {
    if (!user) return;

    const totalScore = finalScore + timeBonus;

    try {
      const { data: existing } = await supabase
        .from("game_progress")
        .select("high_score")
        .eq("user_id", user.id)
        .eq("level", currentLevel)
        .maybeSingle();

      const isNewHighScore = !existing || totalScore > (existing.high_score || 0);

      await supabase
        .from("game_progress")
        .upsert({
          user_id: user.id,
          level: currentLevel,
          score: totalScore,
          high_score: isNewHighScore ? totalScore : existing?.high_score,
          updated_at: new Date().toISOString(),
        });

      await supabase
        .from("leaderboard")
        .upsert({
          user_id: user.id,
          mode: "single_player",
          total_score: totalScore,
          updated_at: new Date().toISOString(),
        });

      await handleCoinCollect(totalCoins);

      if (isNewHighScore) {
        await updateProgress('games_won_single', 1);
        toast.success(
          `New High Score: ${totalScore}! ${timeBonus > 0 ? `(+${timeBonus} time bonus) ` : ''}Earned ${totalCoins} coins!`
        );
      } else {
        toast.info(`Game Over! Score: ${totalScore}, Coins: ${totalCoins}`);
      }
      
      await updateProgress('bricks_broken', Math.floor(finalScore / 10));
      await updateProgress('coins_collected_single', totalCoins);
    } catch (error) {
      console.error("Error saving game:", error);
      toast.error("Failed to save progress");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8" />
              <h1 className="text-4xl font-bold">Single Player</h1>
            </div>
            <p className="text-lg text-muted-foreground">Level {currentLevel} • Break all bricks to progress</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Difficulty:</span>
              <Select value={difficulty} onValueChange={handleDifficultyChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs value={gameMode} onValueChange={(v) => setGameMode(v as 'normal' | 'time-limit')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="normal" className="gap-2">
              <Target className="h-4 w-4" />
              Normal Mode
            </TabsTrigger>
            <TabsTrigger value="time-limit" className="gap-2">
              <Clock className="h-4 w-4" />
              Time Limit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="normal" className="space-y-6">
            <EquippedItemsPanel equippedItems={equippedItems} mode="single_player" />
            <GameCanvas
              onScoreUpdate={handleScoreUpdate} 
              onGameOver={(score, coins) => handleGameOver(score, coins, 0)}
              onCoinCollect={handleCoinCollect}
              equippedItems={equippedItems}
              enablePowerUps={settings.powerUps.enabled && settings.powerUps.singlePlayer}
              difficulty={difficulty}
            />
          </TabsContent>

          <TabsContent value="time-limit" className="space-y-6">
            <EquippedItemsPanel equippedItems={equippedItems} mode="single_player" />
            <TimeLimitGameCanvas
              onScoreUpdate={handleScoreUpdate} 
              onGameOver={handleGameOver}
              onCoinCollect={handleCoinCollect}
              equippedItems={equippedItems}
            />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 transition-all duration-200 hover:shadow-lg">
            <h3 className="text-lg font-bold mb-3">How to Play</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="transition-all duration-200 hover:translate-x-1">• Control paddle with keyboard or mouse (check Settings)</li>
              <li className="transition-all duration-200 hover:translate-x-1">• On mobile, touch and drag to move paddle</li>
              <li className="transition-all duration-200 hover:translate-x-1">• Bounce the ball to break all bricks</li>
              <li className="transition-all duration-200 hover:translate-x-1">• Collect falling coins for currency</li>
              <li className="transition-all duration-200 hover:translate-x-1">• You have 3 lives - don't let the ball fall!</li>
              <li className="transition-all duration-200 hover:translate-x-1">• Each brick gives you 10 points</li>
              <li className="transition-all duration-200 hover:translate-x-1">• Higher difficulty = more coins & faster gameplay</li>
              {gameMode === 'time-limit' && (
                <li className="transition-all duration-200 hover:translate-x-1 text-primary font-medium">• Beat the clock for time bonus!</li>
              )}
            </ul>
          </Card>

          <InventoryPanel mode="single_player" />
        </div>
      </div>
    </Layout>
  );
};

export default SinglePlayer;