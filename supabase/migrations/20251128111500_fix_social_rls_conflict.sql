/*
  # Fix Social and Game Invite RLS Policies (Conflict Resolution)
  
  ## Query Description:
  This migration resolves the "policy already exists" error by explicitly dropping existing policies 
  before recreating them. It ensures users can properly manage friend requests and game invites 
  without permission errors.
  
  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table: social_connections
  - Table: game_invites
  
  ## Security Implications:
  - RLS Status: Enabled
  - Policy Changes: Yes (Resetting policies to allow proper interaction)
*/

-- Enable RLS (idempotent)
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

-- 1. Fix social_connections policies
-- Drop ALL potential existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.social_connections;
DROP POLICY IF EXISTS "Users can update their connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can delete their connections" ON public.social_connections;

-- Create new policies for social_connections

-- View: Users can see connections where they are sender or receiver
CREATE POLICY "Users can view their own connections"
ON public.social_connections
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Insert: Users can create a request where they are the sender (user_id)
CREATE POLICY "Users can send friend requests"
ON public.social_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update: Users can update status if they are involved (sender or receiver)
-- This fixes the row violation when accepting/rejecting requests
CREATE POLICY "Users can update their connections"
ON public.social_connections
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Delete: Users can delete connections they are involved in
CREATE POLICY "Users can delete their connections"
ON public.social_connections
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- 2. Fix game_invites policies
-- Drop ALL potential existing policies
DROP POLICY IF EXISTS "Users can view their invites" ON public.game_invites;
DROP POLICY IF EXISTS "Users can send invites" ON public.game_invites;
DROP POLICY IF EXISTS "Users can update invites" ON public.game_invites;
DROP POLICY IF EXISTS "Users can update their invites" ON public.game_invites;

-- Create new policies for game_invites

-- View: Users can see invites they sent or received
CREATE POLICY "Users can view their invites"
ON public.game_invites
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Insert: Users can send invites (as sender)
CREATE POLICY "Users can send invites"
ON public.game_invites
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Update: Receiver can accept/reject, Sender might cancel
CREATE POLICY "Users can update invites"
ON public.game_invites
FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
