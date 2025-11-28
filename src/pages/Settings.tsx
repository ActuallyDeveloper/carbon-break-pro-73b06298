import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, User, Bell, Shield, Gamepad2, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useGameSettings } from "@/hooks/useGameSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const Settings = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = useGameSettings();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (data) setUsername(data.username);
    };

    fetchProfile();
  }, [user]);

  const updateUsername = async () => {
    if (!user || !username.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: username.trim() })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Username updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update username");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          <h1 className="text-4xl font-bold tracking-tight">SETTINGS</h1>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-4 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <h2 className="text-xl font-bold uppercase">Profile</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 transition-all duration-200"
                />
                <Button onClick={updateUsername} disabled={loading} className="transition-all duration-200 hover:scale-105">
                  Save
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              <h2 className="text-xl font-bold uppercase">Game Controls</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="desktop-control">Desktop Control</Label>
                <Select
                  value={settings.desktopControl}
                  onValueChange={(value: any) => updateSettings({ desktopControl: value })}
                >
                  <SelectTrigger id="desktop-control" className="transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arrows">Arrow Keys (← →)</SelectItem>
                    <SelectItem value="keys">A/D Keys</SelectItem>
                    <SelectItem value="hover">Mouse Hover</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile-control">Mobile Control</Label>
                <Select
                  value={settings.mobileControl}
                  onValueChange={(value: any) => updateSettings({ mobileControl: value })}
                >
                  <SelectTrigger id="mobile-control" className="transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tap">Tap to Position</SelectItem>
                    <SelectItem value="swipe">Swipe to Move</SelectItem>
                    <SelectItem value="touch">Touch & Drag</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={settings.difficulty}
                  onValueChange={(value: any) => updateSettings({ difficulty: value })}
                >
                  <SelectTrigger id="difficulty" className="transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (1x coins, slower)</SelectItem>
                    <SelectItem value="medium">Medium (2x coins, faster)</SelectItem>
                    <SelectItem value="hard">Hard (4x coins, fastest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="game-mode">Game Mode</Label>
                <Select
                  value={settings.gameMode}
                  onValueChange={(value: any) => updateSettings({ gameMode: value })}
                >
                  <SelectTrigger id="game-mode" className="transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal Mode</SelectItem>
                    <SelectItem value="time-limit">Time Limit Mode</SelectItem>
                    <SelectItem value="battle">Battle Mode (Multiplayer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <h2 className="text-xl font-bold uppercase">Power-Ups</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="powerups-enabled">Enable Power-Ups</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow power-ups to drop from bricks
                  </p>
                </div>
                <Button
                  variant={settings.powerUps.enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSettings({ 
                    powerUps: { ...settings.powerUps, enabled: !settings.powerUps.enabled } 
                  })}
                >
                  {settings.powerUps.enabled ? "ON" : "OFF"}
                </Button>
              </div>

              {settings.powerUps.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="powerups-sp">Single Player</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable in single player mode
                      </p>
                    </div>
                    <Button
                      variant={settings.powerUps.singlePlayer ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ 
                        powerUps: { ...settings.powerUps, singlePlayer: !settings.powerUps.singlePlayer } 
                      })}
                    >
                      {settings.powerUps.singlePlayer ? "ON" : "OFF"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="powerups-mp">Multiplayer</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable in multiplayer mode
                      </p>
                    </div>
                    <Button
                      variant={settings.powerUps.multiplayer ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ 
                        powerUps: { ...settings.powerUps, multiplayer: !settings.powerUps.multiplayer } 
                      })}
                    >
                      {settings.powerUps.multiplayer ? "ON" : "OFF"}
                    </Button>
                  </div>

                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Available Power-Ups:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>🎱 Multi-Ball: Spawn additional balls</li>
                      <li>📏 Paddle Size: Increase paddle width</li>
                      <li>🐌 Slow Ball: Reduce ball speed</li>
                      <li>🛡️ Shield: Protect from losing</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="p-6 space-y-4 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="text-xl font-bold uppercase">Notifications</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Notification settings coming soon
            </p>
          </Card>

          <Card className="p-6 space-y-4 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h2 className="text-xl font-bold uppercase">Privacy</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Privacy settings coming soon
            </p>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
