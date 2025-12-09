import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface DailyChallenge {
  id: string;
  type: 'score' | 'bricks' | 'coins' | 'games' | 'combo';
  target: number;
  reward: number;
  description: string;
  progress: number;
  completed: boolean;
  claimedAt?: string;
}

const CHALLENGE_TEMPLATES = [
  { type: 'score' as const, targets: [500, 1000, 2000, 5000], rewards: [50, 100, 200, 500], desc: 'Score {target} points in a single game' },
  { type: 'bricks' as const, targets: [20, 50, 100, 200], rewards: [30, 75, 150, 300], desc: 'Break {target} bricks' },
  { type: 'coins' as const, targets: [10, 25, 50, 100], rewards: [40, 100, 200, 400], desc: 'Collect {target} coins' },
  { type: 'games' as const, targets: [1, 3, 5, 10], rewards: [25, 75, 150, 300], desc: 'Complete {target} games' },
  { type: 'combo' as const, targets: [3, 5, 8, 10], rewards: [60, 120, 250, 500], desc: 'Reach a {target}x combo' },
];

function generateDailyChallenges(seed: number): DailyChallenge[] {
  const challenges: DailyChallenge[] = [];
  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => (seed % 100) / 100 - 0.5);
  
  for (let i = 0; i < 3; i++) {
    const template = shuffled[i % shuffled.length];
    const difficultyIndex = Math.floor((seed + i) % 4);
    
    challenges.push({
      id: `daily_${i}_${seed}`,
      type: template.type,
      target: template.targets[difficultyIndex],
      reward: template.rewards[difficultyIndex],
      description: template.desc.replace('{target}', template.targets[difficultyIndex].toString()),
      progress: 0,
      completed: false,
    });
  }
  
  return challenges;
}

function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export function useDailyChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const loadChallenges = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const daySeed = getDaySeed();
    
    // Generate today's challenges
    const todaysChallenges = generateDailyChallenges(daySeed);
    
    // Try to get saved progress from localStorage
    const savedKey = `daily_challenges_${user.id}_${today}`;
    const saved = localStorage.getItem(savedKey);
    
    if (saved) {
      try {
        const savedData = JSON.parse(saved);
        setChallenges(savedData.challenges);
      } catch {
        setChallenges(todaysChallenges);
        localStorage.setItem(savedKey, JSON.stringify({ challenges: todaysChallenges }));
      }
    } else {
      setChallenges(todaysChallenges);
      localStorage.setItem(savedKey, JSON.stringify({ challenges: todaysChallenges }));
      
      // Clear old days
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`daily_challenges_${user.id}_`) && !key.includes(today)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    setLastRefresh(today);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadChallenges();
    
    // Check for day change every minute
    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      if (today !== lastRefresh) {
        loadChallenges();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [loadChallenges, lastRefresh]);

  const updateProgress = useCallback(async (type: DailyChallenge['type'], value: number, mode: 'add' | 'set' = 'add') => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const savedKey = `daily_challenges_${user.id}_${today}`;

    setChallenges(prev => {
      const updated = prev.map(challenge => {
        if (challenge.type !== type || challenge.completed) return challenge;
        
        const newProgress = mode === 'add' ? challenge.progress + value : Math.max(challenge.progress, value);
        const completed = newProgress >= challenge.target;
        
        if (completed && !challenge.completed) {
          toast.success(`Challenge Complete! "${challenge.description}"`, {
            description: `Claim your ${challenge.reward} coin reward!`,
          });
        }
        
        return { ...challenge, progress: newProgress, completed };
      });
      
      localStorage.setItem(savedKey, JSON.stringify({ challenges: updated }));
      return updated;
    });
  }, [user]);

  const claimReward = useCallback(async (challengeId: string) => {
    if (!user) return false;

    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge || !challenge.completed || challenge.claimedAt) return false;

    try {
      // Get current currency
      const { data: currency } = await supabase
        .from('user_currency')
        .select('single_player_coins')
        .eq('user_id', user.id)
        .single();

      const newTotal = (currency?.single_player_coins || 0) + challenge.reward;

      // Update currency
      await supabase
        .from('user_currency')
        .update({ single_player_coins: newTotal })
        .eq('user_id', user.id);

      // Mark as claimed
      const today = new Date().toISOString().split('T')[0];
      const savedKey = `daily_challenges_${user.id}_${today}`;
      
      setChallenges(prev => {
        const updated = prev.map(c => 
          c.id === challengeId ? { ...c, claimedAt: new Date().toISOString() } : c
        );
        localStorage.setItem(savedKey, JSON.stringify({ challenges: updated }));
        return updated;
      });

      toast.success(`Claimed ${challenge.reward} coins!`);
      return true;
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
      return false;
    }
  }, [user, challenges]);

  const getTimeUntilReset = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  }, []);

  return {
    challenges,
    loading,
    updateProgress,
    claimReward,
    getTimeUntilReset,
    refresh: loadChallenges,
  };
}
