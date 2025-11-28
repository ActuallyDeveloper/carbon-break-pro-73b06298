import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useFriends } from '@/hooks/useFriends';
import { Users, Crown, Check, X, Send, Play, LogOut } from 'lucide-react';

interface RoomPlayer {
  id: string;
  user_id: string;
  player_number: number;
  score: number;
  is_ready: boolean;
  player?: { username: string };
}

interface GameRoom {
  id: string;
  room_code: string;
  host_id: string;
  game_mode: string;
  max_players: number;
  current_players: number;
  status: string;
}

interface RoomLobbyProps {
  room: GameRoom;
  players: RoomPlayer[];
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onNavigateToGame: () => void;
}

export const RoomLobby = ({ room, players, onStartGame, onLeaveRoom, onNavigateToGame }: RoomLobbyProps) => {
  const { user } = useAuth();
  const { friends, sendGameInvite } = useFriends();
  const isHost = user?.id === room.host_id;
  const canStart = players.length >= 2 && isHost;
  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  const handleInviteFriend = async (friendId: string) => {
    await sendGameInvite(friendId, room.id);
  };

  const getFriendProfile = (friend: any) => {
    if (friend.user_id === user?.id) {
      return friend.friend;
    }
    return friend.user;
  };

  if (room.status === 'in_progress') {
    return (
      <Card className="p-6 space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Game Started!</h3>
          <p className="text-muted-foreground mb-4">The game is ready to play</p>
          <Button onClick={onNavigateToGame} className="gap-2">
            <Play className="h-4 w-4" />
            Join Game
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Room Code</p>
            <p className="text-3xl font-bold tracking-widest">{room.room_code}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Mode</p>
            <p className="font-medium capitalize">{room.game_mode.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{players.length} / {room.max_players} Players</span>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold uppercase text-sm tracking-wider mb-4">Players</h3>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {player.user_id === room.host_id && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
                <span className="font-medium">
                  {player.player?.username || `Player ${player.player_number}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  #{player.player_number}
                </span>
              </div>
              {player.is_ready ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <span className="text-xs text-muted-foreground">Waiting...</span>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: room.max_players - players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center p-3 border border-dashed rounded-lg text-muted-foreground"
            >
              Waiting for player...
            </div>
          ))}
        </div>
      </Card>

      {acceptedFriends.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold uppercase text-sm tracking-wider mb-4">Invite Friends</h3>
          <div className="space-y-2">
            {acceptedFriends.slice(0, 5).map((friend) => {
              const profile = getFriendProfile(friend);
              if (!profile) return null;
              
              const isInRoom = players.some(p => p.user_id === profile.id);
              
              return (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span className="text-sm">{profile.username}</span>
                  {isInRoom ? (
                    <span className="text-xs text-green-500">In Room</span>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleInviteFriend(profile.id)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onLeaveRoom} className="gap-2">
          <LogOut className="h-4 w-4" />
          Leave Room
        </Button>
        
        {isHost && (
          <Button 
            onClick={onStartGame} 
            disabled={!canStart}
            className="flex-1 gap-2"
          >
            <Play className="h-4 w-4" />
            {canStart ? 'Start Game' : `Need ${2 - players.length} more player(s)`}
          </Button>
        )}
      </div>
    </div>
  );
};
