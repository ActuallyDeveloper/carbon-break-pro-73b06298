-- Add difficulty column to game_rooms for multiplayer difficulty selection
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10) DEFAULT 'medium';

-- Enable realtime for game_rooms table
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;

-- Make sure game_rooms is in the realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.game_rooms,
  public.room_players,
  public.multiplayer_matches,
  public.chat_messages,
  public.social_connections,
  public.user_inventory,
  public.user_currency;