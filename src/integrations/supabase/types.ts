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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          metadata: Json | null
          operation: string
          session_id: string | null
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          operation: string
          session_id?: string | null
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          operation?: string
          session_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_summaries: {
        Row: {
          session_id: string
          summary: string
          updated_at: string
        }
        Insert: {
          session_id: string
          summary?: string
          updated_at?: string
        }
        Update: {
          session_id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assistant_text: string | null
          created_at: string
          do_not_log: boolean | null
          id: string
          lang: string | null
          session_id: string | null
          user_id: string | null
          user_text: string | null
          visitor_alias: string | null
          visitor_name: string | null
        }
        Insert: {
          assistant_text?: string | null
          created_at?: string
          do_not_log?: boolean | null
          id?: string
          lang?: string | null
          session_id?: string | null
          user_id?: string | null
          user_text?: string | null
          visitor_alias?: string | null
          visitor_name?: string | null
        }
        Update: {
          assistant_text?: string | null
          created_at?: string
          do_not_log?: boolean | null
          id?: string
          lang?: string | null
          session_id?: string | null
          user_id?: string | null
          user_text?: string | null
          visitor_alias?: string | null
          visitor_name?: string | null
        }
        Relationships: []
      }
      cost_alert_config: {
        Row: {
          alert_email: string | null
          created_at: string
          daily_threshold_usd: number
          id: string
          monthly_threshold_usd: number
          updated_at: string
        }
        Insert: {
          alert_email?: string | null
          created_at?: string
          daily_threshold_usd?: number
          id?: string
          monthly_threshold_usd?: number
          updated_at?: string
        }
        Update: {
          alert_email?: string | null
          created_at?: string
          daily_threshold_usd?: number
          id?: string
          monthly_threshold_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      openai_usage: {
        Row: {
          completion_tokens: number
          created_at: string
          estimated_cost_usd: number
          id: string
          model: string
          prompt_tokens: number
          session_id: string
          total_tokens: number
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          model: string
          prompt_tokens?: number
          session_id: string
          total_tokens?: number
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          model?: string
          prompt_tokens?: number
          session_id?: string
          total_tokens?: number
        }
        Relationships: []
      }
      visitors: {
        Row: {
          alias: string
          consent: boolean | null
          created_at: string | null
          email: string | null
          name: string | null
          session_id: string
        }
        Insert: {
          alias?: string
          consent?: boolean | null
          created_at?: string | null
          email?: string | null
          name?: string | null
          session_id: string
        }
        Update: {
          alias?: string
          consent?: boolean | null
          created_at?: string | null
          email?: string | null
          name?: string | null
          session_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_visitors: { Args: never; Returns: undefined }
      get_admin_role: {
        Args: never
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      admin_role: "super_admin" | "admin" | "moderator"
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
    Enums: {
      admin_role: ["super_admin", "admin", "moderator"],
    },
  },
} as const
