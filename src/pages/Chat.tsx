import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Circle, Search, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
  sender?: { username: string };
}

interface Friend {
  id: string;
  friend_id: string;
  user_id: string;
  status: string;
  friend?: { id: string; username: string };
  user?: { id: string; username: string };
}

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [selectedFriendName, setSelectedFriendName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      const { data } = await supabase
        .from("social_connections")
        .select(`
          id, friend_id, user_id, status,
          friend:profiles!social_connections_friend_id_fkey(id, username),
          user:profiles!social_connections_user_id_fkey(id, username)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      setFriends(data || []);

      // Fetch unread message counts
      if (data) {
        const counts: Record<string, number> = {};
        for (const friend of data) {
          const friendId = friend.user_id === user.id ? friend.friend_id : friend.user_id;
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", friendId)
            .eq("receiver_id", user.id)
            .eq("read", false);
          counts[friendId] = count || 0;
        }
        setUnreadCounts(counts);
      }
    };

    fetchFriends();

    // Subscribe to friend updates
    const friendChannel = supabase
      .channel("friends_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "social_connections",
        },
        () => fetchFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedFriend) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, sender:profiles!chat_messages_sender_id_fkey(username)")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriend}),and(sender_id.eq.${selectedFriend},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from("chat_messages")
        .update({ read: true })
        .eq("sender_id", selectedFriend)
        .eq("receiver_id", user.id)
        .eq("read", false);

      setUnreadCounts(prev => ({ ...prev, [selectedFriend]: 0 }));
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_${user.id}_${selectedFriend}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === selectedFriend) ||
            (newMsg.sender_id === selectedFriend && newMsg.receiver_id === user.id)
          ) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFriend || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend,
          message: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  };

  const getFriendProfile = (friend: Friend) => {
    if (friend.user_id === user?.id) {
      return friend.friend;
    }
    return friend.user;
  };

  const selectFriend = (friendId: string, friendName: string) => {
    setSelectedFriend(friendId);
    setSelectedFriendName(friendName);
  };

  const filteredFriends = friends.filter(friend => {
    const profile = getFriendProfile(friend);
    return profile?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
          {/* Friends List */}
          <div className="bg-card p-4 space-y-4 overflow-hidden flex flex-col">
            <div className="space-y-3">
              <h2 className="text-lg font-bold uppercase">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredFriends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No friends yet. Add friends to start chatting!
                </p>
              ) : (
                filteredFriends.map((connection) => {
                  const profile = getFriendProfile(connection);
                  if (!profile) return null;
                  const friendId = profile.id;
                  const unread = unreadCounts[friendId] || 0;

                  return (
                    <button
                      key={connection.id}
                      onClick={() => selectFriend(friendId, profile.username)}
                      className={`w-full p-3 text-left flex items-center justify-between hover:bg-accent transition-colors ${
                        selectedFriend === friendId ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-primary/10 flex items-center justify-center font-bold text-sm">
                            {profile.username.charAt(0).toUpperCase()}
                          </div>
                          <Circle
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current ${
                              onlineStatus[friendId] ? "text-green-500" : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <span className="font-medium truncate">{profile.username}</span>
                      </div>
                      {unread > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 font-bold">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="col-span-1 md:col-span-3 bg-card flex flex-col overflow-hidden">
            {selectedFriend ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-accent/50 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 flex items-center justify-center font-bold">
                    {selectedFriendName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedFriendName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {onlineStatus[selectedFriend] ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Send a message to start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 ${
                              isOwn 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-accent"
                            }`}
                          >
                            <p className="text-sm break-words">{message.message}</p>
                            <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {format(new Date(message.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-4 bg-accent/30 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a friend to chat</p>
                <p className="text-sm">Your conversations will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;