export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      game_catapults: {
        Row: {
          created_at: string | null
          damage: number
          health: number
          id: string
          is_destroyed: boolean | null
          last_shot_at: string | null
          max_health: number
          position_x: number
          position_y: number
          range_radius: number
          reload_time: number
          room_id: string | null
          team: number
        }
        Insert: {
          created_at?: string | null
          damage?: number
          health?: number
          id?: string
          is_destroyed?: boolean | null
          last_shot_at?: string | null
          max_health?: number
          position_x: number
          position_y: number
          range_radius?: number
          reload_time?: number
          room_id?: string | null
          team: number
        }
        Update: {
          created_at?: string | null
          damage?: number
          health?: number
          id?: string
          is_destroyed?: boolean | null
          last_shot_at?: string | null
          max_health?: number
          position_x?: number
          position_y?: number
          range_radius?: number
          reload_time?: number
          room_id?: string | null
          team?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_catapults_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_events: {
        Row: {
          created_at: string | null
          data: Json | null
          event_type: string
          id: string
          room_id: string | null
          team: number | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          event_type: string
          id?: string
          room_id?: string | null
          team?: number | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          event_type?: string
          id?: string
          room_id?: string | null
          team?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_participants: {
        Row: {
          id: string
          joined_at: string | null
          player_id: string
          player_name: string
          ready: boolean | null
          room_id: string | null
          team: number
        }
        Insert: {
          id?: string
          joined_at?: string | null
          player_id: string
          player_name: string
          ready?: boolean | null
          room_id?: string | null
          team: number
        }
        Update: {
          id?: string
          joined_at?: string | null
          player_id?: string
          player_name?: string
          ready?: boolean | null
          room_id?: string | null
          team?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          id: string
          room_id: string | null
          team1_score: number | null
          team2_score: number | null
          winner_team: number | null
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          room_id?: string | null
          team1_score?: number | null
          team2_score?: number | null
          winner_team?: number | null
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          room_id?: string | null
          team1_score?: number | null
          team2_score?: number | null
          winner_team?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_results_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string | null
          current_players: number | null
          id: string
          max_players: number | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_players?: number | null
          id?: string
          max_players?: number | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_players?: number | null
          id?: string
          max_players?: number | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      game_towers: {
        Row: {
          created_at: string | null
          damage: number
          health: number
          id: string
          is_destroyed: boolean | null
          max_health: number
          position_x: number
          position_y: number
          range_radius: number
          room_id: string | null
          team: number
          tower_type: string
        }
        Insert: {
          created_at?: string | null
          damage?: number
          health?: number
          id?: string
          is_destroyed?: boolean | null
          max_health?: number
          position_x: number
          position_y: number
          range_radius?: number
          room_id?: string | null
          team: number
          tower_type: string
        }
        Update: {
          created_at?: string | null
          damage?: number
          health?: number
          id?: string
          is_destroyed?: boolean | null
          max_health?: number
          position_x?: number
          position_y?: number
          range_radius?: number
          room_id?: string | null
          team?: number
          tower_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_towers_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_units: {
        Row: {
          created_at: string | null
          damage: number
          health: number
          id: string
          is_alive: boolean | null
          max_health: number
          position_x: number
          position_y: number
          room_id: string | null
          speed: number
          target_x: number | null
          target_y: number | null
          team: number
          unit_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          damage: number
          health: number
          id?: string
          is_alive?: boolean | null
          max_health: number
          position_x: number
          position_y: number
          room_id?: string | null
          speed?: number
          target_x?: number | null
          target_y?: number | null
          team: number
          unit_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          damage?: number
          health?: number
          id?: string
          is_alive?: boolean | null
          max_health?: number
          position_x?: number
          position_y?: number
          room_id?: string | null
          speed?: number
          target_x?: number | null
          target_y?: number | null
          team?: number
          unit_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_units_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      pvp_battles: {
        Row: {
          army_count: number
          attacker_id: string
          battle_log: string[] | null
          created_at: string
          damage_dealt: number
          defender_id: string
          id: string
          victory: boolean
        }
        Insert: {
          army_count: number
          attacker_id: string
          battle_log?: string[] | null
          created_at?: string
          damage_dealt: number
          defender_id: string
          id?: string
          victory?: boolean
        }
        Update: {
          army_count?: number
          attacker_id?: string
          battle_log?: string[] | null
          created_at?: string
          damage_dealt?: number
          defender_id?: string
          id?: string
          victory?: boolean
        }
        Relationships: []
      }
      resource_battles: {
        Row: {
          army_count: number
          attacker_id: string
          battle_log: string[] | null
          boss_health_remaining: number
          created_at: string
          damage_dealt: number
          id: string
          region_id: string
          victory: boolean
        }
        Insert: {
          army_count: number
          attacker_id: string
          battle_log?: string[] | null
          boss_health_remaining: number
          created_at?: string
          damage_dealt: number
          id?: string
          region_id: string
          victory?: boolean
        }
        Update: {
          army_count?: number
          attacker_id?: string
          battle_log?: string[] | null
          boss_health_remaining?: number
          created_at?: string
          damage_dealt?: number
          id?: string
          region_id?: string
          victory?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "resource_battles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "resource_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_regions: {
        Row: {
          boss_health: number
          captured_at: string | null
          created_at: string
          id: string
          max_boss_health: number
          owner_id: string | null
          production_bonus: number
          q: number
          r: number
          resource_type: string
          s: number
        }
        Insert: {
          boss_health?: number
          captured_at?: string | null
          created_at?: string
          id?: string
          max_boss_health?: number
          owner_id?: string | null
          production_bonus?: number
          q: number
          r: number
          resource_type: string
          s: number
        }
        Update: {
          boss_health?: number
          captured_at?: string | null
          created_at?: string
          id?: string
          max_boss_health?: number
          owner_id?: string | null
          production_bonus?: number
          q?: number
          r?: number
          resource_type?: string
          s?: number
        }
        Relationships: []
      }
      user_positions: {
        Row: {
          has_shield: boolean | null
          id: string
          placed_at: string
          q: number
          r: number
          s: number
          user_id: string
        }
        Insert: {
          has_shield?: boolean | null
          id?: string
          placed_at?: string
          q: number
          r: number
          s: number
          user_id: string
        }
        Update: {
          has_shield?: boolean | null
          id?: string
          placed_at?: string
          q?: number
          r?: number
          s?: number
          user_id?: string
        }
        Relationships: []
      }
      user_resources: {
        Row: {
          created_at: string
          gold: number
          id: string
          iron: number
          stone: number
          updated_at: string
          user_id: string
          wheat: number
          wood: number
        }
        Insert: {
          created_at?: string
          gold?: number
          id?: string
          iron?: number
          stone?: number
          updated_at?: string
          user_id: string
          wheat?: number
          wood?: number
        }
        Update: {
          created_at?: string
          gold?: number
          id?: string
          iron?: number
          stone?: number
          updated_at?: string
          user_id?: string
          wheat?: number
          wood?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      move_castle: {
        Args: { target_q: number; target_r: number; target_s: number }
        Returns: boolean
      }
      place_existing_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
