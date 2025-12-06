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
          const newData = payload.new as Record<string, unknown>;
          if (newData) {
            setSinglePlayerCoins((newData.single_player_coins as number) || 0);
            setMultiplayerCoins((newData.multiplayer_coins as number) || 0);
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
  const [leaderboard, setLeaderboard] = useState<Record<string, unknown>[]>([]);
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
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([]);
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

// Realtime friends/social
export function useRealtimeFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Record<string, unknown>[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      const { data: connections } = await supabase
        .from('social_connections')
        .select(`
          *,
          friend:profiles!social_connections_friend_id_fkey(id, username, avatar_url),
          user:profiles!social_connections_user_id_fkey(id, username, avatar_url)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendsList = (connections || []).map((conn: Record<string, unknown>) => {
        return conn.user_id === user.id ? conn.friend : conn.user;
      }) as Record<string, unknown>[];
      setFriends(friendsList);

      const { data: pending } = await supabase
        .from('social_connections')
        .select(`
          *,
          user:profiles!social_connections_user_id_fkey(id, username, avatar_url)
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      setPendingRequests(pending || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchFriends();

    channelRef.current = supabase
      .channel(`friends_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_connections',
        },
        () => {
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, fetchFriends]);

  return { friends, pendingRequests, loading, refetch: fetchFriends };
}

// Realtime game invites
export function useRealtimeGameInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchInvites = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('game_invites')
        .select(`
          *,
          room:game_rooms(*)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setInvites(data || []);
    } catch (err) {
      console.error('Error fetching invites:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchInvites();

    channelRef.current = supabase
      .channel(`invites_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invites',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchInvites();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, fetchInvites]);

  return { invites, loading, refetch: fetchInvites };
}

// Realtime chat messages
export function useRealtimeMessages(friendId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user || !friendId) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [user, friendId]);

  useEffect(() => {
    if (!user || !friendId) return;

    fetchMessages();

    channelRef.current = supabase
      .channel(`messages_${user.id}_${friendId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as Record<string, unknown>;
          if (
            (newMessage.sender_id === user.id && newMessage.receiver_id === friendId) ||
            (newMessage.sender_id === friendId && newMessage.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, friendId, fetchMessages]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!user || !friendId) return;

      await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: friendId,
        message,
      });
    },
    [user, friendId]
  );

  return { messages, loading, sendMessage, refetch: fetchMessages };
}

// Realtime room players
export function useRealtimeRoomPlayers(roomId: string | null) {
  const [players, setPlayers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchPlayers = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('room_players')
        .select(`
          *,
          profile:profiles(id, username, avatar_url)
        `)
        .eq('room_id', roomId)
        .order('player_number', { ascending: true });

      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    fetchPlayers();

    channelRef.current = supabase
      .channel(`room_players_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, fetchPlayers]);

  return { players, loading, refetch: fetchPlayers };
}

// Realtime inventory
export function useRealtimeInventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_inventory')
        .select(`
          *,
          item:shop_items(*)
        `)
        .eq('user_id', user.id);

      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchInventory();

    channelRef.current = supabase
      .channel(`inventory_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_inventory',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, fetchInventory]);

  return { inventory, loading, refetch: fetchInventory };
}

// Realtime achievements
export function useRealtimeAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Record<string, unknown>[]>([]);
  const [userAchievements, setUserAchievements] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [allAchievements, userProgress] = await Promise.all([
        supabase.from('achievements').select('*'),
        supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', user.id),
      ]);

      setAchievements(allAchievements.data || []);
      setUserAchievements(userProgress.data || []);
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchAchievements();

    channelRef.current = supabase
      .channel(`achievements_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, fetchAchievements]);

  return { achievements, userAchievements, loading, refetch: fetchAchievements };
}
