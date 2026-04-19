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
  public: {
    Tables: {
      app_custom_users: {
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
      app_delivery_orders: {
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
            referencedRelation: "app_custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_driver_id_fkey1"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "app_custom_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_delivery_orders_waypoints: {
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
            referencedRelation: "app_delivery_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      app_locations: {
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
      app_messages: {
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
            referencedRelation: "app_delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "app_custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "app_custom_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_package_images: {
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
      app_riders_current_status: {
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
      app_saved_locations: {
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
      app_settings: {
        Row: {
          delivery_alerts: boolean | null
          id: string
          promotions: boolean | null
          sms_updates: boolean | null
        }
        Insert: {
          delivery_alerts?: boolean | null
          id: string
          promotions?: boolean | null
          sms_updates?: boolean | null
        }
        Update: {
          delivery_alerts?: boolean | null
          id?: string
          promotions?: boolean | null
          sms_updates?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "app_custom_users"
            referencedColumns: ["id"]
          },
        ]
      }
      "azzz----------BACKEND DB-------": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      back__diesel_schema_migrations: {
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
      back_drivers: {
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
      back_ride_request: {
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
      back_riders: {
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
      back_trips: {
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
      "bz-----------TELEGRAM DB----------": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      telegram_bots: {
        Row: {
          bot_id: number
          bot_token: string
          bot_username: string
          created_at: string | null
          id: number
          is_active: boolean
          vendor_id: number
        }
        Insert: {
          bot_id: number
          bot_token: string
          bot_username: string
          created_at?: string | null
          id?: never
          is_active?: boolean
          vendor_id: number
        }
        Update: {
          bot_id?: number
          bot_token?: string
          bot_username?: string
          created_at?: string | null
          id?: never
          is_active?: boolean
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "telegram_bots_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "telegram_vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_cart: {
        Row: {
          cart_message_id: number | null
          id: number
          items: Json
          status: string
          total: number
          user_id: number | null
          vendor_id: number | null
        }
        Insert: {
          cart_message_id?: number | null
          id?: never
          items?: Json
          status?: string
          total?: number
          user_id?: number | null
          vendor_id?: number | null
        }
        Update: {
          cart_message_id?: number | null
          id?: never
          items?: Json
          status?: string
          total?: number
          user_id?: number | null
          vendor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_cart_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "telegram_custom_users"
            referencedColumns: ["telegram_user_id"]
          },
          {
            foreignKeyName: "telegram_cart_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "telegram_vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_custom_users: {
        Row: {
          created_at: string | null
          default_lat: number | null
          default_lng: number | null
          id: number
          name: string
          phone: string
          status: string
          telegram_user_id: number
        }
        Insert: {
          created_at?: string | null
          default_lat?: number | null
          default_lng?: number | null
          id?: never
          name?: string
          phone?: string
          status?: string
          telegram_user_id: number
        }
        Update: {
          created_at?: string | null
          default_lat?: number | null
          default_lng?: number | null
          id?: never
          name?: string
          phone?: string
          status?: string
          telegram_user_id?: number
        }
        Relationships: []
      }
      telegram_orders: {
        Row: {
          created_at: string | null
          delivery_fee: number
          id: number
          status: string
          subtotal: number
          total: number
          updated_at: string | null
          user_id: number | null
          vendor_id: number | null
          zazu_sub_name: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_fee: number
          id?: never
          status?: string
          subtotal: number
          total: number
          updated_at?: string | null
          user_id?: number | null
          vendor_id?: number | null
          zazu_sub_name?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number
          id?: never
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: number | null
          vendor_id?: number | null
          zazu_sub_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "telegram_custom_users"
            referencedColumns: ["telegram_user_id"]
          },
          {
            foreignKeyName: "telegram_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "telegram_vendor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_orders_zazu_sub_name_fkey"
            columns: ["zazu_sub_name"]
            isOneToOne: false
            referencedRelation: "telegram_vendor"
            referencedColumns: ["name"]
          },
        ]
      }
      telegram_payments: {
        Row: {
          amount: number
          id: number
          order_id: number
          paystack_ref: string
          status: string
          zazu_sub_name: string | null
        }
        Insert: {
          amount: number
          id?: never
          order_id: number
          paystack_ref: string
          status?: string
          zazu_sub_name?: string | null
        }
        Update: {
          amount?: number
          id?: never
          order_id?: number
          paystack_ref?: string
          status?: string
          zazu_sub_name?: string | null
        }
        Relationships: []
      }
      telegram_vendor: {
        Row: {
          acct_details: Json | null
          acct_type: string
          address: string
          allows_logistics: boolean
          close_time: string
          created_at: string | null
          email: string
          id: number
          lat: number
          lng: number
          message_body: string | null
          name: string
          open_time: string
          order_history: Json
          phone: string
          updated_at: string | null
        }
        Insert: {
          acct_details?: Json | null
          acct_type?: string
          address: string
          allows_logistics?: boolean
          close_time: string
          created_at?: string | null
          email: string
          id?: never
          lat: number
          lng: number
          message_body?: string | null
          name: string
          open_time: string
          order_history?: Json
          phone: string
          updated_at?: string | null
        }
        Update: {
          acct_details?: Json | null
          acct_type?: string
          address?: string
          allows_logistics?: boolean
          close_time?: string
          created_at?: string | null
          email?: string
          id?: never
          lat?: number
          lng?: number
          message_body?: string | null
          name?: string
          open_time?: string
          order_history?: Json
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      telegram_vendor_item: {
        Row: {
          id: number
          image_url: string | null
          menu_id: number | null
          name: string
          price: number
          stock: number
          vendor_id: number | null
        }
        Insert: {
          id?: never
          image_url?: string | null
          menu_id?: number | null
          name: string
          price: number
          stock?: number
          vendor_id?: number | null
        }
        Update: {
          id?: never
          image_url?: string | null
          menu_id?: number | null
          name?: string
          price?: number
          stock?: number
          vendor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_vendor_item_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "telegram_vendor_menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_vendor_item_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "telegram_vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_vendor_menu: {
        Row: {
          category_name: string
          id: number
          vendor_id: number
        }
        Insert: {
          category_name?: string
          id?: never
          vendor_id: number
        }
        Update: {
          category_name?: string
          id?: never
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "telegram_vendor_menu_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "telegram_vendor"
            referencedColumns: ["id"]
          },
        ]
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
      telegram_get_nearby_riders: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          distance_km: number
          id: string
          latitude: number
          longitude: number
        }[]
      }
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
