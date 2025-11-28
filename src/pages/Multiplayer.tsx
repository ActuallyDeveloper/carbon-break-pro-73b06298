import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Users, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameRooms } from "@/hooks/useGameRooms";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { JoinRoomModal } from "@/components/JoinRoomModal";
import { RoomLobby } from "@/components/RoomLobby";

const Multiplayer = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const {
    currentRoom,
    roomPlayers,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    quickMatch,
  } = useGameRooms();

  const handleCreateRoom = async (gameMode: string, maxPlayers: number) => {
    const roomId = await createRoom(gameMode, maxPlayers);
    if (roomId) {
      setShowCreateModal(false);
    }
    return roomId;
  };

  const handleJoinRoom = async (roomCode: string) => {
    const roomId = await joinRoom(roomCode);
    if (roomId) {
      setShowJoinModal(false);
    }
    return roomId;
  };

  const handleStartGame = async () => {
    const roomId = await startGame();
    if (roomId) {
      navigate(`/multiplayer/game/${roomId}`);
    }
  };

  const handleQuickMatch = async () => {
    const roomId = await quickMatch();
    if (roomId) {
      // Room lobby will show automatically via currentRoom state
    }
  };

  const handleNavigateToGame = () => {
    if (currentRoom) {
      navigate(`/multiplayer/game/${currentRoom.id}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {!currentRoom ? (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">MULTIPLAYER</h1>
                <p className="text-muted-foreground uppercase tracking-wider">Real-time Battles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => setShowCreateModal(true)} 
                className="h-32 flex-col gap-3"
                disabled={loading}
              >
                <Plus className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-bold">Create Room</div>
                  <div className="text-xs opacity-80">Host a new game</div>
                </div>
              </Button>

              <Button 
                onClick={() => setShowJoinModal(true)} 
                className="h-32 flex-col gap-3"
                disabled={loading}
              >
                <Users className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-bold">Join Room</div>
                  <div className="text-xs opacity-80">Enter room code</div>
                </div>
              </Button>

              <Button 
                onClick={handleQuickMatch} 
                className="h-32 flex-col gap-3"
                disabled={loading}
              >
                <Search className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-bold">Quick Match</div>
                  <div className="text-xs opacity-80">Find a game fast</div>
                </div>
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">GAME LOBBY</h1>
              <p className="text-muted-foreground uppercase tracking-wider">Waiting for players</p>
            </div>
            
            <RoomLobby
              room={currentRoom}
              players={roomPlayers}
              onStartGame={handleStartGame}
              onLeaveRoom={leaveRoom}
              onNavigateToGame={handleNavigateToGame}
            />
          </div>
        )}
      </div>

      <CreateRoomModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateRoom={handleCreateRoom}
        loading={loading}
      />

      <JoinRoomModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onJoinRoom={handleJoinRoom}
        loading={loading}
      />
    </Layout>
  );
};

export default Multiplayer;
