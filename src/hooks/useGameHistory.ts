import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface GameHistoryEntry {
  id: string;
  created_at: string;
  ended_at: string | null;
  mode: 'single_player' | 'multiplayer';
  score: number;
  coins_earned: number;
  won?: boolean;
  opponent?: string;
}

export const useGameHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [stats, setStats] = useState({
    singlePlayer: {
      totalGames: 0,
      bestScore: 0,
      totalCoins: 0,
    },
    multiplayer: {
      totalGames: 0,
      wins: 0,
      losses: 0,
      bestScore: 0,
      totalCoins: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);

      // Fetch multiplayer matches
      const { data: mpMatches } = await supabase
        .from('multiplayer_matches')
        .select(`
          id,
          created_at,
          ended_at,
          host_id,
          opponent_id,
          host_score,
          opponent_score,
          winner_id,
          host:profiles!multiplayer_matches_host_id_fkey(username),
          opponent:profiles!multiplayer_matches_opponent_id_fkey(username)
        `)
        .or(`host_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(20);

      // Fetch user currency to get total coins
      const { data: currency } = await supabase
        .from('user_currency')
        .select('single_player_coins, multiplayer_coins')
        .eq('user_id', user.id)
        .single();

      // Fetch leaderboard stats
      const { data: leaderboard } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', user.id);

      const spStats = leaderboard?.find(l => l.mode === 'single_player');
      const mpStats = leaderboard?.find(l => l.mode === 'multiplayer');

      // Format multiplayer history
      const mpHistory: GameHistoryEntry[] = (mpMatches || []).map(match => {
        const isHost = match.host_id === user.id;
        const myScore = isHost ? match.host_score : match.opponent_score;
        const won = match.winner_id === user.id;
        const opponentName = isHost 
          ? (match.opponent as any)?.username 
          : (match.host as any)?.username;

        return {
          id: match.id,
          created_at: match.created_at!,
          ended_at: match.ended_at,
          mode: 'multiplayer' as const,
          score: myScore || 0,
          coins_earned: 0, // We don't track per-match coins
          won,
          opponent: opponentName || 'Unknown',
        };
      });

      setHistory(mpHistory);

      setStats({
        singlePlayer: {
          totalGames: 0, // We don't track this yet
          bestScore: spStats?.total_score || 0,
          totalCoins: currency?.single_player_coins || 0,
        },
        multiplayer: {
          totalGames: (mpStats?.wins || 0) + (mpStats?.losses || 0),
          wins: mpStats?.wins || 0,
          losses: mpStats?.losses || 0,
          bestScore: mpStats?.total_score || 0,
          totalCoins: currency?.multiplayer_coins || 0,
        },
      });

      setLoading(false);
    };

    fetchHistory();

    // Set up real-time subscription for new matches
    const channel = supabase
      .channel('game_history_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'multiplayer_matches',
          filter: `host_id=eq.${user.id}`,
        },
        () => fetchHistory()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'multiplayer_matches',
          filter: `opponent_id=eq.${user.id}`,
        },
        () => fetchHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { history, stats, loading };
};
