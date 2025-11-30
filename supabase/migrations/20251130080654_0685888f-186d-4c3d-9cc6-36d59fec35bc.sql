-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  requirement_type TEXT NOT NULL, -- 'bricks_broken', 'games_won', 'coins_collected', 'streak', etc.
  requirement_value INTEGER NOT NULL,
  reward_item_id UUID REFERENCES public.shop_items(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Create user_stats table for tracking achievement progress
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  bricks_broken INTEGER DEFAULT 0,
  games_won_single INTEGER DEFAULT 0,
  games_won_multi INTEGER DEFAULT 0,
  coins_collected_single INTEGER DEFAULT 0,
  coins_collected_multi INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (public read)
CREATE POLICY "Achievements viewable by everyone" ON public.achievements
  FOR SELECT USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements" ON public.user_achievements
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_stats
CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to auto-create user stats
CREATE OR REPLACE FUNCTION public.create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create stats when user is created
DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_stats();

-- Add some initial achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value) VALUES
  ('Brick Breaker Novice', 'Break 100 bricks', '🧱', 'bricks_broken', 100),
  ('Brick Breaker Expert', 'Break 1000 bricks', '💎', 'bricks_broken', 1000),
  ('Brick Breaker Master', 'Break 5000 bricks', '👑', 'bricks_broken', 5000),
  ('Victory Streak', 'Win 10 games in single player', '🏆', 'games_won_single', 10),
  ('Multiplayer Champion', 'Win 20 multiplayer games', '⚔️', 'games_won_multi', 20),
  ('Coin Collector', 'Collect 1000 coins in single player', '🪙', 'coins_collected_single', 1000),
  ('Rich Player', 'Collect 5000 coins total', '💰', 'coins_collected_multi', 5000)
ON CONFLICT DO NOTHING;