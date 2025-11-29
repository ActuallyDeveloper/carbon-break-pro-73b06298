import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Play, FolderOpen, Trash2, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LevelDesignerCanvas } from "@/components/LevelDesignerCanvas";
import { LevelPlayer } from "@/components/LevelPlayer";
import { Brick } from "@/types/game";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInventory } from "@/hooks/useInventory";

interface UserLevel {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  level_data: {
    bricks: Brick[];
    powerups: any[];
  };
}

const LevelDesigner = () => {
  const { user } = useAuth();
  const [levelName, setLevelName] = useState("");
  const [levelDescription, setLevelDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [userLevels, setUserLevels] = useState<UserLevel[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const { equippedItems } = useInventory('single_player');

  useEffect(() => {
    if (user) {
      fetchUserLevels();
    }
  }, [user]);

  const fetchUserLevels = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("custom_levels")
      .select("*")
      .eq("creator_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching levels:", error);
    } else {
      setUserLevels(data as any);
    }
  };

  const saveLevel = async () => {
    if (!user) return;
    if (!levelName.trim()) {
      toast.error("Please enter a level name");
      return;
    }
    if (bricks.length === 0) {
      toast.error("Please add some bricks to your level");
      return;
    }

    try {
      const levelData = {
        name: levelName,
        description: levelDescription,
        difficulty,
        level_data: {
          bricks,
          powerups: [],
        } as any,
        updated_at: new Date().toISOString(),
      };

      if (selectedLevelId) {
        // Update existing level
        const { error } = await supabase
          .from("custom_levels")
          .update(levelData)
          .eq("id", selectedLevelId);

        if (error) throw error;
        toast.success("Level updated!");
      } else {
        // Create new level
        const { error } = await supabase
          .from("custom_levels")
          .insert([{
            creator_id: user.id,
            ...levelData,
            published: false,
          }]);

        if (error) throw error;
        toast.success("Level saved!");
        // Reset form after create
        setLevelName("");
        setLevelDescription("");
        setBricks([]);
      }
      
      fetchUserLevels();
    } catch (error: any) {
      toast.error(error.message || "Failed to save level");
    }
  };

  const loadLevel = (level: UserLevel) => {
    setSelectedLevelId(level.id);
    setLevelName(level.name);
    setLevelDescription(level.description || "");
    setDifficulty(level.difficulty);
    setBricks(level.level_data.bricks || []);
    setIsLoadDialogOpen(false);
    toast.success(`Loaded "${level.name}"`);
  };

  const deleteLevel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this level?")) return;

    try {
      const { error } = await supabase
        .from("custom_levels")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Level deleted");
      if (selectedLevelId === id) {
        setSelectedLevelId(null);
        setLevelName("");
        setLevelDescription("");
        setBricks([]);
      }
      fetchUserLevels();
    } catch (error: any) {
      toast.error("Failed to delete level");
    }
  };

  const resetEditor = () => {
    setSelectedLevelId(null);
    setLevelName("");
    setLevelDescription("");
    setBricks([]);
    setDifficulty("medium");
  };

  if (isTesting) {
    const testLevelData = {
      id: selectedLevelId || "test",
      name: levelName || "Test Level",
      description: levelDescription,
      difficulty,
      creator_name: "You",
      level_data: {
        bricks,
        powerups: [],
      },
    };

    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          <Button variant="outline" onClick={() => setIsTesting(false)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
          </Button>
        </div>
        <LevelPlayer 
          level={testLevelData} 
          onBack={() => setIsTesting(false)}
          equippedItems={equippedItems}
        />
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">LEVEL DESIGNER</h1>
            <p className="text-muted-foreground uppercase tracking-wider">
              {selectedLevelId ? "Editing Level" : "Create Custom Levels"}
            </p>
          </div>
          
          <div className="flex gap-2">
             <Button variant="outline" onClick={resetEditor}>
               New Level
             </Button>
             
             <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  My Levels
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Load Level</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {userLevels.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No saved levels found.</p>
                    ) : (
                      userLevels.map((level) => (
                        <div
                          key={level.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => loadLevel(level)}
                        >
                          <div>
                            <p className="font-medium">{level.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{level.difficulty}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => deleteLevel(level.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider">Level Name</label>
              <Input
                placeholder="My Awesome Level"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider">Description</label>
              <Textarea
                placeholder="Describe your level..."
                value={levelDescription}
                onChange={(e) => setLevelDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium uppercase tracking-wider">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as const).map((diff) => (
                  <Button
                    key={diff}
                    variant={difficulty === diff ? "default" : "outline"}
                    onClick={() => setDifficulty(diff)}
                    size="sm"
                    className="capitalize"
                  >
                    {diff}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveLevel} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {selectedLevelId ? "Update Level" : "Save Level"}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={() => {
                  if (bricks.length === 0) {
                    toast.error("Add bricks before testing!");
                    return;
                  }
                  setIsTesting(true);
                }}
              >
                <Play className="h-4 w-4" />
                Test Level
              </Button>
            </div>
          </div>

          <div>
            <LevelDesignerCanvas bricks={bricks} onBricksChange={setBricks} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LevelDesigner;
