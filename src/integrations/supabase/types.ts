export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }

  public: {
    Tables: {

      activities: {
        Row: {
          id: string
          host_id: string
          title: string
          category_id: string
          cover: string | null
          starts_at: string
          ends_at: string
          location: string
          district: string | null
          participant_limit: number
          fee: number
          deposit: number
          agenda: Json
          eligibility: Json
          description: string | null
          status: string
          is_private: boolean
          room_password: string | null
          invite_token: string | null
          created_at: string
          updated_at: string
        }

        Insert: {
          id?: string
          host_id: string
          title: string
          category_id: string
          cover?: string | null
          starts_at: string
          ends_at: string
          location: string
          district?: string | null
          participant_limit: number
          fee?: number
          deposit?: number
          agenda?: Json
          eligibility?: Json
          description?: string | null
          status?: string
          is_private?: boolean
          room_password?: string | null
          invite_token?: string | null
          created_at?: string
          updated_at?: string
        }

        Update: {
          id?: string
          host_id?: string
          title?: string
          category_id?: string
          cover?: string | null
          starts_at?: string
          ends_at?: string
          location?: string
          district?: string | null
          participant_limit?: number
          fee?: number
          deposit?: number
          agenda?: Json
          eligibility?: Json
          description?: string | null
          status?: string
          is_private?: boolean
          room_password?: string | null
          invite_token?: string | null
          created_at?: string
          updated_at?: string
        }

        Relationships: []
      }


      activity_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          cover_url: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }

        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          cover_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }

        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          cover_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }

        Relationships: []
      }


      activity_members: {
        Row: {
          id: string
          activity_id: string
          user_id: string
          status: string
          joined_at: string
          cancelled_at: string | null
        }

        Insert: {
          id?: string
          activity_id: string
          user_id: string
          status?: string
          joined_at?: string
          cancelled_at?: string | null
        }

        Update: {
          id?: string
          activity_id?: string
          user_id?: string
          status?: string
          joined_at?: string
          cancelled_at?: string | null
        }

        Relationships: []
      }


      activity_tags: {
        Row: {
          activity_id: string
          tag_id: string
          created_at: string
        }

        Insert: {
          activity_id: string
          tag_id: string
          created_at?: string
        }

        Update: {
          activity_id?: string
          tag_id?: string
          created_at?: string
        }

        Relationships: []
      }
      chat_attachments: {
        Row: {
          id: string
          message_id: string
          activity_id: string
          user_id: string
          file_name: string
          file_path: string
          file_type: string | null
          file_size: number | null
          created_at: string
        }

        Insert: {
          id?: string
          message_id: string
          activity_id: string
          user_id: string
          file_name: string
          file_path: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
        }

        Update: {
          id?: string
          message_id?: string
          activity_id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
        }

        Relationships: []
      }


      chat_members: {
        Row: {
          id: string
          activity_id: string
          user_id: string
          status: string
          joined_at: string
          left_at: string | null
        }

        Insert: {
          id?: string
          activity_id: string
          user_id: string
          status?: string
          joined_at?: string
          left_at?: string | null
        }

        Update: {
          id?: string
          activity_id?: string
          user_id?: string
          status?: string
          joined_at?: string
          left_at?: string | null
        }

        Relationships: []
      }


      chat_messages: {
        Row: {
          id: string
          activity_id: string
          user_id: string
          content: string
          status: string
          created_at: string
          deleted_at: string | null
        }

        Insert: {
          id?: string
          activity_id: string
          user_id: string
          content: string
          status?: string
          created_at?: string
          deleted_at?: string | null
        }

        Update: {
          id?: string
          activity_id?: string
          user_id?: string
          content?: string
          status?: string
          created_at?: string
          deleted_at?: string | null
        }

        Relationships: []
      }


      moderation_actions: {
        Row: {
          id: string
          admin_id: string
          target_user_id: string | null
          activity_id: string | null
          message_id: string | null
          report_id: string | null
          action: string
          note: string | null
          created_at: string
        }

        Insert: {
          id?: string
          admin_id: string
          target_user_id?: string | null
          activity_id?: string | null
          message_id?: string | null
          report_id?: string | null
          action: string
          note?: string | null
          created_at?: string
        }

        Update: {
          id?: string
          admin_id?: string
          target_user_id?: string | null
          activity_id?: string | null
          message_id?: string | null
          report_id?: string | null
          action?: string
          note?: string | null
          created_at?: string
        }

        Relationships: []
      }


      profiles: {
        Row: {
          id: string
          email: string | null
          nickname: string | null
          avatar_url: string | null
          created_at: string
          role: string
          status: string
          gender: string | null
          age: number | null
          city: string | null
          district: string | null
          education: string | null
          university: string | null
          career: string | null
          income: string | null
          bio: string | null
          hobbies: string | null
          boundaries: string | null
          show_liked_activities: boolean
          show_hosted_activities: boolean
          email_verified: boolean
          updated_at: string
        }

        Insert: {
          id: string
          email?: string | null
          nickname?: string | null
          avatar_url?: string | null
          created_at?: string
          role?: string
          status?: string
          gender?: string | null
          age?: number | null
          city?: string | null
          district?: string | null
          education?: string | null
          university?: string | null
          career?: string | null
          income?: string | null
          bio?: string | null
          hobbies?: string | null
          boundaries?: string | null
          show_liked_activities?: boolean
          show_hosted_activities?: boolean
          email_verified?: boolean
          updated_at?: string
        }

        Update: {
          id?: string
          email?: string | null
          nickname?: string | null
          avatar_url?: string | null
          created_at?: string
          role?: string
          status?: string
          gender?: string | null
          age?: number | null
          city?: string | null
          district?: string | null
          education?: string | null
          university?: string | null
          career?: string | null
          income?: string | null
          bio?: string | null
          hobbies?: string | null
          boundaries?: string | null
          show_liked_activities?: boolean
          show_hosted_activities?: boolean
          email_verified?: boolean
          updated_at?: string
        }

        Relationships: []
      }


      report_reasons: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }

        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }

        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }

        Relationships: []
      }

    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      [_ in never]: never
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
  TableName extends (
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals
    }
      ? keyof (
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
        )
      : never
  ) = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? (
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
      )[TableName] extends {
        Row: infer R
      }
      ? R
      : never
    : DefaultSchemaTableNameOrOptions extends keyof (
        DefaultSchema["Tables"] &
        DefaultSchema["Views"]
      )
      ? (
          DefaultSchema["Tables"] &
          DefaultSchema["Views"]
        )[DefaultSchemaTableNameOrOptions] extends {
          Row: infer R
        }
        ? R
        : never
      : never


export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals
    }
      ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
      : never
  ) = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"][TableName] extends {
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
  TableName extends (
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals
    }
      ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
      : never
  ) = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"][TableName] extends {
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
