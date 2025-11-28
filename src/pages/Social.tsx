import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Check, X, Users, Mail, Send, Circle, Gamepad2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFriends } from "@/hooks/useFriends";
import { useUserPresence } from "@/hooks/useUserPresence";
import { toast } from "sonner";

const Social = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const {
    friends,
    pendingRequests,
    receivedRequests,
    gameInvites,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    deleteConnection,
    respondToGameInvite,
    getFriendProfile,
  } = useFriends();

  const { presenceStates, isUserOnline, isUserInGame } = useUserPresence();

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${searchQuery}%`)
      .neq("id", user?.id || "")
      .limit(5);

    setSearchResults(data || []);
  };

  const handleAcceptInvite = async (inviteId: string, roomId: string) => {
    await respondToGameInvite(inviteId, true);
    navigate(`/multiplayer`); // Navigate to multiplayer page which will show the room
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">SOCIAL</h1>
          <p className="text-muted-foreground uppercase tracking-wider">Connect with Players</p>
        </div>

        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends">
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="received">
              Requests ({receivedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="invites">
              Invites ({gameInvites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold uppercase">Find Players</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Search username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  className="uppercase"
                />
                <Button onClick={searchUsers}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <Card key={result.id} className="p-4 flex items-center justify-between">
                      <span className="font-medium">{result.username}</span>
                      <Button size="sm" onClick={() => sendFriendRequest(result.id)}>
                        Add Friend
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                <h2 className="text-2xl font-bold uppercase">Your Friends</h2>
              </div>

              <div className="space-y-2">
                {friends.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No friends yet</p>
                  </Card>
                ) : (
                  friends.map((connection) => {
                    const profile = getFriendProfile(connection);
                    const friendId = connection.friend_id;
                    const online = isUserOnline(friendId);
                    const inGame = isUserInGame(friendId);
                    
                    return (
                      <Card key={connection.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Circle 
                              className={`h-3 w-3 ${online ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'}`}
                            />
                          </div>
                          <span className="font-medium">{profile?.username}</span>
                          {inGame && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Gamepad2 className="h-3 w-3" />
                              In Game
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => deleteConnection(connection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold uppercase flex items-center gap-2">
                <Mail className="h-6 w-6" />
                Friend Requests
              </h2>
              {receivedRequests.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </Card>
              ) : (
                receivedRequests.map((request) => {
                  const profile = request.user;
                  return (
                    <Card key={request.id} className="p-4 flex items-center justify-between">
                      <span className="font-medium">{profile?.username}</span>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => acceptFriendRequest(request.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => rejectFriendRequest(request.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold uppercase flex items-center gap-2">
                <Send className="h-6 w-6" />
                Sent Requests
              </h2>
              {pendingRequests.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </Card>
              ) : (
                pendingRequests.map((request) => {
                  const profile = request.friend;
                  return (
                    <Card key={request.id} className="p-4 flex items-center justify-between">
                      <span className="font-medium">{profile?.username}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteConnection(request.id)}
                      >
                        Cancel
                      </Button>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold uppercase">Game Invites</h2>
              {gameInvites.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No game invites</p>
                </Card>
              ) : (
                gameInvites.map((invite) => (
                  <Card key={invite.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{invite.sender?.username}</p>
                        <p className="text-sm text-muted-foreground">
                          Room: {invite.room?.room_code} • {invite.room?.game_mode}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleAcceptInvite(invite.id, invite.room_id)}
                      >
                        Accept & Join
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => respondToGameInvite(invite.id, false)}
                      >
                        Decline
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Social;
