import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Coins, TrendingUp, Calendar, Award } from "lucide-react";
import { useGameHistory } from "@/hooks/useGameHistory";
import { format } from "date-fns";

const Stats = () => {
  const { history, stats, loading } = useGameHistory();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">STATISTICS</h1>
          <p className="text-muted-foreground uppercase tracking-wider">Your Gameplay Dashboard</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="single">Single Player</TabsTrigger>
            <TabsTrigger value="multiplayer">Multiplayer</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold uppercase">Single Player</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground uppercase">Best Score</span>
                    <span className="text-2xl font-bold">{stats.singlePlayer.bestScore}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground uppercase">Total Coins</span>
                    <span className="text-xl font-bold flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      {stats.singlePlayer.totalCoins}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold uppercase">Multiplayer</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground uppercase">W/L Record</span>
                    <span className="text-2xl font-bold">
                      {stats.multiplayer.wins}W - {stats.multiplayer.losses}L
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground uppercase">Win Rate</span>
                    <span className="text-xl font-bold">
                      {stats.multiplayer.totalGames > 0
                        ? Math.round((stats.multiplayer.wins / stats.multiplayer.totalGames) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground uppercase">Total Coins</span>
                    <span className="text-xl font-bold flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      {stats.multiplayer.totalCoins}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="single" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold uppercase">Single Player Stats</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-5 w-5" />
                    <span className="text-sm uppercase">Best Score</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.singlePlayer.bestScore}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-5 w-5" />
                    <span className="text-sm uppercase">Total Coins</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.singlePlayer.totalCoins}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-5 w-5" />
                    <span className="text-sm uppercase">Games Played</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.singlePlayer.totalGames}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="multiplayer" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold uppercase">Multiplayer Stats</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-5 w-5" />
                    <span className="text-sm uppercase">Wins</span>
                  </div>
                  <p className="text-3xl font-bold text-green-500">{stats.multiplayer.wins}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-5 w-5" />
                    <span className="text-sm uppercase">Losses</span>
                  </div>
                  <p className="text-3xl font-bold text-red-500">{stats.multiplayer.losses}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm uppercase">Win Rate</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {stats.multiplayer.totalGames > 0
                      ? Math.round((stats.multiplayer.wins / stats.multiplayer.totalGames) * 100)
                      : 0}%
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-5 w-5" />
                    <span className="text-sm uppercase">Total Coins</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.multiplayer.totalCoins}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold uppercase">Recent Matches</h2>
              </div>

              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No match history yet
                  </div>
                ) : (
                  history.map((match) => (
                    <Card key={match.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${match.won ? 'text-green-500' : 'text-red-500'}`}>
                              {match.won ? 'WON' : 'LOST'}
                            </span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{match.opponent}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {match.ended_at && format(new Date(match.ended_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{match.score}</p>
                          <p className="text-xs text-muted-foreground uppercase">Score</p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Stats;
