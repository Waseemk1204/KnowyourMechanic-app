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
      bookings: {
        Row: {
          created_at: string
          customer_phone: string
          customer_profile_id: string
          description: string | null
          garage_id: string
          id: string
          scheduled_at: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          customer_phone: string
          customer_profile_id: string
          description?: string | null
          garage_id: string
          id?: string
          scheduled_at?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          customer_phone?: string
          customer_profile_id?: string
          description?: string | null
          garage_id?: string
          id?: string
          scheduled_at?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "garage_services"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string
          profile_id: string | null
          referral_code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone: string
          profile_id?: string | null
          referral_code: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          profile_id?: string | null
          referral_code?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      failure_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_name: string
          is_active: boolean
          recommended_service_code: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_name: string
          is_active?: boolean
          recommended_service_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_name?: string
          is_active?: boolean
          recommended_service_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "failure_categories_recommended_service_code_fkey"
            columns: ["recommended_service_code"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      garage_services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          garage_id: string
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          garage_id: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          garage_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_services_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garages: {
        Row: {
          address: string | null
          assigned_employee_id: string | null
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_ifsc_code: string | null
          bank_name: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          email: string | null
          fraud_strikes: number
          id: string
          is_offboarded: boolean
          is_verified: boolean
          latitude: number | null
          legal_business_name: string | null
          longitude: number | null
          name: string
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          owner_profile_id: string
          penalty_amount: number
          phone: string | null
          photo_url: string | null
          rating: number
          razorpay_account_id: string | null
          referral_code: string | null
          service_hours: string | null
          total_reviews: number
          updated_at: string
          working_days: string[]
        }
        Insert: {
          address?: string | null
          assigned_employee_id?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          email?: string | null
          fraud_strikes?: number
          id?: string
          is_offboarded?: boolean
          is_verified?: boolean
          latitude?: number | null
          legal_business_name?: string | null
          longitude?: number | null
          name: string
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          owner_profile_id: string
          penalty_amount?: number
          phone?: string | null
          photo_url?: string | null
          rating?: number
          razorpay_account_id?: string | null
          referral_code?: string | null
          service_hours?: string | null
          total_reviews?: number
          updated_at?: string
          working_days?: string[]
        }
        Update: {
          address?: string | null
          assigned_employee_id?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          email?: string | null
          fraud_strikes?: number
          id?: string
          is_offboarded?: boolean
          is_verified?: boolean
          latitude?: number | null
          legal_business_name?: string | null
          longitude?: number | null
          name?: string
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          owner_profile_id?: string
          penalty_amount?: number
          phone?: string | null
          photo_url?: string | null
          rating?: number
          razorpay_account_id?: string | null
          referral_code?: string | null
          service_hours?: string | null
          total_reviews?: number
          updated_at?: string
          working_days?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "garages_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garages_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel:
            | Database["public"]["Enums"]["invoice_delivery_channel"]
            | null
          created_at: string
          id: string
          payload: Json
          profile_id: string | null
          read_at: string | null
          service_record_id: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          body?: string | null
          channel?:
            | Database["public"]["Enums"]["invoice_delivery_channel"]
            | null
          created_at?: string
          id?: string
          payload?: Json
          profile_id?: string | null
          read_at?: string | null
          service_record_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          body?: string | null
          channel?:
            | Database["public"]["Enums"]["invoice_delivery_channel"]
            | null
          created_at?: string
          id?: string
          payload?: Json
          profile_id?: string | null
          read_at?: string | null
          service_record_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_service_record_id_fkey"
            columns: ["service_record_id"]
            isOneToOne: false
            referencedRelation: "service_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          customer_profile_id: string | null
          garage_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          platform_fee: number
          provider: string | null
          provider_payment_id: string | null
          service_record_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          customer_profile_id?: string | null
          garage_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          platform_fee?: number
          provider?: string | null
          provider_payment_id?: string | null
          service_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          customer_profile_id?: string | null
          garage_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          platform_fee?: number
          provider?: string | null
          provider_payment_id?: string | null
          service_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_record_id_fkey"
            columns: ["service_record_id"]
            isOneToOne: false
            referencedRelation: "service_records"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          created_at: string
          id: string
          name: string | null
          phone_number: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_number: string | null
          vehicle_year: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone_number: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_year?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone_number?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_year?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          evidence_urls: string[]
          garage_id: string
          id: string
          reason: string
          reporter_profile_id: string
          service_record_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[]
          garage_id: string
          id?: string
          reason: string
          reporter_profile_id: string
          service_record_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          evidence_urls?: string[]
          garage_id?: string
          id?: string
          reason?: string
          reporter_profile_id?: string
          service_record_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_service_record_id_fkey"
            columns: ["service_record_id"]
            isOneToOne: false
            referencedRelation: "service_records"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_profile_id: string
          garage_id: string
          id: string
          rating: number
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_profile_id: string
          garage_id: string
          id?: string
          rating: number
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_profile_id?: string
          garage_id?: string
          id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_name: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_name: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_name?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_record_failures: {
        Row: {
          created_at: string
          failure_category_code: string
          service_record_id: string
        }
        Insert: {
          created_at?: string
          failure_category_code: string
          service_record_id: string
        }
        Update: {
          created_at?: string
          failure_category_code?: string
          service_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_record_failures_failure_category_code_fkey"
            columns: ["failure_category_code"]
            isOneToOne: false
            referencedRelation: "failure_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "service_record_failures_service_record_id_fkey"
            columns: ["service_record_id"]
            isOneToOne: false
            referencedRelation: "service_records"
            referencedColumns: ["id"]
          },
        ]
      }
      service_record_services: {
        Row: {
          created_at: string
          service_category_code: string
          service_record_id: string
        }
        Insert: {
          created_at?: string
          service_category_code: string
          service_record_id: string
        }
        Update: {
          created_at?: string
          service_category_code?: string
          service_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_record_services_service_category_code_fkey"
            columns: ["service_category_code"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "service_record_services_service_record_id_fkey"
            columns: ["service_record_id"]
            isOneToOne: false
            referencedRelation: "service_records"
            referencedColumns: ["id"]
          },
        ]
      }
      service_records: {
        Row: {
          amount: number
          approved_by_customer: boolean | null
          created_at: string
          customer_phone: string
          customer_profile_id: string | null
          description: string
          garage_earnings: number
          garage_id: string
          garage_name: string
          id: string
          invoice_delivery_channel: Database["public"]["Enums"]["invoice_delivery_channel"]
          invoice_notification_status: Database["public"]["Enums"]["invoice_notification_status"]
          invoice_number: string | null
          is_reliable: boolean
          model_year: number | null
          odometer_km: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          platform_fee: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          service_notes: string | null
          status: Database["public"]["Enums"]["service_record_status"]
          taxonomy_version: number
          updated_at: string
          vehicle_make_code: string | null
          vehicle_make_other: string | null
          vehicle_model_code: string | null
          vehicle_model_other: string | null
          vehicle_number: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          verification_method:
            | Database["public"]["Enums"]["verification_method"]
            | null
        }
        Insert: {
          amount: number
          approved_by_customer?: boolean | null
          created_at?: string
          customer_phone: string
          customer_profile_id?: string | null
          description: string
          garage_earnings?: number
          garage_id: string
          garage_name: string
          id?: string
          invoice_delivery_channel?: Database["public"]["Enums"]["invoice_delivery_channel"]
          invoice_notification_status?: Database["public"]["Enums"]["invoice_notification_status"]
          invoice_number?: string | null
          is_reliable?: boolean
          model_year?: number | null
          odometer_km?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          platform_fee?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          service_notes?: string | null
          status?: Database["public"]["Enums"]["service_record_status"]
          taxonomy_version?: number
          updated_at?: string
          vehicle_make_code?: string | null
          vehicle_make_other?: string | null
          vehicle_model_code?: string | null
          vehicle_model_other?: string | null
          vehicle_number?: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          verification_method?:
            | Database["public"]["Enums"]["verification_method"]
            | null
        }
        Update: {
          amount?: number
          approved_by_customer?: boolean | null
          created_at?: string
          customer_phone?: string
          customer_profile_id?: string | null
          description?: string
          garage_earnings?: number
          garage_id?: string
          garage_name?: string
          id?: string
          invoice_delivery_channel?: Database["public"]["Enums"]["invoice_delivery_channel"]
          invoice_notification_status?: Database["public"]["Enums"]["invoice_notification_status"]
          invoice_number?: string | null
          is_reliable?: boolean
          model_year?: number | null
          odometer_km?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          platform_fee?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          service_notes?: string | null
          status?: Database["public"]["Enums"]["service_record_status"]
          taxonomy_version?: number
          updated_at?: string
          vehicle_make_code?: string | null
          vehicle_make_other?: string | null
          vehicle_model_code?: string | null
          vehicle_model_other?: string | null
          vehicle_number?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          verification_method?:
            | Database["public"]["Enums"]["verification_method"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "service_records_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_records_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_records_vehicle_make_code_fkey"
            columns: ["vehicle_make_code"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "service_records_vehicle_model_taxonomy_fkey"
            columns: ["vehicle_model_code", "vehicle_make_code", "vehicle_type"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["code", "make_code", "vehicle_type"]
          },
        ]
      }
      vehicle_makes: {
        Row: {
          code: string
          created_at: string
          display_name: string
          is_active: boolean
          sort_order: number
          updated_at: string
          vehicle_types: Database["public"]["Enums"]["vehicle_type"][]
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
          vehicle_types: Database["public"]["Enums"]["vehicle_type"][]
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
          vehicle_types?: Database["public"]["Enums"]["vehicle_type"][]
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          code: string
          created_at: string
          display_name: string
          is_active: boolean
          make_code: string
          sort_order: number
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          is_active?: boolean
          make_code: string
          sort_order?: number
          updated_at?: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          is_active?: boolean
          make_code?: string
          sort_order?: number
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_code_fkey"
            columns: ["make_code"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["code"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          platform: string
          profile_id: string
          push_token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          platform: string
          profile_id: string
          push_token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          platform?: string
          profile_id?: string
          push_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
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
      current_phone_number: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      employee_assigned_to_garage: {
        Args: { target_garage_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      link_current_auth_profile: {
        Args: never
        Returns: {
          auth_user_id: string | null
          created_at: string
          id: string
          name: string | null
          phone_number: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_number: string | null
          vehicle_year: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      owns_garage: { Args: { target_garage_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "garage" | "admin" | "employee"
      booking_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      business_type:
        | "individual"
        | "partnership"
        | "proprietorship"
        | "private_limited"
        | "public_limited"
      invoice_delivery_channel: "push" | "whatsapp" | "manual" | "none"
      invoice_notification_status:
        | "pending"
        | "sent"
        | "failed"
        | "fallback_sent"
        | "not_required"
      notification_status: "pending" | "sent" | "failed" | "read"
      notification_type:
        | "service_approval"
        | "invoice_ready"
        | "booking_update"
        | "report_update"
      onboarding_status:
        | "pending"
        | "bank_details"
        | "verification"
        | "completed"
      payment_method: "cash" | "razorpay"
      report_status: "pending" | "reviewing" | "resolved" | "dismissed"
      service_record_status:
        | "pending_otp"
        | "otp_verified"
        | "payment_pending"
        | "completed"
        | "cancelled"
      verification_method: "whatsapp_otp" | "in_app"
      vehicle_type: "2w" | "3w" | "4w" | "other"
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
      app_role: ["customer", "garage", "admin", "employee"],
      booking_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      business_type: [
        "individual",
        "partnership",
        "proprietorship",
        "private_limited",
        "public_limited",
      ],
      invoice_delivery_channel: ["push", "whatsapp", "manual", "none"],
      invoice_notification_status: [
        "pending",
        "sent",
        "failed",
        "fallback_sent",
        "not_required",
      ],
      notification_status: ["pending", "sent", "failed", "read"],
      notification_type: [
        "service_approval",
        "invoice_ready",
        "booking_update",
        "report_update",
      ],
      onboarding_status: [
        "pending",
        "bank_details",
        "verification",
        "completed",
      ],
      payment_method: ["cash", "razorpay"],
      report_status: ["pending", "reviewing", "resolved", "dismissed"],
      service_record_status: [
        "pending_otp",
        "otp_verified",
        "payment_pending",
        "completed",
        "cancelled",
      ],
      verification_method: ["whatsapp_otp", "in_app"],
      vehicle_type: ["2w", "3w", "4w", "other"],
    },
  },
} as const
