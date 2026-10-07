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
      app_secrets: {
        Row: {
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          tags: string[]
          type: string
          url_or_code: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          tags?: string[]
          type: string
          url_or_code: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          tags?: string[]
          type?: string
          url_or_code?: string
        }
        Relationships: []
      }
      aura_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          plan_id: string
          raw: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          plan_id: string
          raw?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          plan_id?: string
          raw?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aura_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_summaries: {
        Row: {
          created_at: string
          id: string
          project_id: string
          summary_text: string
          up_to_message_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          summary_text: string
          up_to_message_id: number
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          summary_text?: string
          up_to_message_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      github_connections: {
        Row: {
          access_token_encrypted: string
          avatar_url: string
          created_at: string
          github_username: string
          id: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          avatar_url?: string
          created_at?: string
          github_username?: string
          id?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          avatar_url?: string
          created_at?: string
          github_username?: string
          id?: string
          user_id?: string
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
      plan_providers: {
        Row: {
          plan_id: string
          provider_id: string
        }
        Insert: {
          plan_id: string
          provider_id: string
        }
        Update: {
          plan_id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_providers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          allow_custom_domain: boolean
          can_download: boolean
          can_publish: boolean
          can_view_code: boolean
          created_at: string
          default_provider_id: string | null
          duration_days: number
          features: string[]
          id: string
          is_default: boolean
          max_projects: number
          max_published: number
          name_bn: string
          name_en: string
          price_bdt: number
          rate_limit_per_minute: number
          show_badge: boolean
          tokens_per_day: number
        }
        Insert: {
          allow_custom_domain?: boolean
          can_download?: boolean
          can_publish?: boolean
          can_view_code?: boolean
          created_at?: string
          default_provider_id?: string | null
          duration_days?: number
          features?: string[]
          id?: string
          is_default?: boolean
          max_projects?: number
          max_published?: number
          name_bn: string
          name_en: string
          price_bdt?: number
          rate_limit_per_minute?: number
          show_badge?: boolean
          tokens_per_day?: number
        }
        Update: {
          allow_custom_domain?: boolean
          can_download?: boolean
          can_publish?: boolean
          can_view_code?: boolean
          created_at?: string
          default_provider_id?: string | null
          duration_days?: number
          features?: string[]
          id?: string
          is_default?: boolean
          max_projects?: number
          max_published?: number
          name_bn?: string
          name_en?: string
          price_bdt?: number
          rate_limit_per_minute?: number
          show_badge?: boolean
          tokens_per_day?: number
        }
        Relationships: [
          {
            foreignKeyName: "plans_default_provider_id_fkey"
            columns: ["default_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_banned: boolean
          last_reset_date: string
          name: string | null
          plan_ended_at: string | null
          plan_expires_at: string | null
          plan_id: string | null
          sites_deleted_at: string | null
          tokens_used_today: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_banned?: boolean
          last_reset_date?: string
          name?: string | null
          plan_ended_at?: string | null
          plan_expires_at?: string | null
          plan_id?: string | null
          sites_deleted_at?: string | null
          tokens_used_today?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_banned?: boolean
          last_reset_date?: string
          name?: string | null
          plan_ended_at?: string | null
          plan_expires_at?: string | null
          plan_id?: string | null
          sites_deleted_at?: string | null
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
      project_analysis: {
        Row: {
          analyzed_at: string
          entry_file: string
          file_count: number
          file_map_json: Json
          framework: string
          id: string
          project_id: string
        }
        Insert: {
          analyzed_at?: string
          entry_file?: string
          file_count?: number
          file_map_json?: Json
          framework?: string
          id?: string
          project_id: string
        }
        Update: {
          analyzed_at?: string
          entry_file?: string
          file_count?: number
          file_map_json?: Json
          framework?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          changelog_bn: string
          code_html: string
          created_at: string
          id: string
          project_id: string
          version_number: number
        }
        Insert: {
          changelog_bn?: string
          code_html: string
          created_at?: string
          id?: string
          project_id: string
          version_number: number
        }
        Update: {
          changelog_bn?: string
          code_html?: string
          created_at?: string
          id?: string
          project_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          changes_since_publish: number
          code_html: string
          created_at: string
          custom_domain: string | null
          deploy_message: string
          deploy_status: string
          deployed_at: string | null
          deployed_url: string | null
          domain_checked_at: string | null
          domain_found_ns: string[]
          domain_status: string
          flag_reason: string | null
          github_repo: string | null
          id: string
          is_flagged: boolean
          is_published: boolean
          messages: Json
          name: string
          published_code_hash: string | null
          published_html: string | null
          published_version: number
          show_badge: boolean
          skill_pack_id: string | null
          subdomain: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          changes_since_publish?: number
          code_html?: string
          created_at?: string
          custom_domain?: string | null
          deploy_message?: string
          deploy_status?: string
          deployed_at?: string | null
          deployed_url?: string | null
          domain_checked_at?: string | null
          domain_found_ns?: string[]
          domain_status?: string
          flag_reason?: string | null
          github_repo?: string | null
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          messages?: Json
          name?: string
          published_code_hash?: string | null
          published_html?: string | null
          published_version?: number
          show_badge?: boolean
          skill_pack_id?: string | null
          subdomain?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          changes_since_publish?: number
          code_html?: string
          created_at?: string
          custom_domain?: string | null
          deploy_message?: string
          deploy_status?: string
          deployed_at?: string | null
          deployed_url?: string | null
          domain_checked_at?: string | null
          domain_found_ns?: string[]
          domain_status?: string
          flag_reason?: string | null
          github_repo?: string | null
          id?: string
          is_flagged?: boolean
          is_published?: boolean
          messages?: Json
          name?: string
          published_code_hash?: string | null
          published_html?: string | null
          published_version?: number
          show_badge?: boolean
          skill_pack_id?: string | null
          subdomain?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_skill_pack_id_fkey"
            columns: ["skill_pack_id"]
            isOneToOne: false
            referencedRelation: "skill_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          agent_host: string
          agent_port: number
          announcement_active: boolean
          announcement_color: string
          announcement_text: string
          aurapay_enabled: boolean
          build_prompt: string
          delete_after_days: number
          free_block_publish: boolean
          grace_days: number
          hosting_domain: string
          id: number
          logo_url: string | null
          maintenance_mode: boolean
          max_output_tokens: number
          ns1: string
          ns2: string
          ns3: string
          ns4: string
          payment_instructions: string
          plan_prompt: string
          rate_limit_per_minute: number
          require_email_verify: boolean
          server_ip: string
          site_name: string
          support_email: string
          support_whatsapp: string
          system_prompt: string
          tagline: string
          telegram_link: string
          updated_at: string
        }
        Insert: {
          agent_host?: string
          agent_port?: number
          announcement_active?: boolean
          announcement_color?: string
          announcement_text?: string
          aurapay_enabled?: boolean
          build_prompt?: string
          delete_after_days?: number
          free_block_publish?: boolean
          grace_days?: number
          hosting_domain?: string
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          max_output_tokens?: number
          ns1?: string
          ns2?: string
          ns3?: string
          ns4?: string
          payment_instructions?: string
          plan_prompt?: string
          rate_limit_per_minute?: number
          require_email_verify?: boolean
          server_ip?: string
          site_name?: string
          support_email?: string
          support_whatsapp?: string
          system_prompt?: string
          tagline?: string
          telegram_link?: string
          updated_at?: string
        }
        Update: {
          agent_host?: string
          agent_port?: number
          announcement_active?: boolean
          announcement_color?: string
          announcement_text?: string
          aurapay_enabled?: boolean
          build_prompt?: string
          delete_after_days?: number
          free_block_publish?: boolean
          grace_days?: number
          hosting_domain?: string
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          max_output_tokens?: number
          ns1?: string
          ns2?: string
          ns3?: string
          ns4?: string
          payment_instructions?: string
          plan_prompt?: string
          rate_limit_per_minute?: number
          require_email_verify?: boolean
          server_ip?: string
          site_name?: string
          support_email?: string
          support_whatsapp?: string
          system_prompt?: string
          tagline?: string
          telegram_link?: string
          updated_at?: string
        }
        Relationships: []
      }
      skill_packs: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name_bn: string
          slug: string
          sort_order: number
          system_prompt: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name_bn: string
          slug: string
          sort_order?: number
          system_prompt?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name_bn?: string
          slug?: string
          sort_order?: number
          system_prompt?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          id: string
          provider_name: string | null
          tokens_saved: number
          tokens_used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_name?: string | null
          tokens_saved?: number
          tokens_used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_name?: string | null
          tokens_saved?: number
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
