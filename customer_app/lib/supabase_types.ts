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
    PostgrestVersion: "13.0.5"
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
      __diesel_schema_migrations: {
        Row: {
          run_on: string
          version: string
        }
        Insert: {
          run_on?: string
          version: string
        }
        Update: {
          run_on?: string
          version?: string
        }
        Relationships: []
      }
      custom_users: {
        Row: {
          created_at: string
          custom_role: Database["public"]["Enums"]["custom_roles"]
          id: string
          phone: number | null
          profileImage: string | null
          username: string
        }
        Insert: {
          created_at?: string
          custom_role?: Database["public"]["Enums"]["custom_roles"]
          id: string
          phone?: number | null
          profileImage?: string | null
          username: string
        }
        Update: {
          created_at?: string
          custom_role?: Database["public"]["Enums"]["custom_roles"]
          id?: string
          phone?: number | null
          profileImage?: string | null
          username?: string
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          client_id: string
          created_at: string
          delivery_accepted_time: string | null
          driver_id: string | null
          driver_initial_lat: number | null
          driver_initial_long: number | null
          dropoff_code: string | null
          dropoff_lat: number | null
          dropoff_long: number | null
          dropoff_name: string | null
          dropoff_time: string | null
          id: number
          image_url: string | null
          initial_waypoints: Json | null
          is_dropoff_code_authenticated: boolean
          is_pickup_code_authenticated: boolean
          modified_at: string
          order_code: string
          package_description: string | null
          package_type: string | null
          pickup_code: string | null
          pickup_lat: number | null
          pickup_long: number | null
          pickup_name: string | null
          pickup_time: string | null
          status: Database["public"]["Enums"]["delivery_status"]
        }
        Insert: {
          client_id?: string
          created_at?: string
          delivery_accepted_time?: string | null
          driver_id?: string | null
          driver_initial_lat?: number | null
          driver_initial_long?: number | null
          dropoff_code?: string | null
          dropoff_lat?: number | null
          dropoff_long?: number | null
          dropoff_name?: string | null
          dropoff_time?: string | null
          id?: number
          image_url?: string | null
          initial_waypoints?: Json | null
          is_dropoff_code_authenticated?: boolean
          is_pickup_code_authenticated?: boolean
          modified_at?: string
          order_code?: string
          package_description?: string | null
          package_type?: string | null
          pickup_code?: string | null
          pickup_lat?: number | null
          pickup_long?: number | null
          pickup_name?: string | null
          pickup_time?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
        }
        Update: {
          client_id?: string
          created_at?: string
          delivery_accepted_time?: string | null
          driver_id?: string | null
          driver_initial_lat?: number | null
          driver_initial_long?: number | null
          dropoff_code?: string | null
          dropoff_lat?: number | null
          dropoff_long?: number | null
          dropoff_name?: string | null
          dropoff_time?: string | null
          id?: number
          image_url?: string | null
          initial_waypoints?: Json | null
          is_dropoff_code_authenticated?: boolean
          is_pickup_code_authenticated?: boolean
          modified_at?: string
          order_code?: string
          package_description?: string | null
          package_type?: string | null
          pickup_code?: string | null
          pickup_lat?: number | null
          pickup_long?: number | null
          pickup_name?: string | null
          pickup_time?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_driver_id_fkey1"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orders_waypoints: {
        Row: {
          created_at: string
          id: number
          lat: number | null
          long: number | null
          order_id: number
        }
        Insert: {
          created_at: string
          id?: number
          lat?: number | null
          long?: number | null
          order_id?: number
        }
        Update: {
          created_at?: string
          id?: number
          lat?: number | null
          long?: number | null
          order_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_waypoints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          driver_id: string
          driver_location: Json
          driver_pubkey: Json
          driver_response: Json
          email: string
          license_number: string | null
          name: string
          phone: string
          status: string
          vehicle: string | null
          vehicle_type: string
        }
        Insert: {
          driver_id: string
          driver_location: Json
          driver_pubkey: Json
          driver_response: Json
          email: string
          license_number?: string | null
          name: string
          phone: string
          status: string
          vehicle?: string | null
          vehicle_type: string
        }
        Update: {
          driver_id?: string
          driver_location?: Json
          driver_pubkey?: Json
          driver_response?: Json
          email?: string
          license_number?: string | null
          name?: string
          phone?: string
          status?: string
          vehicle?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          frontend_order_id: string
          id: number
          latitude: number
          longitude: number
        }
        Insert: {
          created_at?: string
          frontend_order_id: string
          id?: number
          latitude: number
          longitude: number
        }
        Update: {
          created_at?: string
          frontend_order_id?: string
          id?: number
          latitude?: number
          longitude?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          delivery_order_id: number
          id: number
          is_read: boolean
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          delivery_order_id: number
          id?: number
          is_read?: boolean
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Update: {
          created_at?: string
          delivery_order_id?: number
          id?: number
          is_read?: boolean
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
        ]
      }
      package_images: {
        Row: {
          created_at: string
          id: number
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          url: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: number
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      ride_request: {
        Row: {
          distance_km: number
          drop_off: Json
          estimated_price: number
          estimated_time_min: number
          items: Json
          order_id: string | null
          payment_method: string
          pick_up: Json
          request_id: string
          ride_type: Json
          rider_id: string
          user_id: number | null
          user_phone_number: string | null
          vendor_phone_number: string | null
        }
        Insert: {
          distance_km: number
          drop_off: Json
          estimated_price: number
          estimated_time_min: number
          items: Json
          order_id?: string | null
          payment_method: string
          pick_up: Json
          request_id: string
          ride_type: Json
          rider_id: string
          user_id?: number | null
          user_phone_number?: string | null
          vendor_phone_number?: string | null
        }
        Update: {
          distance_km?: number
          drop_off?: Json
          estimated_price?: number
          estimated_time_min?: number
          items?: Json
          order_id?: string | null
          payment_method?: string
          pick_up?: Json
          request_id?: string
          ride_type?: Json
          rider_id?: string
          user_id?: number | null
          user_phone_number?: string | null
          vendor_phone_number?: string | null
        }
        Relationships: []
      }
      riders: {
        Row: {
          email: string
          name: string
          phone: string
          rider_id: string
          rider_pubkey: Json
        }
        Insert: {
          email: string
          name: string
          phone: string
          rider_id: string
          rider_pubkey: Json
        }
        Update: {
          email?: string
          name?: string
          phone?: string
          rider_id?: string
          rider_pubkey?: Json
        }
        Relationships: []
      }
      riders_current_status: {
        Row: {
          active_mode: Database["public"]["Enums"]["custom_roles"]
          email: string
          id: string
          latitude: number
          longitude: number
          updated_at: string
        }
        Insert: {
          active_mode?: Database["public"]["Enums"]["custom_roles"]
          email: string
          id: string
          latitude: number
          longitude: number
          updated_at?: string
        }
        Update: {
          active_mode?: Database["public"]["Enums"]["custom_roles"]
          email?: string
          id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          created_at: string
          id: number
          latitude: number | null
          longitude: number | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          distance_km: number
          driver_id: string
          driver_location: string
          driver_pubkey: string
          drop_off: string
          end_ts: number | null
          fare_estimate: number | null
          fare_lamports: number | null
          item: Json
          pick_up: string
          reference: string
          rider_email: string
          rider_id: string
          rider_pubkey: string
          start_ts: number
          status: string
          trip_id: string
        }
        Insert: {
          distance_km: number
          driver_id: string
          driver_location: string
          driver_pubkey: string
          drop_off: string
          end_ts?: number | null
          fare_estimate?: number | null
          fare_lamports?: number | null
          item: Json
          pick_up: string
          reference: string
          rider_email?: string
          rider_id: string
          rider_pubkey: string
          start_ts: number
          status: string
          trip_id: string
        }
        Update: {
          distance_km?: number
          driver_id?: string
          driver_location?: string
          driver_pubkey?: string
          drop_off?: string
          end_ts?: number | null
          fare_estimate?: number | null
          fare_lamports?: number | null
          item?: Json
          pick_up?: string
          reference?: string
          rider_email?: string
          rider_id?: string
          rider_pubkey?: string
          start_ts?: number
          status?: string
          trip_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_waypoints: {
        Args: {
          p_current_lat: number
          p_current_lng: number
          p_new_waypoints: Json
          p_order_id: number
        }
        Returns: Json
      }
      diesel_manage_updated_at: { Args: { _tbl: unknown }; Returns: undefined }
    }
    Enums: {
      custom_roles: "rider" | "client"
      delivery_status:
        | "pending"
        | "arriving_pickup"
        | "in_transit"
        | "delivered"
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
      custom_roles: ["rider", "client"],
      delivery_status: [
        "pending",
        "arriving_pickup",
        "in_transit",
        "delivered",
      ],
    },
  },
} as const
