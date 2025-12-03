import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Coins, TrendingUp, Calendar, Award, Gamepad2, Users, Zap, Star } from "lucide-react";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useAchievements } from "@/hooks/useAchievements";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

const Stats = () => {
  const { history, stats, loading } = useGameHistory();
  const { achievements, userAchievements, loading: achievementsLoading } = useAchievements();

  if (loading || achievementsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </Layout>
    );
  }

  const totalGames = stats.singlePlayer.totalGames + stats.multiplayer.totalGames;
  const totalCoins = stats.singlePlayer.totalCoins + stats.multiplayer.totalCoins;
  const winRate = stats.multiplayer.totalGames > 0 
    ? Math.round((stats.multiplayer.wins / stats.multiplayer.totalGames) * 100) 
    : 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">STATISTICS</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Your Gameplay Dashboard</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gamepad2 className="h-4 w-4" />
              <span className="text-xs uppercase">Total Games</span>
            </div>
            <p className="text-3xl font-bold">{totalGames}</p>
          </div>
          <div className="bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Coins className="h-4 w-4" />
              <span className="text-xs uppercase">Total Coins</span>
            </div>
            <p className="text-3xl font-bold">{totalCoins}</p>
          </div>
          <div className="bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span className="text-xs uppercase">Win Rate</span>
            </div>
            <p className="text-3xl font-bold">{winRate}%</p>
          </div>
          <div className="bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4" />
              <span className="text-xs uppercase">Best Score</span>
            </div>
            <p className="text-3xl font-bold">{stats.singlePlayer.bestScore}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-transparent p-0 gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
            <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Single Player</TabsTrigger>
            <TabsTrigger value="multiplayer" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Multiplayer</TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold uppercase">Single Player</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Best Score</span>
                    <span className="text-xl font-bold">{stats.singlePlayer.bestScore}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Games Played</span>
                    <span className="text-xl font-bold">{stats.singlePlayer.totalGames}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Coins Earned</span>
                    <span className="text-xl font-bold flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      {stats.singlePlayer.totalCoins}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold uppercase">Multiplayer</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">W/L Record</span>
                    <span className="text-xl font-bold">
                      <span className="text-green-500">{stats.multiplayer.wins}W</span>
                      {" - "}
                      <span className="text-red-500">{stats.multiplayer.losses}L</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="text-xl font-bold">{winRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Coins Earned</span>
                    <span className="text-xl font-bold flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      {stats.multiplayer.totalCoins}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="single" className="space-y-4">
            <div className="bg-card p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold uppercase">Single Player Stats</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span className="text-sm uppercase">Best Score</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.singlePlayer.bestScore}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-4 w-4" />
                    <span className="text-sm uppercase">Total Coins</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.singlePlayer.totalCoins}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gamepad2 className="h-4 w-4" />
                    <span className="text-sm uppercase">Games Played</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.singlePlayer.totalGames}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="multiplayer" className="space-y-4">
            <div className="bg-card p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold uppercase">Multiplayer Stats</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span className="text-sm uppercase">Wins</span>
                  </div>
                  <p className="text-3xl font-bold text-green-500">{stats.multiplayer.wins}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span className="text-sm uppercase">Losses</span>
                  </div>
                  <p className="text-3xl font-bold text-red-500">{stats.multiplayer.losses}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm uppercase">Win Rate</span>
                  </div>
                  <p className="text-3xl font-bold">{winRate}%</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-4 w-4" />
                    <span className="text-sm uppercase">Coins</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.multiplayer.totalCoins}</p>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold uppercase">Recent Matches</h2>
              </div>
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No match history yet</div>
                ) : (
                  history.slice(0, 10).map((match) => (
                    <div key={match.id} className="bg-accent/50 p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${match.won ? 'text-green-500' : 'text-red-500'}`}>
                            {match.won ? 'WON' : 'LOST'}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-medium">{match.opponent}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {match.ended_at && format(new Date(match.ended_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{match.score}</p>
                        <p className="text-xs text-muted-foreground uppercase">Score</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <div className="bg-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold uppercase">Achievements</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {userAchievements.length} / {achievements.length} Unlocked
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => {
                  const userAch = userAchievements.find(ua => ua.achievement_id === achievement.id);
                  const isUnlocked = !!userAch;
                  const progress = userAch?.progress || 0;
                  const progressPercent = Math.min((progress / achievement.requirement_value) * 100, 100);

                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 space-y-3 transition-all ${isUnlocked ? 'bg-primary/10' : 'bg-accent/50 opacity-70'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`}>{achievement.icon || '🏆'}</div>
                          <div>
                            <h3 className="font-bold">{achievement.name}</h3>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          </div>
                        </div>
                        {isUnlocked && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span>{progress} / {achievement.requirement_value}</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Stats;
