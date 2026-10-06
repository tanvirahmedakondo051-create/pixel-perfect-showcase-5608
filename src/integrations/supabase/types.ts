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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_providers: {
        Row: {
          api_key: string
          base_url: string
          created_at: string
          custom_headers: Json
          id: string
          is_active: boolean
          is_default: boolean
          max_tokens: number
          model: string
          name: string
          sort_order: number
          temperature: number
        }
        Insert: {
          api_key: string
          base_url: string
          created_at?: string
          custom_headers?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_tokens?: number
          model: string
          name: string
          sort_order?: number
          temperature?: number
        }
        Update: {
          api_key?: string
          base_url?: string
          created_at?: string
          custom_headers?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_tokens?: number
          model?: string
          name?: string
          sort_order?: number
          temperature?: number
        }
        Relationships: []
      }
      flag_keywords: {
        Row: {
          created_at: string
          id: string
          keyword: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          plan_id: string
          sender_number: string | null
          status: string
          trx_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method: string
          plan_id: string
          sender_number?: string | null
          status?: string
          trx_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          plan_id?: string
          sender_number?: string | null
          status?: string
          trx_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          allow_custom_domain: boolean
          created_at: string
          features: string[]
          id: string
          is_default: boolean
          max_projects: number
          name_bn: string
          name_en: string
          price_bdt: number
          show_badge: boolean
          tokens_per_day: number
        }
        Insert: {
          allow_custom_domain?: boolean
          created_at?: string
          features?: string[]
          id?: string
          is_default?: boolean
          max_projects?: number
          name_bn: string
          name_en: string
          price_bdt?: number
          show_badge?: boolean
          tokens_per_day?: number
        }
        Update: {
          allow_custom_domain?: boolean
          created_at?: string
          features?: string[]
          id?: string
          is_default?: boolean
          max_projects?: number
          name_bn?: string
          name_en?: string
          price_bdt?: number
          show_badge?: boolean
          tokens_per_day?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_banned: boolean
          last_reset_date: string
          name: string | null
          plan_id: string | null
          tokens_used_today: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_banned?: boolean
          last_reset_date?: string
          name?: string | null
          plan_id?: string | null
          tokens_used_today?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_banned?: boolean
          last_reset_date?: string
          name?: string | null
          plan_id?: string | null
          tokens_used_today?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code_html: string
          created_at: string
          flag_reason: string | null
          id: string
          is_flagged: boolean
          is_published: boolean
          messages: Json
          name: string
          subdomain: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code_html?: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          messages?: Json
          name?: string
          subdomain?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code_html?: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          messages?: Json
          name?: string
          subdomain?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          announcement_active: boolean
          announcement_color: string
          announcement_text: string
          free_block_publish: boolean
          id: number
          logo_url: string | null
          maintenance_mode: boolean
          max_output_tokens: number
          payment_instructions: string
          rate_limit_per_minute: number
          require_email_verify: boolean
          site_name: string
          support_email: string
          system_prompt: string
          tagline: string
          telegram_link: string
          updated_at: string
        }
        Insert: {
          announcement_active?: boolean
          announcement_color?: string
          announcement_text?: string
          free_block_publish?: boolean
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          max_output_tokens?: number
          payment_instructions?: string
          rate_limit_per_minute?: number
          require_email_verify?: boolean
          site_name?: string
          support_email?: string
          system_prompt?: string
          tagline?: string
          telegram_link?: string
          updated_at?: string
        }
        Update: {
          announcement_active?: boolean
          announcement_color?: string
          announcement_text?: string
          free_block_publish?: boolean
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          max_output_tokens?: number
          payment_instructions?: string
          rate_limit_per_minute?: number
          require_email_verify?: boolean
          site_name?: string
          support_email?: string
          system_prompt?: string
          tagline?: string
          telegram_link?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          id: string
          provider_name: string | null
          tokens_used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_name?: string | null
          tokens_used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_name?: string | null
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
