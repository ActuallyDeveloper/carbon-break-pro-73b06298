import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Users, Plus, Search, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const Multiplayer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchMatches = async () => {
      const { data } = await supabase
        .from("multiplayer_matches")
        .select("*, host:profiles!multiplayer_matches_host_id_fkey(username), opponent:profiles!multiplayer_matches_opponent_id_fkey(username)")
        .or(`host_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10);

      setMatches(data || []);
    };

    fetchMatches();

    const channel = supabase
      .channel("multiplayer_matches_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "multiplayer_matches",
        },
        () => fetchMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createMatch = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("multiplayer_matches")
        .insert({
          host_id: user.id,
          status: "waiting",
        });

      if (error) throw error;
      toast.success("Match created! Waiting for opponent...");
    } catch (error: any) {
      toast.error(error.message || "Failed to create match");
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">MULTIPLAYER</h1>
            <p className="text-muted-foreground uppercase tracking-wider">Real-time Battles</p>
          </div>
          <Button onClick={createMatch} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Match
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <h3 className="text-xl font-bold uppercase">Find Match</h3>
            </div>
            <Button className="w-full">
              Quick Match
            </Button>
          </div>

          <div className="border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h3 className="text-xl font-bold uppercase">Your Matches</h3>
            </div>
            <div className="space-y-2">
              {matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matches yet</p>
              ) : (
                matches.map((match) => (
                  <div
                    key={match.id}
                    className="border border-border p-3 space-y-2 hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {match.host?.username} vs {match.opponent?.username || "Waiting..."}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">
                        {match.status}
                      </span>
                    </div>
                    {match.status === "completed" && (
                      <div className="text-xs text-muted-foreground">
                        {match.host_score} - {match.opponent_score}
                      </div>
                    )}
                    {match.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => navigate(`/multiplayer/${match.id}`)}
                      >
                        <Play className="h-4 w-4" />
                        Join Match
                      </Button>
                    )}
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

export default Multiplayer;
