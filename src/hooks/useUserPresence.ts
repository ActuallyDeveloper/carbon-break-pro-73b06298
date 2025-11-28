import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface UserPresence {
  user_id: string;
  username: string;
  online: boolean;
  in_game?: boolean;
  room_id?: string;
}

export const useUserPresence = (userIds: string[] = []) => {
  const { user } = useAuth();
  const [presenceStates, setPresenceStates] = useState<Record<string, UserPresence>>({});
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('user_presence');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const formatted: Record<string, UserPresence> = {};
        
        Object.entries(state).forEach(([key, values]: [string, any]) => {
          const value = Array.isArray(values) ? values[0] : values;
          formatted[key] = {
            user_id: key,
            username: value.username || 'Unknown',
            online: true,
            in_game: value.in_game || false,
            room_id: value.room_id,
          };
        });
        
        setPresenceStates(formatted);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

          await presenceChannel.track({
            user_id: user.id,
            username: profile?.username || 'Unknown',
            online: true,
            in_game: false,
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  const updatePresence = async (updates: Partial<UserPresence>) => {
    if (!channel || !user) return;
    
    const currentState = presenceStates[user.id] || {};
    await channel.track({
      ...currentState,
      ...updates,
      user_id: user.id,
    });
  };

  const isUserOnline = (userId: string): boolean => {
    return !!presenceStates[userId]?.online;
  };

  const isUserInGame = (userId: string): boolean => {
    return !!presenceStates[userId]?.in_game;
  };

  return {
    presenceStates,
    updatePresence,
    isUserOnline,
    isUserInGame,
  };
};
