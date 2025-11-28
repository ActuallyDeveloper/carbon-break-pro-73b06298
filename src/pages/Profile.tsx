import { Layout } from "@/components/Layout";
import { Trophy, Target, Award, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [currency, setCurrency] = useState<any>(null);
  const [stats, setStats] = useState<any>({ singlePlayer: null, multiplayer: null });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const [
        { data: profileData },
        { data: currencyData },
        { data: spStats },
        { data: mpStats },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_currency").select("*").eq("user_id", user.id).single(),
        supabase.from("leaderboard").select("*").eq("user_id", user.id).eq("mode", "single_player").single(),
        supabase.from("leaderboard").select("*").eq("user_id", user.id).eq("mode", "multiplayer").single(),
      ]);

      setProfile(profileData);
      setCurrency(currencyData);
      setStats({ singlePlayer: spStats, multiplayer: mpStats });
    };

    fetchProfile();
  }, [user]);

  if (!profile) return null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{profile.username}</h1>
          <p className="text-muted-foreground uppercase tracking-wider">Player Profile</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border p-6 space-y-4">
            <h2 className="text-2xl font-bold uppercase">Currency</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground uppercase">Single Player Coins</span>
                <span className="text-xl font-bold">{currency?.single_player_coins || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground uppercase">Multiplayer Coins</span>
                <span className="text-xl font-bold">{currency?.multiplayer_coins || 0}</span>
              </div>
            </div>
          </div>

          <div className="border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              <h2 className="text-2xl font-bold uppercase">Achievements</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square border border-border flex items-center justify-center">
                  <Award className="h-8 w-8 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6" />
              <h2 className="text-2xl font-bold uppercase">Single Player Stats</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground uppercase">Total Score</span>
                <span className="font-bold">{stats.singlePlayer?.total_score || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground uppercase">Rank</span>
                <span className="font-bold">#{stats.singlePlayer?.rank || "-"}</span>
              </div>
            </div>
          </div>

          <div className="border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              <h2 className="text-2xl font-bold uppercase">Multiplayer Stats</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground uppercase">Wins</span>
                <span className="font-bold">{stats.multiplayer?.wins || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground uppercase">Losses</span>
                <span className="font-bold">{stats.multiplayer?.losses || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground uppercase">Rank</span>
                <span className="font-bold">#{stats.multiplayer?.rank || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
