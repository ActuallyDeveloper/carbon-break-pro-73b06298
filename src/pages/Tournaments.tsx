import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const Tournaments = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: true });

      if (data) {
        setTournaments(data);
        
        // Fetch participant counts
        const counts = new Map();
        for (const tournament of data) {
          const { count } = await supabase
            .from("tournament_participants")
            .select("*", { count: "exact", head: true })
            .eq("tournament_id", tournament.id);
          counts.set(tournament.id, count || 0);
        }
        setParticipants(counts);
      }
    };

    fetchTournaments();
  }, []);

  const joinTournament = async (tournamentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tournament_participants")
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
        });

      if (error) throw error;
      toast.success("Joined tournament!");
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Already joined!");
      } else {
        toast.error(error.message || "Failed to join");
      }
    }
  };

  const statusColors: Record<string, string> = {
    upcoming: "text-muted-foreground",
    active: "text-foreground",
    completed: "text-muted-foreground",
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">TOURNAMENTS</h1>
          <p className="text-muted-foreground uppercase tracking-wider">Compete for Glory</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="border border-border p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold uppercase">{tournament.name}</h3>
                  <Trophy className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">{tournament.description}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(tournament.start_date).toLocaleDateString()} -{" "}
                    {new Date(tournament.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{participants.get(tournament.id) || 0} Participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  <span>{tournament.prize_pool} Coins Prize Pool</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className={`text-xs uppercase tracking-wider ${statusColors[tournament.status]}`}>
                  {tournament.status}
                </span>
                <Button
                  onClick={() => joinTournament(tournament.id)}
                  disabled={tournament.status !== "upcoming"}
                  size="sm"
                >
                  Join
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Tournaments;
