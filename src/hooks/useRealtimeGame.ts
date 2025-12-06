import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface GameUpdate {
  type: 'score' | 'lives' | 'status' | 'full';
  player1Score?: number;
  player2Score?: number;
  player1Lives?: number;
  player2Lives?: number;
  status?: string;
  timestamp: number;
}

export const useRealtimeGame = (roomId: string | null) => {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`game:${roomId}`);

    channel
      .on('broadcast', { event: 'game_update' }, ({ payload }) => {
        // Game updates are handled by listeners
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const broadcastGameUpdate = useCallback((update: Omit<GameUpdate, 'timestamp'>) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_update',
      payload: {
        ...update,
        userId: user.id,
        timestamp: Date.now(),
      },
    });
  }, [user]);

  const broadcastSpectatorUpdate = useCallback((state: any) => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_update',
      payload: { state },
    });
  }, []);

  return {
    isConnected,
    broadcastGameUpdate,
    broadcastSpectatorUpdate,
  };
};

// Hook for subscribing to any table changes
export const useRealtimeTableChanges = <T>(
  table: string,
  filter?: { column: string; value: string },
  callback?: (payload: T) => void
) => {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const channelName = `realtime-${table}-${filter?.value || 'all'}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        (payload) => {
          setData(payload.new as T);
          callback?.(payload.new as T);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter?.column, filter?.value, callback]);

  return data;
};

// Hook for currency updates
export const useRealtimeCurrencyUpdates = (userId: string | undefined) => {
  const [currency, setCurrency] = useState({
    singlePlayerCoins: 0,
    multiplayerCoins: 0,
  });

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    const fetchCurrency = async () => {
      const { data } = await supabase
        .from('user_currency')
        .select('single_player_coins, multiplayer_coins')
        .eq('user_id', userId)
        .single();

      if (data) {
        setCurrency({
          singlePlayerCoins: data.single_player_coins || 0,
          multiplayerCoins: data.multiplayer_coins || 0,
        });
      }
    };

    fetchCurrency();

    // Real-time subscription
    const channel = supabase
      .channel(`currency:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_currency',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          setCurrency({
            singlePlayerCoins: payload.new.single_player_coins || 0,
            multiplayerCoins: payload.new.multiplayer_coins || 0,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return currency;
};

// Hook for leaderboard updates
export const useRealtimeLeaderboardUpdates = (mode: 'single_player' | 'multiplayer') => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('leaderboard')
        .select(`
          *,
          profiles:user_id (username)
        `)
        .eq('mode', mode)
        .order('total_score', { ascending: false })
        .limit(100);

      if (data) setLeaderboard(data);
    };

    fetchLeaderboard();

    const channel = supabase
      .channel(`leaderboard:${mode}`)
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

  return leaderboard;
};

// Hook for friend activity
export const useRealtimeFriendActivity = () => {
  const { user } = useAuth();
  const [friendActivity, setFriendActivity] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('friend_activity');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activity: Record<string, any> = {};

        Object.entries(state).forEach(([key, values]: [string, any]) => {
          const value = Array.isArray(values) ? values[0] : values;
          activity[key] = {
            userId: key,
            username: value.username,
            online: true,
            inGame: value.in_game,
            roomId: value.room_id,
            lastSeen: Date.now(),
          };
        });

        setFriendActivity(activity);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return friendActivity;
};

// Hook for game room updates
export const useRealtimeRoomUpdates = (roomId: string | null) => {
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const fetchData = async () => {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomData) setRoom(roomData);

      const { data: playersData } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      if (playersData) setPlayers(playersData);
    };

    fetchData();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { room, players };
};
