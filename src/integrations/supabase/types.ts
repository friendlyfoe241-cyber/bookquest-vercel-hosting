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
      book_reviews: {
        Row: {
          book_id: string
          created_at: string
          display_name: string
          id: string
          rating: number
          review_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          display_name?: string
          id?: string
          rating: number
          review_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          display_name?: string
          id?: string
          rating?: number
          review_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          book_id: string
          created_at: string
          id: string
          label: string | null
          page_number: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          label?: string | null
          page_number: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          label?: string | null
          page_number?: number
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          age_group: string
          batch: number
          cover_color: string
          cover_emoji: string
          created_at: string
          difficulty: string
          genre: string
          id: string
          pages: Json
          quiz: Json
          summary: string
          title: string
        }
        Insert: {
          age_group?: string
          batch?: number
          cover_color: string
          cover_emoji: string
          created_at?: string
          difficulty?: string
          genre: string
          id: string
          pages?: Json
          quiz?: Json
          summary: string
          title: string
        }
        Update: {
          age_group?: string
          batch?: number
          cover_color?: string
          cover_emoji?: string
          created_at?: string
          difficulty?: string
          genre?: string
          id?: string
          pages?: Json
          quiz?: Json
          summary?: string
          title?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          active_from: string
          active_until: string
          coin_reward: number
          created_at: string
          description: string
          icon: string
          id: string
          target_value: number
          title: string
          type: string
          xp_reward: number
        }
        Insert: {
          active_from?: string
          active_until?: string
          coin_reward?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          target_value?: number
          title: string
          type?: string
          xp_reward?: number
        }
        Update: {
          active_from?: string
          active_until?: string
          coin_reward?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          target_value?: number
          title?: string
          type?: string
          xp_reward?: number
        }
        Relationships: []
      }
      daily_login_claims: {
        Row: {
          claim_date: string
          coins_awarded: number
          consecutive_day: number
          created_at: string
          id: string
          special_reward: string | null
          user_id: string
        }
        Insert: {
          claim_date?: string
          coins_awarded?: number
          consecutive_day?: number
          created_at?: string
          id?: string
          special_reward?: string | null
          user_id: string
        }
        Update: {
          claim_date?: string
          coins_awarded?: number
          consecutive_day?: number
          created_at?: string
          id?: string
          special_reward?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discovery_feed: {
        Row: {
          book_id: string
          created_at: string
          feed_date: string
          id: string
          position: number
          shown: boolean
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          feed_date?: string
          id?: string
          position?: number
          shown?: boolean
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          feed_date?: string
          id?: string
          position?: number
          shown?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_feed_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      highlights: {
        Row: {
          book_id: string
          color: string
          created_at: string
          highlighted_text: string
          id: string
          page_number: number
          user_id: string
        }
        Insert: {
          book_id: string
          color?: string
          created_at?: string
          highlighted_text: string
          id?: string
          page_number: number
          user_id: string
        }
        Update: {
          book_id?: string
          color?: string
          created_at?: string
          highlighted_text?: string
          id?: string
          page_number?: number
          user_id?: string
        }
        Relationships: []
      }
      imported_books: {
        Row: {
          content_text: string
          cover_emoji: string
          created_at: string
          difficulty: string
          genre: string
          id: string
          pages: Json
          quiz: Json
          status: string
          title: string
          user_id: string
        }
        Insert: {
          content_text: string
          cover_emoji?: string
          created_at?: string
          difficulty?: string
          genre?: string
          id?: string
          pages?: Json
          quiz?: Json
          status?: string
          title: string
          user_id: string
        }
        Update: {
          content_text?: string
          cover_emoji?: string
          created_at?: string
          difficulty?: string
          genre?: string
          id?: string
          pages?: Json
          quiz?: Json
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string
          active_pet_id: string | null
          age_group: string
          avatar_id: string
          best_quiz_streak: number
          class_id: string | null
          coins: number
          created_at: string
          dark_mode: boolean
          display_name: string | null
          id: string
          last_login_claim: string | null
          last_read_date: string | null
          leaderboard_opt_in: boolean
          level: number
          login_streak: number
          quiz_streak: number
          reading_level: string
          school_name: string | null
          streak: number
          streak_savers: number
          theme_id: string
          total_quiz_points: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          accent_color?: string
          active_pet_id?: string | null
          age_group?: string
          avatar_id?: string
          best_quiz_streak?: number
          class_id?: string | null
          coins?: number
          created_at?: string
          dark_mode?: boolean
          display_name?: string | null
          id?: string
          last_login_claim?: string | null
          last_read_date?: string | null
          leaderboard_opt_in?: boolean
          level?: number
          login_streak?: number
          quiz_streak?: number
          reading_level?: string
          school_name?: string | null
          streak?: number
          streak_savers?: number
          theme_id?: string
          total_quiz_points?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          accent_color?: string
          active_pet_id?: string | null
          age_group?: string
          avatar_id?: string
          best_quiz_streak?: number
          class_id?: string | null
          coins?: number
          created_at?: string
          dark_mode?: boolean
          display_name?: string | null
          id?: string
          last_login_claim?: string | null
          last_read_date?: string | null
          leaderboard_opt_in?: boolean
          level?: number
          login_streak?: number
          quiz_streak?: number
          reading_level?: string
          school_name?: string | null
          streak?: number
          streak_savers?: number
          theme_id?: string
          total_quiz_points?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          completed: boolean
          created_at: string
          current_page: number
          font_size: number
          id: string
          last_read_at: string
          total_pages: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          completed?: boolean
          created_at?: string
          current_page?: number
          font_size?: number
          id?: string
          last_read_at?: string
          total_pages?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          completed?: boolean
          created_at?: string
          current_page?: number
          font_size?: number
          id?: string
          last_read_at?: string
          total_pages?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          boost_duration_hours: number | null
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          price: number
          rarity: string
          xp_boost: number | null
        }
        Insert: {
          boost_duration_hours?: number | null
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id: string
          name: string
          price?: number
          rarity?: string
          xp_boost?: number | null
        }
        Update: {
          boost_duration_hours?: number | null
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          price?: number
          rarity?: string
          xp_boost?: number | null
        }
        Relationships: []
      }
      user_books: {
        Row: {
          book_id: string
          coins_earned: number
          created_at: string
          discovered_at: string | null
          id: string
          qte_score: number | null
          quiz_score: number | null
          rating: number | null
          read_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          coins_earned?: number
          created_at?: string
          discovered_at?: string | null
          id?: string
          qte_score?: number | null
          quiz_score?: number | null
          rating?: number | null
          read_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          coins_earned?: number
          created_at?: string
          discovered_at?: string | null
          id?: string
          qte_score?: number | null
          quiz_score?: number | null
          rating?: number | null
          read_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          claimed: boolean
          completed: boolean
          created_at: string
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          claimed?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          claimed?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          equipped: boolean
          expires_at: string | null
          id: string
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          equipped?: boolean
          expires_at?: string | null
          id?: string
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          equipped?: boolean
          expires_at?: string | null
          id?: string
          item_id?: string
          purchased_at?: string
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
        ]
      }
      xp_log: {
        Row: {
          created_at: string
          id: string
          source: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          books_read: number | null
          display_name: string | null
          level: number | null
          streak: number | null
          total_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_reading_coins: {
        Args: {
          p_book_id: string
          p_page_number: number
          p_total_pages: number
          p_user_id: string
        }
        Returns: number
      }
      get_friend_profiles: {
        Args: { p_user_id: string }
        Returns: {
          avatar_id: string
          display_name: string
          leaderboard_opt_in: boolean
          level: number
          streak: number
          user_id: string
          xp: number
        }[]
      }
      get_leaderboard: {
        Args: {
          requesting_user_id?: string
          scope?: string
          timeframe?: string
          user_class?: string
          user_school?: string
        }
        Returns: {
          avatar_id: string
          display_name: string
          last_activity: string
          level: number
          streak: number
          user_id: string
          xp: number
        }[]
      }
      search_profiles_by_name: {
        Args: { query: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      update_profile_economy: {
        Args: {
          p_best_quiz_streak?: number
          p_coins?: number
          p_last_read_date?: string
          p_level?: number
          p_quiz_streak?: number
          p_streak?: number
          p_streak_savers?: number
          p_total_quiz_points?: number
          p_user_id: string
          p_xp?: number
        }
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
