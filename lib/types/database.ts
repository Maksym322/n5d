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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asking_price_cents: number | null
          category: Database["public"]["Enums"]["asset_category"]
          created_at: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description: string
          ebitda_cents: number | null
          employees: number | null
          highlights: string[]
          id: string
          jurisdiction: string
          price_history: Json
          public_ref: number
          published_at: string | null
          revenue_cents: number | null
          seller_id: string
          status: Database["public"]["Enums"]["asset_status"]
          title: string
          validated: boolean
          view_count: number
          year_founded: number | null
        }
        Insert: {
          asking_price_cents?: number | null
          category: Database["public"]["Enums"]["asset_category"]
          created_at?: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description: string
          ebitda_cents?: number | null
          employees?: number | null
          highlights?: string[]
          id?: string
          jurisdiction: string
          price_history?: Json
          public_ref?: number
          published_at?: string | null
          revenue_cents?: number | null
          seller_id: string
          status?: Database["public"]["Enums"]["asset_status"]
          title: string
          validated?: boolean
          view_count?: number
          year_founded?: number | null
        }
        Update: {
          asking_price_cents?: number | null
          category?: Database["public"]["Enums"]["asset_category"]
          created_at?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          description?: string
          ebitda_cents?: number | null
          employees?: number | null
          highlights?: string[]
          id?: string
          jurisdiction?: string
          price_history?: Json
          public_ref?: number
          published_at?: string | null
          revenue_cents?: number | null
          seller_id?: string
          status?: Database["public"]["Enums"]["asset_status"]
          title?: string
          validated?: boolean
          view_count?: number
          year_founded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_identities: {
        Row: {
          company_name: string
          contact_name: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_profiles: {
        Row: {
          categories: Database["public"]["Enums"]["asset_category"][]
          deal_types: Database["public"]["Enums"]["deal_type"][]
          headline: string
          investor_type: Database["public"]["Enums"]["investor_type"]
          is_listed: boolean
          jurisdictions: string[]
          ticket_max_cents: number | null
          ticket_min_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: Database["public"]["Enums"]["asset_category"][]
          deal_types?: Database["public"]["Enums"]["deal_type"][]
          headline: string
          investor_type: Database["public"]["Enums"]["investor_type"]
          is_listed?: boolean
          jurisdictions?: string[]
          ticket_max_cents?: number | null
          ticket_min_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: Database["public"]["Enums"]["asset_category"][]
          deal_types?: Database["public"]["Enums"]["deal_type"][]
          headline?: string
          investor_type?: Database["public"]["Enums"]["investor_type"]
          is_listed?: boolean
          jurisdictions?: string[]
          ticket_max_cents?: number | null
          ticket_min_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          asset_id: string | null
          buyer_id: string
          created_at: string
          id: string
          initiated_by: string
          responded_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["conversation_status"]
        }
        Insert: {
          asset_id?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          initiated_by: string
          responded_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["conversation_status"]
        }
        Update: {
          asset_id?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          initiated_by?: string
          responded_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_log: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action"]
          actor_id: string
          created_at: string
          id: string
          reason: string
          target_id: string
          target_type: string
        }
        Insert: {
          action: Database["public"]["Enums"]["moderation_action"]
          actor_id: string
          created_at?: string
          id?: string
          reason: string
          target_id: string
          target_type: string
        }
        Update: {
          action?: Database["public"]["Enums"]["moderation_action"]
          actor_id?: string
          created_at?: string
          id?: string
          reason?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          locale: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["account_status"]
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          locale?: string
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
        }
        Relationships: []
      }
      seller_identities: {
        Row: {
          company_name: string
          contact_name: string | null
          registration_number: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          description: string | null
          headline: string
          jurisdiction: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          description?: string | null
          headline: string
          jurisdiction: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          description?: string | null
          headline?: string
          jurisdiction?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_active: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      jwt_role: { Args: never; Returns: string }
    }
    Enums: {
      account_status: "ACTIVE" | "SUSPENDED"
      asset_category:
        | "BANK"
        | "FINTECH"
        | "PAYMENT"
        | "EMI"
        | "CRYPTO"
        | "OTHER"
      asset_status: "DRAFT" | "PUBLISHED" | "SUSPENDED" | "SOLD"
      conversation_status: "PENDING" | "ACCEPTED" | "DECLINED"
      deal_type:
        | "FULL_ACQUISITION"
        | "MAJORITY_STAKE"
        | "MINORITY_STAKE"
        | "ASSET_DEAL"
      investor_type:
        | "PE_FUND"
        | "STRATEGIC"
        | "FAMILY_OFFICE"
        | "SEARCH_FUND"
        | "ANGEL"
      moderation_action:
        | "SUSPEND"
        | "REACTIVATE"
        | "SUSPEND_ASSET"
        | "REPUBLISH_ASSET"
      user_role: "BUYER" | "SELLER" | "MANAGER"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["ACTIVE", "SUSPENDED"],
      asset_category: ["BANK", "FINTECH", "PAYMENT", "EMI", "CRYPTO", "OTHER"],
      asset_status: ["DRAFT", "PUBLISHED", "SUSPENDED", "SOLD"],
      conversation_status: ["PENDING", "ACCEPTED", "DECLINED"],
      deal_type: [
        "FULL_ACQUISITION",
        "MAJORITY_STAKE",
        "MINORITY_STAKE",
        "ASSET_DEAL",
      ],
      investor_type: [
        "PE_FUND",
        "STRATEGIC",
        "FAMILY_OFFICE",
        "SEARCH_FUND",
        "ANGEL",
      ],
      moderation_action: [
        "SUSPEND",
        "REACTIVATE",
        "SUSPEND_ASSET",
        "REPUBLISH_ASSET",
      ],
      user_role: ["BUYER", "SELLER", "MANAGER"],
    },
  },
} as const
