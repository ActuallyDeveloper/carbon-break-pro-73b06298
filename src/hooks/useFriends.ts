import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend?: { id: string; username: string; avatar_url: string | null };
  user?: { id: string; username: string; avatar_url: string | null };
}

interface GameInvite {
  id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: { username: string };
  room?: { room_code: string; game_mode: string };
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Friend[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    // Fetch accepted friends where user is the sender
    const { data: sentFriends } = await supabase
      .from('social_connections')
      .select('*, friend:profiles!social_connections_friend_id_fkey(id, username, avatar_url)')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    // Fetch accepted friends where user is the receiver
    const { data: receivedFriends } = await supabase
      .from('social_connections')
      .select('*, user:profiles!social_connections_user_id_fkey(id, username, avatar_url)')
      .eq('friend_id', user.id)
      .eq('status', 'accepted');

    const allFriends = [
      ...(sentFriends || []),
      ...(receivedFriends || []),
    ];
    setFriends(allFriends);
  }, [user]);

  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;

    // Requests user sent that are pending
    const { data: sent } = await supabase
      .from('social_connections')
      .select('*, friend:profiles!social_connections_friend_id_fkey(id, username, avatar_url)')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    setPendingRequests(sent || []);
  }, [user]);

  const fetchReceivedRequests = useCallback(async () => {
    if (!user) return;

    // Requests user received that are pending
    const { data: received } = await supabase
      .from('social_connections')
      .select('*, user:profiles!social_connections_user_id_fkey(id, username, avatar_url)')
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    setReceivedRequests(received || []);
  }, [user]);

  const fetchGameInvites = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('game_invites')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (data && data.length > 0) {
      // Fetch sender profiles and rooms separately
      const senderIds = data.map(i => i.sender_id);
      const roomIds = data.map(i => i.room_id);
      
      const [{ data: senders }, { data: rooms }] = await Promise.all([
        supabase.from('profiles').select('id, username').in('id', senderIds),
        supabase.from('game_rooms').select('id, room_code, game_mode').in('id', roomIds),
      ]);

      const invitesWithData = data.map(invite => ({
        ...invite,
        sender: senders?.find(s => s.id === invite.sender_id),
        room: rooms?.find(r => r.id === invite.room_id),
      }));
      setGameInvites(invitesWithData as GameInvite[]);
    } else {
      setGameInvites([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchFriends();
    fetchPendingRequests();
    fetchReceivedRequests();
    fetchGameInvites();

    // Real-time subscription for social connections
    const socialChannel = supabase
      .channel(`social_connections:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_connections',
        },
        () => {
          fetchFriends();
          fetchPendingRequests();
          fetchReceivedRequests();
        }
      )
      .subscribe();

    // Real-time subscription for game invites
    const invitesChannel = supabase
      .channel(`game_invites:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invites',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          fetchGameInvites();
          if (payload.eventType === 'INSERT') {
            toast.info('You received a game invite!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(socialChannel);
      supabase.removeChannel(invitesChannel);
    };
  }, [user, fetchFriends, fetchPendingRequests, fetchReceivedRequests, fetchGameInvites]);

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;
    setLoading(true);

    try {
      // Check if connection already exists
      const { data: existing, error: checkError } = await supabase
        .from('social_connections')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        toast.error('Connection already exists');
        return;
      }

      const { error } = await supabase
        .from('social_connections')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
           toast.error('Request already sent');
        } else {
           throw error;
        }
        return;
      }
      
      toast.success('Friend request sent!');
    } catch (error: any) {
      console.error("Friend request error:", error);
      toast.error(error.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const acceptFriendRequest = async (connectionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('social_connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) throw error;
      toast.success('Friend request accepted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept request');
    }
  };

  const rejectFriendRequest = async (connectionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('social_connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;
      toast.success('Friend request rejected');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject request');
    }
  };

  const sendGameInvite = async (friendId: string, roomId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('game_invites')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          receiver_id: friendId,
        });

      if (error) throw error;
      toast.success('Game invite sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invite');
    }
  };

  const respondToGameInvite = async (inviteId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('game_invites')
        .update({
          status: accept ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;
      
      if (accept) {
        toast.success('Invite accepted!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond to invite');
    }
  };

  const getFriendProfile = (friend: Friend) => {
    if (friend.user_id === user?.id) {
      return friend.friend;
    }
    return friend.user;
  };

  return {
    friends,
    pendingRequests,
    receivedRequests,
    gameInvites,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    sendGameInvite,
    respondToGameInvite,
    getFriendProfile,
  };
};
