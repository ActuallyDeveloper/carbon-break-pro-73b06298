import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      const { data } = await supabase
        .from("social_connections")
        .select("*, friend:profiles!social_connections_friend_id_fkey(id, username)")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      setFriends(data || []);
    };

    fetchFriends();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedFriend) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, sender:profiles!chat_messages_sender_id_fkey(username)")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`sender_id.eq.${selectedFriend},receiver_id.eq.${selectedFriend}`)
        .order("created_at", { ascending: true });

      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel("chat_messages_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        () => fetchMessages()
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
          message: newMessage,
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-16rem)]">
        <div className="grid grid-cols-4 gap-4 h-full">
          <div className="border border-border p-4 space-y-2 overflow-y-auto">
            <h2 className="text-lg font-bold uppercase mb-4">Friends</h2>
            {friends.map((connection) => (
              <button
                key={connection.id}
                onClick={() => setSelectedFriend(connection.friend_id)}
                className={`w-full p-3 text-left border border-border hover:bg-accent transition-colors ${
                  selectedFriend === connection.friend_id ? "bg-accent" : ""
                }`}
              >
                {connection.friend?.username}
              </button>
            ))}
          </div>

          <div className="col-span-3 border border-border flex flex-col">
            {selectedFriend ? (
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === user?.id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs p-3 border border-border ${
                          message.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-accent"
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground uppercase tracking-wider">
                  Select a friend to chat
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
