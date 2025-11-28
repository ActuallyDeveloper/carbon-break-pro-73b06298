import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Play } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LevelDesignerCanvas } from "@/components/LevelDesignerCanvas";
import { Brick } from "@/types/game";

const LevelDesigner = () => {
  const { user } = useAuth();
  const [levelName, setLevelName] = useState("");
  const [levelDescription, setLevelDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [bricks, setBricks] = useState<Brick[]>([]);

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
      const { error } = await supabase
        .from("custom_levels")
        .insert([{
          creator_id: user.id,
          name: levelName,
          description: levelDescription,
          difficulty,
          level_data: {
            bricks,
            powerups: [],
          } as any,
          published: false,
        }]);

      if (error) throw error;
      toast.success("Level saved!");
      setLevelName("");
      setLevelDescription("");
      setBricks([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to save level");
    }
  };

  const testLevel = () => {
    if (bricks.length === 0) {
      toast.error("Please add some bricks to test the level");
      return;
    }
    toast.info("Test mode coming soon!");
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">LEVEL DESIGNER</h1>
          <p className="text-muted-foreground uppercase tracking-wider">Create Custom Levels</p>
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
                  >
                    {diff}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveLevel} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={testLevel}>
                <Play className="h-4 w-4" />
                Test
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
