import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { GameState } from '@/types/game';

export const useRealtimeMatch = (matchId: string | null) => {
  const { user } = useAuth();
  const [opponentState, setOpponentState] = useState<GameState | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase.channel(`match:${matchId}`);

    channel
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setOpponentState(payload.state);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  const broadcastGameState = (state: GameState) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_state',
      payload: {
        userId: user.id,
        state,
      },
    });
  };

  return {
    opponentState,
    broadcastGameState,
  };
};
