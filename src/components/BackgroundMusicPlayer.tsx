import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Music, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useBackgroundMusic, MusicTrack, setGlobalMusicInstance } from '@/hooks/useBackgroundMusic';

interface BackgroundMusicPlayerProps {
  compact?: boolean;
  autoPlay?: boolean;
}

export const BackgroundMusicPlayer = ({ compact = false, autoPlay = false }: BackgroundMusicPlayerProps) => {
  const music = useBackgroundMusic();
  
  useEffect(() => {
    setGlobalMusicInstance(music);
  }, [music]);

  useEffect(() => {
    if (autoPlay && music.settings.enabled && !music.isPlaying) {
      // Small delay to avoid browser autoplay restrictions
      const timer = setTimeout(() => {
        music.play();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, music.settings.enabled]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={music.toggle}
          className="h-8 w-8"
        >
          {music.isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => music.updateSettings({ enabled: !music.settings.enabled })}
          className="h-8 w-8"
        >
          {music.settings.enabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5" />
        <h3 className="font-bold uppercase text-sm tracking-wider">Background Music</h3>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant={music.isPlaying ? "default" : "secondary"}
          size="sm"
          onClick={music.toggle}
          className="gap-2"
        >
          {music.isPlaying ? (
            <>
              <Pause className="h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Play
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => music.updateSettings({ enabled: !music.settings.enabled })}
        >
          {music.settings.enabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Track</label>
          <Select
            value={music.settings.currentTrack}
            onValueChange={(value) => music.setTrack(value as MusicTrack)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(music.tracks).map(([key, track]) => (
                <SelectItem key={key} value={key}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Volume</label>
            <span className="text-sm text-muted-foreground">
              {Math.round(music.settings.musicVolume * 100)}%
            </span>
          </div>
          <Slider
            value={[music.settings.musicVolume * 100]}
            onValueChange={([v]) => music.updateSettings({ musicVolume: v / 100 })}
            max={100}
            step={5}
          />
        </div>
      </div>
    </Card>
  );
};
