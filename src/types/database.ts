export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          display_name: string;
          total_quests_completed: number;
          created_at: string;
          updated_at: string;
          login_streak: number;
          last_login_date: string | null;
          longest_streak: number;
          active_title_id: string | null;
          rank_points: number;
          adventurer_rank: number;
          shinako_reveal_stage: number;
          shinako_revealed: boolean;
        };
        Insert: {
          id: string;
          display_name?: string;
          total_quests_completed?: number;
          created_at?: string;
          updated_at?: string;
          login_streak?: number;
          last_login_date?: string;
          longest_streak?: number;
          rank_points?: number;
          adventurer_rank?: number;
          shinako_reveal_stage?: number;
          shinako_revealed?: boolean;
        };
        Update: {
          id?: string;
          display_name?: string;
          total_quests_completed?: number;
          updated_at?: string;
          login_streak?: number;
          last_login_date?: string;
          longest_streak?: number;
          rank_points?: number;
          adventurer_rank?: number;
          shinako_reveal_stage?: number;
          shinako_revealed?: boolean;
        };
        Relationships: [];
      };
      local_gods: {
        Row: {
          id: string;
          area_code: string;
          area_name: string;
          god_name: string;
          personality: string;
          speech_style: string;
          first_person: string;
          sample_greeting: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          area_code: string;
          area_name: string;
          god_name: string;
          personality: string;
          speech_style: string;
          first_person: string;
          sample_greeting: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          area_code?: string;
          area_name?: string;
          god_name?: string;
          personality?: string;
          speech_style?: string;
          first_person?: string;
          sample_greeting?: string;
          image_url?: string | null;
        };
        Relationships: [];
      };
      quests: {
        Row: {
          id: string;
          user_id: string;
          god_type: "wanderer" | "local";
          god_name: string;
          local_god_id: string | null;
          mission_text: string;
          mission_type: "direction" | "discovery" | "experience";
          start_lat: number;
          start_lng: number;
          start_area_name: string;
          goal_lat: number;
          goal_lng: number;
          goal_radius_meters: number;
          status: "active" | "completed" | "expired" | "abandoned";
          started_at: string;
          completed_at: string | null;
          expires_at: string;
          route_log: { lat: number; lng: number; timestamp: string }[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          god_type: "wanderer" | "local";
          god_name: string;
          local_god_id?: string | null;
          mission_text: string;
          mission_type: "direction" | "discovery" | "experience";
          start_lat: number;
          start_lng: number;
          start_area_name: string;
          goal_lat: number;
          goal_lng: number;
          goal_radius_meters?: number;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          expires_at?: string;
          route_log?: unknown;
          created_at?: string;
        };
        Update: {
          status?: string;
          completed_at?: string;
          route_log?: unknown;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          quest_id: string;
          name: string;
          description: string;
          category: string;
          sub_category: string | null;
          image_url: string | null;
          area_name: string | null;
          god_name: string;
          rarity: number;
          obtained_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quest_id: string;
          name: string;
          description: string;
          category: string;
          sub_category?: string | null;
          image_url?: string | null;
          area_name?: string | null;
          god_name: string;
          rarity?: number;
          obtained_at?: string;
        };
        Update: {
          image_url?: string;
        };
        Relationships: [];
      };
      god_bonds: {
        Row: {
          id: string;
          user_id: string;
          god_name: string;
          god_type: "wanderer" | "local";
          bond_level: number;
          bond_exp: number;
          total_quests: number;
          first_met_at: string;
          last_quest_at: string | null;
          god_image_url: string | null;
          offerings_count: number;
          reveal_stage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          god_name: string;
          god_type: "wanderer" | "local";
          bond_level?: number;
          bond_exp?: number;
          total_quests?: number;
          first_met_at?: string;
          last_quest_at?: string;
          god_image_url?: string | null;
          offerings_count?: number;
          reveal_stage?: number;
        };
        Update: {
          bond_level?: number;
          bond_exp?: number;
          total_quests?: number;
          last_quest_at?: string;
          god_image_url?: string | null;
          offerings_count?: number;
          reveal_stage?: number;
        };
        Relationships: [];
      };
      offerings: {
        Row: {
          id: string;
          user_id: string;
          god_name: string;
          item_id: string;
          offered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          god_name: string;
          item_id: string;
          offered_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      daily_quests: {
        Row: {
          id: string;
          user_id: string;
          quest_date: string;
          quest_id: string | null;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quest_date: string;
          quest_id?: string | null;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          completed?: boolean;
          quest_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      adventure_logs: {
        Row: {
          quest_id: string;
          user_id: string;
          god_type: string;
          god_name: string;
          mission_text: string;
          mission_type: string;
          start_area_name: string;
          start_lat: number;
          start_lng: number;
          goal_lat: number;
          goal_lng: number;
          route_log: unknown;
          started_at: string;
          completed_at: string | null;
          status: string;
          item_id: string | null;
          item_name: string | null;
          item_description: string | null;
          item_category: string | null;
          item_image_url: string | null;
          item_rarity: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
