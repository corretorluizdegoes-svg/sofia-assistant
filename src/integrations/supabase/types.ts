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
      conversations: {
        Row: {
          created_at: string
          disciplina: string | null
          id: string
          is_dev_session: boolean
          modulo_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disciplina?: string | null
          id?: string
          is_dev_session?: boolean
          modulo_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disciplina?: string | null
          id?: string
          is_dev_session?: boolean
          modulo_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mind_map_edges: {
        Row: {
          created_at: string
          id: string
          is_custom: boolean
          source_key: string
          target_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_custom?: boolean
          source_key: string
          target_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_custom?: boolean
          source_key?: string
          target_key?: string
          user_id?: string
        }
        Relationships: []
      }
      mind_map_nodes: {
        Row: {
          created_at: string
          descricao: string | null
          glow_color: string
          id: string
          is_custom: boolean
          label: string
          modulo_id: string | null
          node_key: string
          notes: string | null
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          glow_color?: string
          id?: string
          is_custom?: boolean
          label: string
          modulo_id?: string | null
          node_key: string
          notes?: string | null
          updated_at?: string
          user_id: string
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          glow_color?: string
          id?: string
          is_custom?: boolean
          label?: string
          modulo_id?: string | null
          node_key?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cidade: string | null
          codinome: string | null
          created_at: string
          display_name: string | null
          id: string
          language: string
          publico: boolean
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_x: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cidade?: string | null
          codinome?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string
          publico?: boolean
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_x?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cidade?: string | null
          codinome?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string
          publico?: boolean
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_x?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          conquistas: string[]
          created_at: string
          data_alistamento: string
          id: string
          streak_dias: number
          topicos_explorados: string[]
          total_mensagens: number
          ultimo_dia_ativo: string | null
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          conquistas?: string[]
          created_at?: string
          data_alistamento?: string
          id?: string
          streak_dias?: number
          topicos_explorados?: string[]
          total_mensagens?: number
          ultimo_dia_ativo?: string | null
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          conquistas?: string[]
          created_at?: string
          data_alistamento?: string
          id?: string
          streak_dias?: number
          topicos_explorados?: string[]
          total_mensagens?: number
          ultimo_dia_ativo?: string | null
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          tipo: string
          user_id: string
          xp_ganho: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          tipo: string
          user_id: string
          xp_ganho: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          tipo?: string
          user_id?: string
          xp_ganho?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_xp: {
        Args: { _metadata?: Json; _tipo: string; _xp: number }
        Returns: Json
      }
      xp_para_level: { Args: { _xp: number }; Returns: number }
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
