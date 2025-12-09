import { useDailyChallenges, DailyChallenge } from '@/hooks/useDailyChallenges';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Gift, Target, Zap, Coins, Gamepad2, Flame, CheckCircle2 } from 'lucide-react';

const ChallengeIcon = ({ type }: { type: DailyChallenge['type'] }) => {
  const icons = {
    score: Target,
    bricks: Zap,
    coins: Coins,
    games: Gamepad2,
    combo: Flame,
  };
  const Icon = icons[type];
  return <Icon className="h-5 w-5" />;
};

export const DailyChallengesPanel = () => {
  const { challenges, loading, claimReward, getTimeUntilReset } = useDailyChallenges();
  const { hours, minutes } = getTimeUntilReset();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Daily Challenges</h3>
            <p className="text-sm text-muted-foreground">Complete for bonus coins</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Resets in {hours}h {minutes}m</span>
        </div>
      </div>

      <div className="space-y-4">
        {challenges.map(challenge => {
          const progress = Math.min((challenge.progress / challenge.target) * 100, 100);
          const canClaim = challenge.completed && !challenge.claimedAt;
          const claimed = !!challenge.claimedAt;

          return (
            <div 
              key={challenge.id}
              className={`relative p-4 rounded-lg transition-all ${
                claimed 
                  ? 'bg-green-500/10' 
                  : challenge.completed 
                    ? 'bg-yellow-500/10' 
                    : 'bg-muted/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    claimed ? 'bg-green-500/20 text-green-500' :
                    challenge.completed ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <ChallengeIcon type={challenge.type} />
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{challenge.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-500">
                        +{challenge.reward} coins
                      </span>
                    </div>
                  </div>
                </div>

                {claimed ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Claimed</span>
                  </div>
                ) : canClaim ? (
                  <Button 
                    size="sm" 
                    onClick={() => claimReward(challenge.id)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    <Gift className="h-4 w-4 mr-1" />
                    Claim
                  </Button>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {challenge.progress}/{challenge.target}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <Progress 
                  value={progress} 
                  className={`h-2 ${
                    claimed ? '[&>div]:bg-green-500' :
                    challenge.completed ? '[&>div]:bg-yellow-500' : ''
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {challenges.every(c => c.claimedAt) && (
        <div className="mt-6 p-4 rounded-lg bg-green-500/10 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="font-medium text-green-500">All challenges completed!</p>
          <p className="text-sm text-muted-foreground">Come back tomorrow for new challenges</p>
        </div>
      )}
    </Card>
  );
};
