import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Gamepad2, Send, Zap } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { Difficulty } from '@/types/game';

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: (gameMode: string, maxPlayers: number, difficulty: Difficulty) => Promise<string | null>;
  loading?: boolean;
}

const GAME_MODES = [
  { id: 'classic', name: 'Classic', description: 'Standard brick breaker gameplay' },
  { id: 'speed', name: 'Speed Rush', description: 'Faster ball speed, more challenge' },
  { id: 'survival', name: 'Survival', description: 'One life, highest score wins' },
  { id: 'time_attack', name: 'Time Attack', description: '2 minute time limit' },
];

const DIFFICULTIES = [
  { id: 'easy', name: 'Easy', description: 'Slower ball, wider paddle' },
  { id: 'medium', name: 'Medium', description: 'Balanced gameplay' },
  { id: 'hard', name: 'Hard', description: 'Fast ball, narrow paddle' },
];

export const CreateRoomModal = ({ open, onOpenChange, onCreateRoom, loading }: CreateRoomModalProps) => {
  const { friends, sendGameInvite } = useFriends();
  const [gameMode, setGameMode] = useState('classic');
  const [maxPlayers, setMaxPlayers] = useState('2');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const handleCreate = async () => {
    const roomId = await onCreateRoom(gameMode, parseInt(maxPlayers), difficulty);
    if (roomId) {
      setCreatedRoomId(roomId);
    }
  };

  const handleSendInvites = async () => {
    if (!createdRoomId) return;
    
    for (const friendId of selectedFriends) {
      await sendGameInvite(friendId, createdRoomId);
    }
    
    onOpenChange(false);
    setCreatedRoomId(null);
    setSelectedFriends([]);
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            {createdRoomId ? 'Room Created!' : 'Create Game Room'}
          </DialogTitle>
        </DialogHeader>

        {!createdRoomId ? (
          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium uppercase tracking-wider">Game Mode</Label>
              <RadioGroup value={gameMode} onValueChange={setGameMode} className="space-y-2">
                {GAME_MODES.map((mode) => (
                  <div
                    key={mode.id}
                    className={`flex items-center space-x-3 border p-3 rounded-lg cursor-pointer transition-colors ${
                      gameMode === mode.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => setGameMode(mode.id)}
                  >
                    <RadioGroupItem value={mode.id} id={mode.id} />
                    <div className="flex-1">
                      <Label htmlFor={mode.id} className="font-medium cursor-pointer">
                        {mode.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">{mode.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Difficulty
              </Label>
              <RadioGroup value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)} className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((diff) => (
                  <div
                    key={diff.id}
                    className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-colors text-center ${
                      difficulty === diff.id ? 'border-2 border-primary bg-primary/5' : 'border border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => setDifficulty(diff.id as Difficulty)}
                  >
                    <RadioGroupItem value={diff.id} id={`diff-${diff.id}`} className="sr-only" />
                    <Label htmlFor={`diff-${diff.id}`} className="font-medium cursor-pointer text-sm">
                      {diff.name}
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-1">{diff.description}</p>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium uppercase tracking-wider">Max Players</Label>
              <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Players</SelectItem>
                  <SelectItem value="3">3 Players</SelectItem>
                  <SelectItem value="4">4 Players</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreate} className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Room Code</p>
              <p className="text-4xl font-bold tracking-widest">{roomCode || '----'}</p>
              <p className="text-xs text-muted-foreground mt-2">Share this code with friends</p>
            </div>

            {acceptedFriends.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Invite Friends
                </Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {acceptedFriends.map((friend) => {
                    const profile = friend.friend || friend.user;
                    if (!profile) return null;
                    
                    return (
                      <div
                        key={friend.id}
                        className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors ${
                          selectedFriends.includes(profile.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-accent'
                        }`}
                        onClick={() => toggleFriendSelection(profile.id)}
                      >
                        <span className="text-sm font-medium">{profile.username}</span>
                        {selectedFriends.includes(profile.id) && (
                          <span className="text-xs text-primary">Selected</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1"
              >
                Done
              </Button>
              {selectedFriends.length > 0 && (
                <Button onClick={handleSendInvites} className="flex-1 gap-2">
                  <Send className="h-4 w-4" />
                  Send Invites
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
