import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface GameRoom {
  id: string;
  room_code: string;
  host_id: string;
  game_mode: string;
  max_players: number;
  current_players: number;
  status: string;
  created_at: string;
  host?: { username: string };
}

interface RoomPlayer {
  id: string;
  user_id: string;
  player_number: number;
  score: number;
  is_ready: boolean;
  player?: { username: string };
}

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useGameRooms = () => {
  const { user } = useAuth();
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailableRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAvailableRooms(data as any[]);
    }
  }, []);

  const fetchRoomPlayers = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('player_number');

    if (!error && data) {
      // Fetch usernames separately
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const playersWithNames = data.map(p => ({
        ...p,
        player: profiles?.find(pr => pr.id === p.user_id),
      }));
      setRoomPlayers(playersWithNames as RoomPlayer[]);
    }
  }, []);

  useEffect(() => {
    fetchAvailableRooms();

    // Real-time subscription for room updates
    const roomsChannel = supabase
      .channel('game_rooms_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms' },
        () => fetchAvailableRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, [fetchAvailableRooms]);

  useEffect(() => {
    if (!currentRoom) return;

    fetchRoomPlayers(currentRoom.id);

    // Real-time subscription for room players
    const playersChannel = supabase
      .channel(`room_players:${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${currentRoom.id}`,
        },
        () => fetchRoomPlayers(currentRoom.id)
      )
      .subscribe();

    // Real-time subscription for current room updates
    const roomChannel = supabase
      .channel(`game_room:${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${currentRoom.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCurrentRoom(null);
            setRoomPlayers([]);
            toast.info('Room was closed');
          } else {
            setCurrentRoom(payload.new as GameRoom);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [currentRoom?.id, fetchRoomPlayers]);

  const createRoom = async (gameMode: string, maxPlayers: number): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);

    try {
      const roomCode = generateRoomCode();

      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          host_id: user.id,
          game_mode: gameMode,
          max_players: maxPlayers,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as first player
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          user_id: user.id,
          player_number: 1,
        });

      if (playerError) throw playerError;

      setCurrentRoom(room);
      toast.success(`Room created! Code: ${roomCode}`);
      return room.id;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomCode: string): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);

    try {
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        toast.error('Room not found or already started');
        return null;
      }

      if (room.current_players >= room.max_players) {
        toast.error('Room is full');
        return null;
      }

      // Get next player number
      const { data: players } = await supabase
        .from('room_players')
        .select('player_number')
        .eq('room_id', room.id)
        .order('player_number', { ascending: false })
        .limit(1);

      const nextPlayerNumber = (players?.[0]?.player_number || 0) + 1;

      // Add player to room
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          user_id: user.id,
          player_number: nextPlayerNumber,
        });

      if (playerError) throw playerError;

      // Update room player count
      await supabase
        .from('game_rooms')
        .update({ current_players: room.current_players + 1 })
        .eq('id', room.id);

      setCurrentRoom(room);
      toast.success('Joined room!');
      return room.id;
    } catch (error: any) {
      toast.error(error.message || 'Failed to join room');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const leaveRoom = async () => {
    if (!user || !currentRoom) return;

    try {
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      if (currentRoom.host_id === user.id) {
        // Host leaving - delete the room
        await supabase.from('game_rooms').delete().eq('id', currentRoom.id);
      } else {
        // Update player count
        await supabase
          .from('game_rooms')
          .update({ current_players: Math.max(1, currentRoom.current_players - 1) })
          .eq('id', currentRoom.id);
      }

      setCurrentRoom(null);
      setRoomPlayers([]);
      toast.success('Left room');
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave room');
    }
  };

  const startGame = async () => {
    if (!user || !currentRoom || currentRoom.host_id !== user.id) return null;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', currentRoom.id);

      if (error) throw error;

      return currentRoom.id;
    } catch (error: any) {
      toast.error(error.message || 'Failed to start game');
      return null;
    }
  };

  const quickMatch = async (): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);

    try {
      // Find available room with space
      const { data: rooms } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('status', 'waiting')
        .gt('max_players', 1)
        .order('created_at', { ascending: true })
        .limit(10);

      const availableRoom = rooms?.find(r => r.current_players < r.max_players);

      if (availableRoom) {
        return await joinRoom(availableRoom.room_code);
      } else {
        // No rooms available, create one
        return await createRoom('classic', 2);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    availableRooms,
    currentRoom,
    roomPlayers,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    quickMatch,
    fetchAvailableRooms,
  };
};
