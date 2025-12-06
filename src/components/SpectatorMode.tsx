import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Eye, Users, ArrowLeft, MessageSquare, Send, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SpectatorMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  timestamp: number;
}

interface GameState {
  player1Score: number;
  player2Score: number;
  player1Lives: number;
  player2Lives: number;
  status: string;
}

interface Player {
  id: string;
  user_id: string;
  username: string;
  player_number: number;
  score: number;
}

export const SpectatorMode = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [spectators, setSpectators] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    player1Score: 0,
    player2Score: 0,
    player1Lives: 3,
    player2Lives: 3,
    status: 'waiting',
  });
  const [messages, setMessages] = useState<SpectatorMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const channelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId || !user) return;

    const fetchRoomData = async () => {
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

      if (playersData) {
        const playersWithUsernames = await Promise.all(
          playersData.map(async (player) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', player.user_id)
              .single();
            return { ...player, username: profile?.username || 'Unknown' };
          })
        );
        setPlayers(playersWithUsernames);
      }
    };

    fetchRoomData();

    // Subscribe to real-time updates
    const channel = supabase.channel(`spectator:${roomId}`);

    channel
      .on('broadcast', { event: 'game_update' }, ({ payload }) => {
        setGameState(payload.state);
      })
      .on('broadcast', { event: 'spectator_message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const spectatorList: string[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.role === 'spectator') {
              spectatorList.push(p.username);
            }
          });
        });
        setSpectators(spectatorList);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

          await channel.track({
            user_id: user.id,
            username: profile?.username || 'Unknown',
            role: 'spectator',
          });
        }
      });

    channelRef.current = channel;

    // Subscribe to room updates
    const roomSubscription = supabase
      .channel(`room-updates:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(payload.new);
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
        async () => {
          // Refetch players
          const { data: playersData } = await supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomId);

          if (playersData) {
            const playersWithUsernames = await Promise.all(
              playersData.map(async (player) => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', player.user_id)
                  .single();
                return { ...player, username: profile?.username || 'Unknown' };
              })
            );
            setPlayers(playersWithUsernames);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(roomSubscription);
    };
  }, [roomId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !channelRef.current) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const message: SpectatorMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      username: profile?.username || 'Unknown',
      message: newMessage.trim(),
      timestamp: Date.now(),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'spectator_message',
      payload: message,
    });

    setNewMessage('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500/20 text-yellow-500';
      case 'active': return 'bg-green-500/20 text-green-500';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading match...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Eye className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Spectator Mode</h1>
            </div>
            <Badge className={getStatusColor(room.status)}>
              {room.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{spectators.length} watching</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          {/* Main Game View */}
          <div className="lg:col-span-3 space-y-4">
            {/* Players Score Display */}
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Player 1 */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {players[0]?.user_id === room.host_id && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-bold text-lg">
                      {players[0]?.username || 'Player 1'}
                    </span>
                  </div>
                  <div className="text-4xl font-bold">{gameState.player1Score}</div>
                  <div className="flex justify-center gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-xl ${i < gameState.player1Lives ? 'text-red-500' : 'text-muted'}`}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>
                </div>

                {/* VS */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">VS</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Room: {room.room_code}
                  </div>
                </div>

                {/* Player 2 */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-bold text-lg">
                      {players[1]?.username || 'Player 2'}
                    </span>
                    {players[1]?.user_id === room.host_id && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-4xl font-bold">{gameState.player2Score}</div>
                  <div className="flex justify-center gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-xl ${i < gameState.player2Lives ? 'text-red-500' : 'text-muted'}`}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Game Canvas Placeholder */}
            <Card className="aspect-video flex items-center justify-center bg-muted/50">
              <div className="text-center space-y-4">
                <Eye className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-bold text-lg">
                    {room.status === 'waiting' ? 'Waiting for game to start...' : 
                     room.status === 'completed' ? 'Game has ended' : 
                     'Watching live game...'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time game view updates automatically
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - Chat & Spectators */}
          <div className="space-y-4">
            {/* Spectators List */}
            <Card className="p-4">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Spectators ({spectators.length})
              </h3>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {spectators.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>{name}</span>
                    </div>
                  ))}
                  {spectators.length === 0 && (
                    <p className="text-sm text-muted-foreground">No spectators yet</p>
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Chat */}
            <Card className="p-4 flex flex-col h-80">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Spectator Chat
              </h3>
              
              <ScrollArea className="flex-1 mb-3">
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-medium">{msg.username}: </span>
                      <span className="text-muted-foreground">{msg.message}</span>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No messages yet
                    </p>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button size="icon" onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectatorMode;
