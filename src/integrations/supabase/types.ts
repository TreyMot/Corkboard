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
      allowed_email: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      bottling: {
        Row: {
          created_at: string
          format_ml: number
          id: string
          vintage: number | null
          wine_id: string
        }
        Insert: {
          created_at?: string
          format_ml?: number
          id?: string
          vintage?: number | null
          wine_id: string
        }
        Update: {
          created_at?: string
          format_ml?: number
          id?: string
          vintage?: number | null
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bottling_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_photos: {
        Row: {
          bytes: number | null
          created_at: string
          deleted_at: string | null
          height: number | null
          id: string
          is_primary: boolean
          kind: string
          owner_id: string
          rating_id: string | null
          storage_path: string
          thumb_path: string
          width: number | null
          wishlist_item_id: string | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          deleted_at?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean
          kind?: string
          owner_id: string
          rating_id?: string | null
          storage_path: string
          thumb_path: string
          width?: number | null
          wishlist_item_id?: string | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          deleted_at?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean
          kind?: string
          owner_id?: string
          rating_id?: string | null
          storage_path?: string
          thumb_path?: string
          width?: number | null
          wishlist_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_photos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_photos_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_photos_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_item"
            referencedColumns: ["id"]
          },
        ]
      }
      invite: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      job_token: {
        Row: {
          created_at: string
          name: string
          token: string
        }
        Insert: {
          created_at?: string
          name: string
          token: string
        }
        Update: {
          created_at?: string
          name?: string
          token?: string
        }
        Relationships: []
      }
      lwin_wine: {
        Row: {
          colour: string | null
          country: string | null
          display_name: string
          lwin7: string
          producer: string | null
          region: string | null
          sub_region: string | null
          type: string | null
          updated_at: string
          wine: string | null
        }
        Insert: {
          colour?: string | null
          country?: string | null
          display_name: string
          lwin7: string
          producer?: string | null
          region?: string | null
          sub_region?: string | null
          type?: string | null
          updated_at?: string
          wine?: string | null
        }
        Update: {
          colour?: string | null
          country?: string | null
          display_name?: string
          lwin7?: string
          producer?: string | null
          region?: string | null
          sub_region?: string | null
          type?: string | null
          updated_at?: string
          wine?: string | null
        }
        Relationships: []
      }
      profile: {
        Row: {
          age_confirmed_at: string | null
          avatar_url: string | null
          display_name: string
          id: string
          joined_at: string
        }
        Insert: {
          age_confirmed_at?: string | null
          avatar_url?: string | null
          display_name: string
          id: string
          joined_at?: string
        }
        Update: {
          age_confirmed_at?: string | null
          avatar_url?: string | null
          display_name?: string
          id?: string
          joined_at?: string
        }
        Relationships: []
      }
      rating: {
        Row: {
          bottling_id: string
          created_at: string
          drunk_on: string | null
          id: string
          note: string | null
          place: string | null
          stars: number | null
          tasting_notes: string[]
          user_id: string
        }
        Insert: {
          bottling_id: string
          created_at?: string
          drunk_on?: string | null
          id?: string
          note?: string | null
          place?: string | null
          stars?: number | null
          tasting_notes?: string[]
          user_id: string
        }
        Update: {
          bottling_id?: string
          created_at?: string
          drunk_on?: string | null
          id?: string
          note?: string | null
          place?: string | null
          stars?: number | null
          tasting_notes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_bottling_id_fkey"
            columns: ["bottling_id"]
            isOneToOne: false
            referencedRelation: "bottling"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_private: {
        Row: {
          bottles_owned: number
          rating_id: string
          score_100: number | null
          user_id: string
        }
        Insert: {
          bottles_owned?: number
          rating_id: string
          score_100?: number | null
          user_id: string
        }
        Update: {
          bottles_owned?: number
          rating_id?: string
          score_100?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_private_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: true
            referencedRelation: "rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      wine: {
        Row: {
          colour: Database["public"]["Enums"]["wine_colour"]
          country: string | null
          created_at: string
          cuvee: string | null
          glass: string | null
          id: string
          location: string | null
          lwin7: string | null
          producer: string
          region: string | null
          varietal: string | null
          varietal_raw: string | null
          verified: boolean
          vineyard: string | null
        }
        Insert: {
          colour: Database["public"]["Enums"]["wine_colour"]
          country?: string | null
          created_at?: string
          cuvee?: string | null
          glass?: string | null
          id?: string
          location?: string | null
          lwin7?: string | null
          producer: string
          region?: string | null
          varietal?: string | null
          varietal_raw?: string | null
          verified?: boolean
          vineyard?: string | null
        }
        Update: {
          colour?: Database["public"]["Enums"]["wine_colour"]
          country?: string | null
          created_at?: string
          cuvee?: string | null
          glass?: string | null
          id?: string
          location?: string | null
          lwin7?: string | null
          producer?: string
          region?: string | null
          varietal?: string | null
          varietal_raw?: string | null
          verified?: boolean
          vineyard?: string | null
        }
        Relationships: []
      }
      wine_edit_log: {
        Row: {
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
          wine_id: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
          wine_id: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_edit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wine_edit_log_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_item: {
        Row: {
          created_at: string
          id: string
          note: string | null
          user_id: string
          wine_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
          wine_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_item_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_item_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      entry_photos_active: {
        Row: {
          bytes: number | null
          created_at: string | null
          height: number | null
          id: string | null
          is_primary: boolean | null
          kind: string | null
          owner_id: string | null
          rating_id: string | null
          storage_path: string | null
          thumb_path: string | null
          width: number | null
          wishlist_item_id: string | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string | null
          height?: number | null
          id?: string | null
          is_primary?: boolean | null
          kind?: string | null
          owner_id?: string | null
          rating_id?: string | null
          storage_path?: string | null
          thumb_path?: string | null
          width?: number | null
          wishlist_item_id?: string | null
        }
        Update: {
          bytes?: number | null
          created_at?: string | null
          height?: number | null
          id?: string | null
          is_primary?: boolean | null
          kind?: string | null
          owner_id?: string | null
          rating_id?: string | null
          storage_path?: string | null
          thumb_path?: string | null
          width?: number | null
          wishlist_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_photos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_photos_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_photos_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_item"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adopt_lwin_wine: {
        Args: {
          p_colour: Database["public"]["Enums"]["wine_colour"]
          p_glass?: string
          p_location?: string
          p_lwin7: string
          p_varietal?: string
          p_vineyard?: string
        }
        Returns: string
      }
      is_member: { Args: never; Returns: boolean }
      label_core: { Args: { t: string }; Returns: string }
      label_field_score: { Args: { a: string; b: string }; Returns: number }
      match_label: {
        Args: {
          max_rows?: number
          p_colour?: string
          p_has_cuvee?: boolean
          p_names?: string[]
          p_producer: string
        }
        Returns: {
          colour: string
          country: string
          cuvee: string
          lwin7: string
          name_score: number
          producer: string
          region: string
          score: number
          source: string
          wine_id: string
        }[]
      }
      search_producers: {
        Args: { max_rows?: number; q: string }
        Returns: {
          producer: string
          score: number
          wine_count: number
        }[]
      }
    }
    Enums: {
      wine_colour:
        | "red"
        | "white"
        | "rose"
        | "orange"
        | "sparkling"
        | "fortified"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      wine_colour: ["red", "white", "rose", "orange", "sparkling", "fortified"],
    },
  },
} as const
