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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asset_valuations: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          unit_value: number
          valued_on: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          unit_value: number
          valued_on: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          unit_value?: number
          valued_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_valuations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          currency: string
          current_unit_value: number
          holding_purpose: string | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          monthly_rent: number
          name: string
          notes: string | null
          property_type: string | null
          purchase_date: string
          purity: string | null
          quantity: number
          symbol: string | null
          unit_cost: number
          updated_at: string
          user_id: string
          zakat_treatment: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          current_unit_value: number
          holding_purpose?: string | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          monthly_rent?: number
          name: string
          notes?: string | null
          property_type?: string | null
          purchase_date: string
          purity?: string | null
          quantity?: number
          symbol?: string | null
          unit_cost: number
          updated_at?: string
          user_id: string
          zakat_treatment?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          current_unit_value?: number
          holding_purpose?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          monthly_rent?: number
          name?: string
          notes?: string | null
          property_type?: string | null
          purchase_date?: string
          purity?: string | null
          quantity?: number
          symbol?: string | null
          unit_cost?: number
          updated_at?: string
          user_id?: string
          zakat_treatment?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          period_month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          period_month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          period_month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          member_role: string
          seat_kind: string
          seat_suspended: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          member_role: string
          seat_kind?: string
          seat_suspended?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          member_role?: string
          seat_kind?: string
          seat_suspended?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_relationships: {
        Row: {
          child_user_id: string
          created_at: string
          id: string
          parent_user_id: string
          permissions: Json
          relationship_type: string
          status: string
          updated_at: string
        }
        Insert: {
          child_user_id: string
          created_at?: string
          id?: string
          parent_user_id: string
          permissions?: Json
          relationship_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          child_user_id?: string
          created_at?: string
          id?: string
          parent_user_id?: string
          permissions?: Json
          relationship_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_relationships_child_user_id_fkey"
            columns: ["child_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_relationships_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_documents: {
        Row: {
          created_at: string
          doc_type: string
          error_message: string | null
          extracted: Json
          extraction_source: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          saved_asset_id: string | null
          saved_transaction_id: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          error_message?: string | null
          extracted?: Json
          extraction_source?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          saved_asset_id?: string | null
          saved_transaction_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          error_message?: string | null
          extracted?: Json
          extraction_source?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          saved_asset_id?: string | null
          saved_transaction_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_saved_asset_id_fkey"
            columns: ["saved_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_saved_transaction_id_fkey"
            columns: ["saved_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          currency: string
          id: string
          kind: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      metal_rates: {
        Row: {
          as_of: string
          created_at: string
          currency: string
          id: string
          metal: string
          price_per_gram: number
          source: string
        }
        Insert: {
          as_of?: string
          created_at?: string
          currency?: string
          id?: string
          metal: string
          price_per_gram: number
          source?: string
        }
        Update: {
          as_of?: string
          created_at?: string
          currency?: string
          id?: string
          metal?: string
          price_per_gram?: number
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          base_currency: string
          created_at: string
          date_of_birth: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          language: string
          life_stage: Database["public"]["Enums"]["life_stage_type"]
          onboarding_completed: boolean
          theme: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          base_currency?: string
          created_at?: string
          date_of_birth: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          language?: string
          life_stage: Database["public"]["Enums"]["life_stage_type"]
          onboarding_completed?: boolean
          theme?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          base_currency?: string
          created_at?: string
          date_of_birth?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          language?: string
          life_stage?: Database["public"]["Enums"]["life_stage_type"]
          onboarding_completed?: boolean
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_items: {
        Row: {
          active: boolean
          amount: number
          category: string
          created_at: string
          currency: string
          day_of_month: number
          ends_on: string | null
          frequency: string
          id: string
          kind: string
          merchant: string | null
          name: string
          note: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category: string
          created_at?: string
          currency?: string
          day_of_month: number
          ends_on?: string | null
          frequency?: string
          id?: string
          kind: string
          merchant?: string | null
          name: string
          note?: string | null
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          day_of_month?: number
          ends_on?: string | null
          frequency?: string
          id?: string
          kind?: string
          merchant?: string | null
          name?: string
          note?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_prices: {
        Row: {
          active: boolean
          additional_child_amount: number
          amount: number
          billing_period: Database["public"]["Enums"]["billing_period"]
          created_at: string
          currency: string
          included_child_count: number
          included_parent_count: number
          key: string
          stripe_additional_child_price_id: string | null
          stripe_price_id: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          additional_child_amount?: number
          amount: number
          billing_period: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          currency?: string
          included_child_count?: number
          included_parent_count?: number
          key: string
          stripe_additional_child_price_id?: string | null
          stripe_price_id?: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          additional_child_amount?: number
          amount?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          currency?: string
          included_child_count?: number
          included_parent_count?: number
          key?: string
          stripe_additional_child_price_id?: string | null
          stripe_price_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          additional_child_count: number
          billing_period: Database["public"]["Enums"]["billing_period"]
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          family_id: string | null
          id: string
          included_child_count: number
          included_parent_count: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_key: string | null
          renewal_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_child_count?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          family_id?: string | null
          id?: string
          included_child_count?: number
          included_parent_count?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_key?: string | null
          renewal_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_child_count?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          family_id?: string | null
          id?: string
          included_child_count?: number
          included_parent_count?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_key?: string | null
          renewal_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_price_key_fkey"
            columns: ["price_key"]
            isOneToOne: false
            referencedRelation: "subscription_prices"
            referencedColumns: ["key"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          beneficiary_user_id: string | null
          category: string
          created_at: string
          currency: string
          deducted_from_child: boolean
          goal_id: string | null
          id: string
          kind: string
          linked_transaction_id: string | null
          merchant: string | null
          note: string | null
          occurred_on: string
          paid_by_parent: boolean
          payment_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          beneficiary_user_id?: string | null
          category: string
          created_at?: string
          currency?: string
          deducted_from_child?: boolean
          goal_id?: string | null
          id?: string
          kind: string
          linked_transaction_id?: string | null
          merchant?: string | null
          note?: string | null
          occurred_on?: string
          paid_by_parent?: boolean
          payment_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          beneficiary_user_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          deducted_from_child?: boolean
          goal_id?: string | null
          id?: string
          kind?: string
          linked_transaction_id?: string | null
          merchant?: string | null
          note?: string | null
          occurred_on?: string
          paid_by_parent?: boolean
          payment_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      zakat_assets: {
        Row: {
          asset_id: string | null
          asset_type: string
          calculation_date: string
          calculation_id: string | null
          calculation_method: string | null
          created_at: string
          eligibility_reason: string | null
          eligible: boolean
          id: string
          user_id: string
          value_kwd: number
        }
        Insert: {
          asset_id?: string | null
          asset_type: string
          calculation_date?: string
          calculation_id?: string | null
          calculation_method?: string | null
          created_at?: string
          eligibility_reason?: string | null
          eligible?: boolean
          id?: string
          user_id: string
          value_kwd?: number
        }
        Update: {
          asset_id?: string | null
          asset_type?: string
          calculation_date?: string
          calculation_id?: string | null
          calculation_method?: string | null
          created_at?: string
          eligibility_reason?: string | null
          eligible?: boolean
          id?: string
          user_id?: string
          value_kwd?: number
        }
        Relationships: [
          {
            foreignKeyName: "zakat_assets_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "zakat_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      zakat_calculations: {
        Row: {
          breakdown: Json
          calculation_date: string
          created_at: string
          deductions_kwd: number
          eligible_assets_total_kwd: number
          hawl_status: string
          id: string
          methodology_reference: string
          nisab_value_kwd: number
          user_id: string
          zakat_due_kwd: number
          zakat_rate: number
          zakatable_amount_kwd: number
        }
        Insert: {
          breakdown?: Json
          calculation_date?: string
          created_at?: string
          deductions_kwd?: number
          eligible_assets_total_kwd?: number
          hawl_status?: string
          id?: string
          methodology_reference?: string
          nisab_value_kwd?: number
          user_id: string
          zakat_due_kwd?: number
          zakat_rate?: number
          zakatable_amount_kwd?: number
        }
        Update: {
          breakdown?: Json
          calculation_date?: string
          created_at?: string
          deductions_kwd?: number
          eligible_assets_total_kwd?: number
          hawl_status?: string
          id?: string
          methodology_reference?: string
          nisab_value_kwd?: number
          user_id?: string
          zakat_due_kwd?: number
          zakat_rate?: number
          zakatable_amount_kwd?: number
        }
        Relationships: []
      }
      zakat_payments: {
        Row: {
          amount_kwd: number
          calculation_id: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_date: string
          payment_type: string
          recipient: string | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount_kwd: number
          calculation_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: string
          recipient?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount_kwd?: number
          calculation_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: string
          recipient?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zakat_payments_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "zakat_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zakat_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      zakat_profiles: {
        Row: {
          created_at: string
          current_nisab_kwd: number | null
          gold_nisab_grams: number
          hawl_status: string
          hijri_due_date: string | null
          hijri_start_date: string | null
          nisab_method: string
          silver_nisab_grams: number
          status: string
          updated_at: string
          user_id: string
          zakat_due_date: string | null
          zakat_start_date: string | null
        }
        Insert: {
          created_at?: string
          current_nisab_kwd?: number | null
          gold_nisab_grams?: number
          hawl_status?: string
          hijri_due_date?: string | null
          hijri_start_date?: string | null
          nisab_method?: string
          silver_nisab_grams?: number
          status?: string
          updated_at?: string
          user_id: string
          zakat_due_date?: string | null
          zakat_start_date?: string | null
        }
        Update: {
          created_at?: string
          current_nisab_kwd?: number | null
          gold_nisab_grams?: number
          hawl_status?: string
          hijri_due_date?: string | null
          hijri_start_date?: string | null
          nisab_method?: string
          silver_nisab_grams?: number
          status?: string
          updated_at?: string
          user_id?: string
          zakat_due_date?: string | null
          zakat_start_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_age: { Args: { dob: string }; Returns: number }
      can_fund_child: { Args: { _child_user_id: string }; Returns: boolean }
      can_monitor_child: { Args: { _child: string }; Returns: boolean }
      has_premium_access: { Args: { _user_id: string }; Returns: boolean }
      is_guardian_of: {
        Args: { _child: string; _parent: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "independent" | "dependent" | "parent"
      asset_kind: "stock" | "gold" | "silver" | "real_estate"
      billing_period: "monthly" | "yearly"
      gender_type: "female" | "male"
      life_stage_type:
        | "child"
        | "teenager"
        | "university_student"
        | "employee"
        | "self_employed"
        | "parent"
      subscription_plan: "free" | "premium"
      subscription_status:
        | "active"
        | "inactive"
        | "cancelled"
        | "past_due"
        | "trialing"
      subscription_type: "individual" | "family"
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
      account_type: ["independent", "dependent", "parent"],
      asset_kind: ["stock", "gold", "silver", "real_estate"],
      billing_period: ["monthly", "yearly"],
      gender_type: ["female", "male"],
      life_stage_type: [
        "child",
        "teenager",
        "university_student",
        "employee",
        "self_employed",
        "parent",
      ],
      subscription_plan: ["free", "premium"],
      subscription_status: [
        "active",
        "inactive",
        "cancelled",
        "past_due",
        "trialing",
      ],
      subscription_type: ["individual", "family"],
    },
  },
} as const
