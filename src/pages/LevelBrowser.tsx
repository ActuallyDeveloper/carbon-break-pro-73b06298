import { Layout } from "@/components/Layout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Heart, Play, Search, TrendingUp, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { LevelPlayer } from "@/components/LevelPlayer";

interface Level {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  creator_name: string;
  creator_id: string;
  plays: number;
  likes: number;
  average_rating: number;
  rating_count: number;
  favorite_count: number;
  level_data: any;
  created_at: string;
}

const LevelBrowser = () => {
  const { user } = useAuth();
  const [levels, setLevels] = useState<Level[]>([]);
  const [filteredLevels, setFilteredLevels] = useState<Level[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');

  useEffect(() => {
    fetchLevels();
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortLevels();
  }, [levels, searchTerm, sortBy]);

  const fetchLevels = async () => {
    const { data, error } = await supabase
      .from("level_stats")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load levels");
      return;
    }

    setLevels(data || []);
  };

  const fetchUserData = async () => {
    if (!user) return;

    const [{ data: ratings }, { data: favorites }] = await Promise.all([
      supabase.from("level_ratings").select("level_id, rating").eq("user_id", user.id),
      supabase.from("level_favorites").select("level_id").eq("user_id", user.id),
    ]);

    const ratingsMap: Record<string, number> = {};
    ratings?.forEach((r) => (ratingsMap[r.level_id] = r.rating));
    setUserRatings(ratingsMap);

    setUserFavorites(new Set(favorites?.map((f) => f.level_id) || []));
  };

  const filterAndSortLevels = () => {
    let filtered = levels.filter((level) =>
      level.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      level.creator_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.plays || 0) - (a.plays || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'rating':
        filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        break;
    }

    setFilteredLevels(filtered);
  };

  const handleRate = async (levelId: string, rating: number) => {
    if (!user) {
      toast.error("Please login to rate levels");
      return;
    }

    try {
      const { error } = await supabase
        .from("level_ratings")
        .upsert({
          user_id: user.id,
          level_id: levelId,
          rating,
        });

      if (error) throw error;

      setUserRatings({ ...userRatings, [levelId]: rating });
      toast.success("Rating submitted!");
      fetchLevels();
    } catch (error: any) {
      toast.error(error.message || "Failed to rate level");
    }
  };

  const handleFavorite = async (levelId: string) => {
    if (!user) {
      toast.error("Please login to favorite levels");
      return;
    }

    const isFavorited = userFavorites.has(levelId);

    try {
      if (isFavorited) {
        await supabase
          .from("level_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("level_id", levelId);

        const newFavorites = new Set(userFavorites);
        newFavorites.delete(levelId);
        setUserFavorites(newFavorites);
        toast.success("Removed from favorites");
      } else {
        await supabase
          .from("level_favorites")
          .insert({ user_id: user.id, level_id: levelId });

        setUserFavorites(new Set([...userFavorites, levelId]));
        toast.success("Added to favorites!");
      }
      fetchLevels();
    } catch (error: any) {
      toast.error(error.message || "Failed to update favorites");
    }
  };

  const handlePlay = async (level: Level) => {
    setSelectedLevel(level);
    
    try {
      await supabase
        .from("custom_levels")
        .update({ plays: (level.plays || 0) + 1 })
        .eq("id", level.id);
    } catch (error) {
      console.error("Failed to update play count:", error);
    }
  };

  const difficultyColors: Record<string, string> = {
    easy: "bg-green-500",
    medium: "bg-yellow-500",
    hard: "bg-red-500",
  };

  if (selectedLevel) {
    return (
      <LevelPlayer 
        level={selectedLevel} 
        onBack={() => setSelectedLevel(null)}
      />
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">LEVEL BROWSER</h1>
          <p className="text-muted-foreground uppercase tracking-wider">Community Levels</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search levels or creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <TabsList>
            <TabsTrigger value="popular" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Popular
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="h-4 w-4" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="rating" className="gap-2">
              <Star className="h-4 w-4" />
              Top Rated
            </TabsTrigger>
          </TabsList>

          <TabsContent value={sortBy} className="space-y-4 mt-6">
            {filteredLevels.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No levels found</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLevels.map((level) => (
                  <Card key={level.id} className="p-6 space-y-4 hover:shadow-lg transition-all">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg uppercase">{level.name}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFavorite(level.id)}
                          className={userFavorites.has(level.id) ? "text-red-500" : ""}
                        >
                          <Heart className={`h-5 w-5 ${userFavorites.has(level.id) ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {level.description || "No description"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={difficultyColors[level.difficulty] || "bg-muted"}>
                        {level.difficulty}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        <span className="text-muted-foreground">{level.creator_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Play className="h-4 w-4" />
                          {level.plays || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {level.favorite_count || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          {level.average_rating ? level.average_rating.toFixed(1) : "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(level.id, star)}
                          className="transition-all hover:scale-110"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              (userRatings[level.id] || 0) >= star
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <Button onClick={() => handlePlay(level)} className="w-full gap-2">
                      <Play className="h-4 w-4" />
                      Play Level
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default LevelBrowser;
