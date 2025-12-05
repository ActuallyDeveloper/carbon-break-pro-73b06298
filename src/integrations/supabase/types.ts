export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          reward_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          reward_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          reward_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_levels: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          difficulty: string | null
          id: string
          level_data: Json
          likes: number | null
          name: string
          plays: number | null
          published: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          difficulty?: string | null
          id?: string
          level_data: Json
          likes?: number | null
          name: string
          plays?: number | null
          published?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          level_data?: Json
          likes?: number | null
          name?: string
          plays?: number | null
          published?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_levels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_invites: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          responded_at: string | null
          room_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          responded_at?: string | null
          room_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          responded_at?: string | null
          room_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_progress: {
        Row: {
          completed: boolean | null
          created_at: string | null
          high_score: number | null
          id: string
          level: number
          score: number | null
          stars: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          high_score?: number | null
          id?: string
          level: number
          score?: number | null
          stars?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          high_score?: number | null
          id?: string
          level?: number
          score?: number | null
          stars?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string
          current_players: number
          difficulty: string | null
          ended_at: string | null
          game_mode: string
          host_id: string
          id: string
          max_players: number
          room_code: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          current_players?: number
          difficulty?: string | null
          ended_at?: string | null
          game_mode?: string
          host_id: string
          id?: string
          max_players?: number
          room_code: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          current_players?: number
          difficulty?: string | null
          ended_at?: string | null
          game_mode?: string
          host_id?: string
          id?: string
          max_players?: number
          room_code?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          id: string
          losses: number | null
          mode: string
          rank: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string
          wins: number | null
        }
        Insert: {
          id?: string
          losses?: number | null
          mode: string
          rank?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id: string
          wins?: number | null
        }
        Update: {
          id?: string
          losses?: number | null
          mode?: string
          rank?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level_favorites: {
        Row: {
          created_at: string | null
          id: string
          level_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_favorites_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "custom_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_favorites_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "level_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level_ratings: {
        Row: {
          created_at: string | null
          id: string
          level_id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level_id: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_ratings_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "custom_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_ratings_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "level_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_matches: {
        Row: {
          created_at: string | null
          ended_at: string | null
          host_id: string
          host_score: number | null
          id: string
          opponent_id: string | null
          opponent_score: number | null
          status: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          host_id: string
          host_score?: number | null
          id?: string
          opponent_id?: string | null
          opponent_score?: number | null
          status?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          host_id?: string
          host_score?: number | null
          id?: string
          opponent_id?: string | null
          opponent_score?: number | null
          status?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_matches_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiplayer_matches_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiplayer_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      room_players: {
        Row: {
          id: string
          is_ready: boolean | null
          joined_at: string
          player_number: number
          room_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          id?: string
          is_ready?: boolean | null
          joined_at?: string
          player_number: number
          room_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          id?: string
          is_ready?: boolean | null
          joined_at?: string
          player_number?: number
          room_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_events: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          rewards: Json | null
          start_date: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          rewards?: Json | null
          start_date: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          rewards?: Json | null
          start_date?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          created_at: string | null
          id: string
          mode: string
          name: string
          price: number
          properties: Json | null
          rarity: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mode: string
          name: string
          price: number
          properties?: Json | null
          rarity?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mode?: string
          name?: string
          price?: number
          properties?: Json | null
          rarity?: string | null
          type?: string
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          id: string
          joined_at: string | null
          rank: number | null
          score: number | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          rank?: number | null
          score?: number | null
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          rank?: number | null
          score?: number | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          prize_pool: number | null
          start_date: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          prize_pool?: number | null
          start_date: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          prize_pool?: number | null
          start_date?: string
          status?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          progress: number | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_currency: {
        Row: {
          created_at: string | null
          id: string
          multiplayer_coins: number | null
          single_player_coins: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          multiplayer_coins?: number | null
          single_player_coins?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          multiplayer_coins?: number | null
          single_player_coins?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_currency_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          equipped: boolean | null
          id: string
          item_id: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          equipped?: boolean | null
          id?: string
          item_id: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          equipped?: boolean | null
          id?: string
          item_id?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          bricks_broken: number | null
          coins_collected_multi: number | null
          coins_collected_single: number | null
          games_won_multi: number | null
          games_won_single: number | null
          id: string
          max_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bricks_broken?: number | null
          coins_collected_multi?: number | null
          coins_collected_single?: number | null
          games_won_multi?: number | null
          games_won_single?: number | null
          id?: string
          max_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bricks_broken?: number | null
          coins_collected_multi?: number | null
          coins_collected_single?: number | null
          games_won_multi?: number | null
          games_won_single?: number | null
          id?: string
          max_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      level_stats: {
        Row: {
          average_rating: number | null
          created_at: string | null
          creator_id: string | null
          creator_name: string | null
          description: string | null
          difficulty: string | null
          favorite_count: number | null
          id: string | null
          level_data: Json | null
          likes: number | null
          name: string | null
          plays: number | null
          published: boolean | null
          rating_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_levels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
