import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Check, X, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const Social = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      const { data } = await supabase
        .from("social_connections")
        .select("*, friend:profiles!social_connections_friend_id_fkey(id, username, avatar_url)")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      setFriends(data || []);
    };

    fetchFriends();
  }, [user]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${searchQuery}%`)
      .limit(5);

    setSearchResults(data || []);
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("social_connections")
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: "pending",
        });

      if (error) throw error;
      toast.success("Friend request sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send request");
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">SOCIAL</h1>
          <p className="text-muted-foreground uppercase tracking-wider">Connect with Players</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

            <div className="space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="border border-border p-4 flex items-center justify-between hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{result.username}</span>
                  <Button size="sm" onClick={() => sendFriendRequest(result.id)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <h2 className="text-2xl font-bold uppercase">Friends ({friends.length})</h2>
            </div>

            <div className="space-y-2">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">No friends yet</p>
              ) : (
                friends.map((connection) => (
                  <div
                    key={connection.id}
                    className="border border-border p-4 flex items-center justify-between"
                  >
                    <span className="font-medium">{connection.friend?.username}</span>
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Social;
