import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { RealtimeChannel } from '@supabase/supabase-js';

// Hook for realtime currency
export function useRealtimeCurrency() {
  const { user } = useAuth();
  const [singlePlayerCoins, setSinglePlayerCoins] = useState(0);
  const [multiplayerCoins, setMultiplayerCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCurrency = async () => {
      const { data } = await supabase
        .from('user_currency')
        .select('single_player_coins, multiplayer_coins')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setSinglePlayerCoins(data.single_player_coins || 0);
        setMultiplayerCoins(data.multiplayer_coins || 0);
      }
      setLoading(false);
    };

    fetchCurrency();

    const channel = supabase
      .channel(`currency_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_currency',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData) {
            setSinglePlayerCoins(newData.single_player_coins || 0);
            setMultiplayerCoins(newData.multiplayer_coins || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { singlePlayerCoins, multiplayerCoins, loading };
}

// Hook for realtime leaderboard
export function useRealtimeLeaderboard(mode: 'single_player' | 'multiplayer') {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('leaderboard')
        .select(`
          *,
          profile:profiles(username, avatar_url)
        `)
        .eq('mode', mode)
        .order('total_score', { ascending: false })
        .limit(100);
      
      setLeaderboard(data || []);
      setLoading(false);
    };

    fetchLeaderboard();

    const channel = supabase
      .channel(`leaderboard_${mode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard',
          filter: `mode=eq.${mode}`,
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode]);

  return { leaderboard, loading };
}

// Hook for realtime game rooms
export function useRealtimeGameRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('*')
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false });
      
      setRooms(data || []);
      setLoading(false);
    };

    fetchRooms();

    const channel = supabase
      .channel('game_rooms_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { rooms, loading };
}