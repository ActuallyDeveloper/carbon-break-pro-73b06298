-- Drop and recreate the type constraint to include 'trail'
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_type_check;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_type_check CHECK (type = ANY (ARRAY['ball'::text, 'paddle'::text, 'brick'::text, 'explosion'::text, 'background'::text, 'skin'::text, 'effect'::text, 'animation'::text, 'color'::text, 'aura'::text, 'trail'::text]));

-- Add ball trail items to shop
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
  ('Basic Trail', 'trail', 'both', 0, 'common', '{"color": "default", "effect": "basic", "length": 5}'),
  ('Fire Trail', 'trail', 'both', 50, 'rare', '{"color": "#ef4444", "effect": "fire", "length": 8}'),
  ('Ice Trail', 'trail', 'both', 50, 'rare', '{"color": "#3b82f6", "effect": "ice", "length": 8}'),
  ('Lightning Trail', 'trail', 'both', 80, 'epic', '{"color": "#eab308", "effect": "lightning", "length": 10}'),
  ('Rainbow Trail', 'trail', 'both', 150, 'legendary', '{"color": "rainbow", "effect": "rainbow", "length": 12}'),
  ('Shadow Trail', 'trail', 'both', 60, 'rare', '{"color": "#8b5cf6", "effect": "shadow", "length": 8}'),
  ('Neon Trail', 'trail', 'both', 70, 'epic', '{"color": "#10b981", "effect": "neon", "length": 10}'),
  ('Cosmic Trail', 'trail', 'both', 120, 'legendary', '{"color": "#ec4899", "effect": "cosmic", "length": 15}');

-- Create game_rooms table for room-based multiplayer
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(4) NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  game_mode VARCHAR(50) NOT NULL DEFAULT 'classic',
  max_players INTEGER NOT NULL DEFAULT 2,
  current_players INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create room_players table
CREATE TABLE public.room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  player_number INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id),
  UNIQUE(room_id, player_number)
);

-- Create game_invites table
CREATE TABLE public.game_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on game_rooms
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game rooms" ON public.game_rooms
  FOR SELECT USING (true);

CREATE POLICY "Users can create game rooms" ON public.game_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their rooms" ON public.game_rooms
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their rooms" ON public.game_rooms
  FOR DELETE USING (auth.uid() = host_id);

-- Enable RLS on room_players
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room players" ON public.room_players
  FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" ON public.room_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their player data" ON public.room_players
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.room_players
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on game_invites
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their invites" ON public.game_invites
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send invites" ON public.game_invites
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can respond to invites" ON public.game_invites
  FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their invites" ON public.game_invites
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_invites;
