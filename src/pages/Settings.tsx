import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings as SettingsIcon, User, Gamepad2, Zap, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Settings = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = useGameSettings();
  const { settings: soundSettings, updateSettings: updateSoundSettings, playSound } = useSoundEffects();
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

  const testSound = () => {
    playSound('coin');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">SETTINGS</h1>
        </div>

        <div className="space-y-4">
          <div className="bg-card p-6 space-y-4">
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
                  className="flex-1"
                />
                <Button onClick={updateUsername} disabled={loading}>
                  Save
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              <h2 className="text-xl font-bold uppercase">Sound</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable all sounds</p>
                </div>
                <Button
                  variant={soundSettings.enabled ? "default" : "secondary"}
                  size="sm"
                  onClick={() => updateSoundSettings({ enabled: !soundSettings.enabled })}
                >
                  {soundSettings.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>

              {soundSettings.enabled && (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Master Volume</Label>
                      <span className="text-sm text-muted-foreground">{Math.round(soundSettings.masterVolume * 100)}%</span>
                    </div>
                    <Slider
                      value={[soundSettings.masterVolume * 100]}
                      onValueChange={([v]) => updateSoundSettings({ masterVolume: v / 100 })}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Effects Volume</Label>
                      <span className="text-sm text-muted-foreground">{Math.round(soundSettings.effectsVolume * 100)}%</span>
                    </div>
                    <Slider
                      value={[soundSettings.effectsVolume * 100]}
                      onValueChange={([v]) => updateSoundSettings({ effectsVolume: v / 100 })}
                      max={100}
                      step={5}
                    />
                  </div>

                  <Button variant="secondary" size="sm" onClick={testSound}>
                    Test Sound
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="bg-card p-6 space-y-4">
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
                  <SelectTrigger id="desktop-control">
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
                  <SelectTrigger id="mobile-control">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="touch">Touch & Hold</SelectItem>
                    <SelectItem value="swipe">Swipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={settings.difficulty}
                  onValueChange={(value: any) => updateSettings({ difficulty: value })}
                >
                  <SelectTrigger id="difficulty">
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
                  <SelectTrigger id="game-mode">
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
          </div>

          <div className="bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <h2 className="text-xl font-bold uppercase">Power-Ups</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Power-Ups</Label>
                  <p className="text-sm text-muted-foreground">Allow power-ups to drop from bricks</p>
                </div>
                <Button
                  variant={settings.powerUps.enabled ? "default" : "secondary"}
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
                      <Label>Single Player</Label>
                      <p className="text-sm text-muted-foreground">Enable in single player mode</p>
                    </div>
                    <Button
                      variant={settings.powerUps.singlePlayer ? "default" : "secondary"}
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
                      <Label>Multiplayer</Label>
                      <p className="text-sm text-muted-foreground">Enable in multiplayer mode</p>
                    </div>
                    <Button
                      variant={settings.powerUps.multiplayer ? "default" : "secondary"}
                      size="sm"
                      onClick={() => updateSettings({ 
                        powerUps: { ...settings.powerUps, multiplayer: !settings.powerUps.multiplayer } 
                      })}
                    >
                      {settings.powerUps.multiplayer ? "ON" : "OFF"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;