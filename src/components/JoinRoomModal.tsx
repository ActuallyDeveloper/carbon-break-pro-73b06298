import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DoorOpen } from 'lucide-react';

interface JoinRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinRoom: (roomCode: string) => Promise<string | null>;
  loading?: boolean;
}

export const JoinRoomModal = ({ open, onOpenChange, onJoinRoom, loading }: JoinRoomModalProps) => {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (roomCode.length !== 4) {
      setError('Room code must be 4 characters');
      return;
    }

    setError('');
    const roomId = await onJoinRoom(roomCode);
    
    if (roomId) {
      onOpenChange(false);
      setRoomCode('');
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric, max 4 chars, uppercase
    const filtered = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
    setRoomCode(filtered);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Join Game Room
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium uppercase tracking-wider">Room Code</Label>
            <Input
              value={roomCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="XXXX"
              className="text-center text-2xl tracking-[0.5em] uppercase font-mono"
              maxLength={4}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground text-center">
              Enter the 4-character room code
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleJoin} 
              className="flex-1"
              disabled={loading || roomCode.length !== 4}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
