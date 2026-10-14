export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      messages: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          name: string;
          password_hash: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          name: string;
          password_hash?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          name?: string;
          password_hash?: string | null;
        };
        Relationships: [];
      };
      page_views: {
        Row: {
          post_id: string;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          post_id: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          post_id?: string;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      post_likes: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          github_id: string;
          id: string;
          role: string;
        };
        Insert: {
          created_at?: string;
          github_id: string;
          id: string;
          role?: string;
        };
        Update: {
          created_at?: string;
          github_id?: string;
          id?: string;
          role?: string;
        };
        Relationships: [];
      };
      training_sessions: {
        Row: {
          created_at: string;
          date: string;
          day_type: number;
          id: string;
          t1_stage: number;
          t1_success: boolean;
          t1_weight: number;
          t2_stage: number;
          t2_success: boolean;
          t2_weight: number;
          t3_hit25: boolean;
          t3_weight: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          day_type: number;
          id?: string;
          t1_stage: number;
          t1_success: boolean;
          t1_weight: number;
          t2_stage: number;
          t2_success: boolean;
          t2_weight: number;
          t3_hit25: boolean;
          t3_weight: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          day_type?: number;
          id?: string;
          t1_stage?: number;
          t1_success?: boolean;
          t1_weight?: number;
          t2_stage?: number;
          t2_success?: boolean;
          t2_weight?: number;
          t3_hit25?: boolean;
          t3_weight?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_post_like: {
        Args: { p_post_id: string; p_user_id: string };
        Returns: boolean;
      };
      delete_message: {
        Args: { p_hash: string; p_id: string };
        Returns: undefined;
      };
      get_page_view_count: { Args: { p_post_id: string }; Returns: number };
      get_post_like_info: {
        Args: { p_post_id: string; p_user_id: string };
        Returns: {
          count: number;
          user_liked: boolean;
        }[];
      };
      get_total_page_views: { Args: { p_post_ids: string[] }; Returns: number };
      increment_page_view: { Args: { p_post_id: string }; Returns: number };
      remove_post_like: {
        Args: { p_post_id: string; p_user_id: string };
        Returns: boolean;
      };
      update_message: {
        Args: { p_hash: string; p_id: string; p_message: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
