import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface RealtimeGameState {
  ballX: number;
  ballY: number;
  paddleX: number;
  paddleY: number;
  score: number;
  timestamp: number;
}

export const useRealtimeMatch = (matchId: string | null) => {
  const { user } = useAuth();
  const [opponentState, setOpponentState] = useState<RealtimeGameState | null>(null);
  const channelRef = useRef<any>(null);
  const lastBroadcastRef = useRef<number>(0);

  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase.channel(`match:${matchId}`);

    channel
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setOpponentState(payload.state);
        }
      })
      .on('broadcast', { event: 'paddle_move' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setOpponentState(prev => prev ? { ...prev, paddleX: payload.paddleX, timestamp: payload.timestamp } : null);
        }
      })
      .on('broadcast', { event: 'score_update' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setOpponentState(prev => prev ? { ...prev, score: payload.score, timestamp: payload.timestamp } : null);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  const broadcastGameState = (state: RealtimeGameState) => {
    if (!channelRef.current || !user) return;

    // Throttle broadcasts to max 30 times per second
    const now = Date.now();
    if (now - lastBroadcastRef.current < 33) return;
    lastBroadcastRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_state',
      payload: {
        userId: user.id,
        state: { ...state, timestamp: now },
      },
    });
  };

  const broadcastPaddleMove = (paddleX: number) => {
    if (!channelRef.current || !user) return;

    const now = Date.now();
    if (now - lastBroadcastRef.current < 50) return; // Max 20 updates per second for paddle
    lastBroadcastRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'paddle_move',
      payload: {
        userId: user.id,
        paddleX,
        timestamp: now,
      },
    });
  };

  const broadcastScoreUpdate = (score: number) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'score_update',
      payload: {
        userId: user.id,
        score,
        timestamp: Date.now(),
      },
    });
  };

  return {
    opponentState,
    broadcastGameState,
    broadcastPaddleMove,
    broadcastScoreUpdate,
  };
};
