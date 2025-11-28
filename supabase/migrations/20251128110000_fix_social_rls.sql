/*
  # Fix Social and Game Invite RLS Policies
  
  This migration fixes "row violation" errors by resetting and correctly defining 
  Row Level Security (RLS) policies for social features.

  ## Query Description: 
  This operation updates the security policies for 'social_connections' and 'game_invites' tables.
  It ensures users can properly send friend requests and, crucially, that recipients 
  have permission to accept or decline them. No data is lost; only permissions are modified.

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Security Implications:
  - RLS Status: Enabled for both tables
  - Policy Changes: Yes, existing policies are replaced with more comprehensive ones allowing
    proper interaction between senders and receivers.
*/

-- ============================================================
-- SOCIAL CONNECTIONS (Friend Requests)
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean slate and avoid conflicts
DROP POLICY IF EXISTS "Users can view their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can insert their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.social_connections;
DROP POLICY IF EXISTS "select_social_connections" ON public.social_connections;
DROP POLICY IF EXISTS "insert_social_connections" ON public.social_connections;
DROP POLICY IF EXISTS "update_social_connections" ON public.social_connections;
DROP POLICY IF EXISTS "delete_social_connections" ON public.social_connections;

-- 1. SELECT: Users can view rows where they are the sender OR the receiver
CREATE POLICY "Users can view their own connections"
ON public.social_connections
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 2. INSERT: Users can create a connection request if they are the sender
CREATE POLICY "Users can send friend requests"
ON public.social_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Both sender (e.g., to cancel) and receiver (to accept/reject) can update
CREATE POLICY "Users can update their connections"
ON public.social_connections
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 4. DELETE: Both parties can remove a connection
CREATE POLICY "Users can delete their connections"
ON public.social_connections
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- ============================================================
-- GAME INVITES
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their invites" ON public.game_invites;
DROP POLICY IF EXISTS "Users can send invites" ON public.game_invites;
DROP POLICY IF EXISTS "Users can update invites" ON public.game_invites;
DROP POLICY IF EXISTS "select_game_invites" ON public.game_invites;
DROP POLICY IF EXISTS "insert_game_invites" ON public.game_invites;
DROP POLICY IF EXISTS "update_game_invites" ON public.game_invites;

-- 1. SELECT: Users can view invites they sent or received
CREATE POLICY "Users can view their invites"
ON public.game_invites
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 2. INSERT: Users can send invites (as sender)
CREATE POLICY "Users can send invites"
ON public.game_invites
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- 3. UPDATE: Receiver needs to update status to 'accepted'/'rejected'
CREATE POLICY "Users can update invites"
ON public.game_invites
FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
