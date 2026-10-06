export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      billing_account: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          community_id: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_event_created: number | null
          latest_invoice_id: string | null
          latest_invoice_status: string | null
          plan_amount_cents: number | null
          plan_interval: string | null
          price_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          community_id?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_event_created?: number | null
          latest_invoice_id?: string | null
          latest_invoice_status?: string | null
          plan_amount_cents?: number | null
          plan_interval?: string | null
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          community_id?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_event_created?: number | null
          latest_invoice_id?: string | null
          latest_invoice_status?: string | null
          plan_amount_cents?: number | null
          plan_interval?: string | null
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      billing_webhook_events: {
        Row: {
          event_type: string
          outcome: string
          received_at: string
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          outcome: string
          received_at?: string
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          outcome?: string
          received_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      candidate_info: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          age: number | null
          camp_waiver_signed_at: string | null
          candidate_id: string | null
          church: string | null
          city: string
          created_at: string
          date_of_birth: string
          email: string
          emergency_contact_name: string
          emergency_contact_phone: string
          first_name: string
          has_friends_attending_weekend: boolean | null
          has_spouse_attended_weekend: boolean | null
          id: string
          is_christian: boolean | null
          last_name: string
          marital_status: string | null
          medical_conditions: string | null
          member_of_clergy: boolean | null
          phone: string
          reason_for_attending: string | null
          shirt_size: string
          spouse_name: string | null
          spouse_weekend_location: string | null
          state: string
          zip: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          age?: number | null
          camp_waiver_signed_at?: string | null
          candidate_id?: string | null
          church?: string | null
          city: string
          created_at?: string
          date_of_birth: string
          email: string
          emergency_contact_name: string
          emergency_contact_phone: string
          first_name: string
          has_friends_attending_weekend?: boolean | null
          has_spouse_attended_weekend?: boolean | null
          id?: string
          is_christian?: boolean | null
          last_name: string
          marital_status?: string | null
          medical_conditions?: string | null
          member_of_clergy?: boolean | null
          phone: string
          reason_for_attending?: string | null
          shirt_size: string
          spouse_name?: string | null
          spouse_weekend_location?: string | null
          state: string
          zip: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          age?: number | null
          camp_waiver_signed_at?: string | null
          candidate_id?: string | null
          church?: string | null
          city?: string
          created_at?: string
          date_of_birth?: string
          email?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          first_name?: string
          has_friends_attending_weekend?: boolean | null
          has_spouse_attended_weekend?: boolean | null
          id?: string
          is_christian?: boolean | null
          last_name?: string
          marital_status?: string | null
          medical_conditions?: string | null
          member_of_clergy?: boolean | null
          phone?: string
          reason_for_attending?: string | null
          shirt_size?: string
          spouse_name?: string | null
          spouse_weekend_location?: string | null
          state?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: 'candidate_info_candidate_id_fkey'
            columns: ['candidate_id']
            isOneToOne: false
            referencedRelation: 'candidates'
            referencedColumns: ['id']
          },
        ]
      }
      candidate_sponsorship_info: {
        Row: {
          attends_secuela: string | null
          candidate_email: string | null
          candidate_id: string | null
          candidate_name: string | null
          church_environment: string | null
          contact_frequency: string | null
          created_at: string
          god_evidence: string | null
          home_environment: string | null
          id: string
          payment_owner: string | null
          prayer_request: string | null
          reunion_group: string | null
          social_environment: string | null
          sponsor_address: string | null
          sponsor_church: string | null
          sponsor_email: string | null
          sponsor_name: string | null
          sponsor_phone: string | null
          sponsor_weekend: string | null
          support_plan: string | null
          updated_at: string | null
          work_environment: string | null
        }
        Insert: {
          attends_secuela?: string | null
          candidate_email?: string | null
          candidate_id?: string | null
          candidate_name?: string | null
          church_environment?: string | null
          contact_frequency?: string | null
          created_at?: string
          god_evidence?: string | null
          home_environment?: string | null
          id?: string
          payment_owner?: string | null
          prayer_request?: string | null
          reunion_group?: string | null
          social_environment?: string | null
          sponsor_address?: string | null
          sponsor_church?: string | null
          sponsor_email?: string | null
          sponsor_name?: string | null
          sponsor_phone?: string | null
          sponsor_weekend?: string | null
          support_plan?: string | null
          updated_at?: string | null
          work_environment?: string | null
        }
        Update: {
          attends_secuela?: string | null
          candidate_email?: string | null
          candidate_id?: string | null
          candidate_name?: string | null
          church_environment?: string | null
          contact_frequency?: string | null
          created_at?: string
          god_evidence?: string | null
          home_environment?: string | null
          id?: string
          payment_owner?: string | null
          prayer_request?: string | null
          reunion_group?: string | null
          social_environment?: string | null
          sponsor_address?: string | null
          sponsor_church?: string | null
          sponsor_email?: string | null
          sponsor_name?: string | null
          sponsor_phone?: string | null
          sponsor_weekend?: string | null
          support_plan?: string | null
          updated_at?: string | null
          work_environment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'candidate_sponsorship_info_candidate_id_fkey'
            columns: ['candidate_id']
            isOneToOne: false
            referencedRelation: 'candidates'
            referencedColumns: ['id']
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          id: string
          status: Database['public']['Enums']['candidate_status']
          updated_at: string
          weekend_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database['public']['Enums']['candidate_status']
          updated_at?: string
          weekend_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database['public']['Enums']['candidate_status']
          updated_at?: string
          weekend_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'candidates_weekend_id_fkey'
            columns: ['weekend_id']
            isOneToOne: false
            referencedRelation: 'weekends'
            referencedColumns: ['id']
          },
        ]
      }
      community_encouragements: {
        Row: {
          created_at: string
          id: string
          message: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'community_encouragements_updated_by_user_id_fkey'
            columns: ['updated_by_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      contact_information: {
        Row: {
          created_at: string
          email_address: string | null
          id: string
          label: string | null
        }
        Insert: {
          created_at?: string
          email_address?: string | null
          id: string
          label?: string | null
        }
        Update: {
          created_at?: string
          email_address?: string | null
          id?: string
          label?: string | null
        }
        Relationships: []
      }
      deposit_payments: {
        Row: {
          created_at: string | null
          deposit_id: string
          id: string
          payment_transaction_id: string
        }
        Insert: {
          created_at?: string | null
          deposit_id: string
          id?: string
          payment_transaction_id: string
        }
        Update: {
          created_at?: string | null
          deposit_id?: string
          id?: string
          payment_transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deposit_payments_deposit_id_fkey'
            columns: ['deposit_id']
            isOneToOne: false
            referencedRelation: 'deposits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deposit_payments_payment_transaction_id_fkey'
            columns: ['payment_transaction_id']
            isOneToOne: false
            referencedRelation: 'payment_transaction'
            referencedColumns: ['id']
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          arrival_date: string | null
          created_at: string | null
          deposit_type: string
          id: string
          notes: string | null
          payout_id: string | null
          status: string
          transaction_count: number
        }
        Insert: {
          amount: number
          arrival_date?: string | null
          created_at?: string | null
          deposit_type: string
          id?: string
          notes?: string | null
          payout_id?: string | null
          status: string
          transaction_count?: number
        }
        Update: {
          amount?: number
          arrival_date?: string | null
          created_at?: string | null
          deposit_type?: string
          id?: string
          notes?: string | null
          payout_id?: string | null
          status?: string
          transaction_count?: number
        }
        Relationships: []
      }
      draft_weekend_roster: {
        Row: {
          cha_role: string
          created_at: string | null
          created_by: string
          finalized_at: string | null
          id: string
          rollo: string | null
          user_id: string
          weekend_id: string
        }
        Insert: {
          cha_role: string
          created_at?: string | null
          created_by: string
          finalized_at?: string | null
          id?: string
          rollo?: string | null
          user_id: string
          weekend_id: string
        }
        Update: {
          cha_role?: string
          created_at?: string | null
          created_by?: string
          finalized_at?: string | null
          id?: string
          rollo?: string | null
          user_id?: string
          weekend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'draft_weekend_roster_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'draft_weekend_roster_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'draft_weekend_roster_weekend_id_fkey'
            columns: ['weekend_id']
            isOneToOne: false
            referencedRelation: 'weekends'
            referencedColumns: ['id']
          },
        ]
      }
      email_log: {
        Row: {
          community_id: string | null
          created_at: string
          error_summary: string | null
          id: string
          recipient_count: number
          recipients: string[]
          resend_message_id: string | null
          sent_by_user_id: string | null
          status: string
          subject: string
          template: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          recipient_count?: number
          recipients?: string[]
          resend_message_id?: string | null
          sent_by_user_id?: string | null
          status: string
          subject: string
          template: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          recipient_count?: number
          recipients?: string[]
          resend_message_id?: string | null
          sent_by_user_id?: string | null
          status?: string
          subject?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_log_sent_by_user_id_fkey'
            columns: ['sent_by_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          datetime: string | null
          end_datetime: string | null
          id: number
          location: string | null
          title: string | null
          type: Database['public']['Enums']['event_type'] | null
          weekend_group_id: string | null
          weekend_id: string | null
        }
        Insert: {
          created_at?: string
          datetime?: string | null
          end_datetime?: string | null
          id?: number
          location?: string | null
          title?: string | null
          type?: Database['public']['Enums']['event_type'] | null
          weekend_group_id?: string | null
          weekend_id?: string | null
        }
        Update: {
          created_at?: string
          datetime?: string | null
          end_datetime?: string | null
          id?: number
          location?: string | null
          title?: string | null
          type?: Database['public']['Enums']['event_type'] | null
          weekend_group_id?: string | null
          weekend_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'events_weekend_group_id_fkey'
            columns: ['weekend_group_id']
            isOneToOne: false
            referencedRelation: 'weekend_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_weekend_id_fkey'
            columns: ['weekend_id']
            isOneToOne: false
            referencedRelation: 'weekends'
            referencedColumns: ['id']
          },
        ]
      }
      meeting_minutes_metadata: {
        Row: {
          created_at: string
          location: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          location: string
          storage_path: string
        }
        Update: {
          created_at?: string
          location?: string
          storage_path?: string
        }
        Relationships: []
      }
      payment_transaction: {
        Row: {
          balance_transaction_id: string | null
          charge_id: string | null
          created_at: string | null
          gross_amount: number
          id: string
          net_amount: number | null
          notes: string | null
          payment_intent_id: string | null
          payment_method: string
          payment_owner: string | null
          stripe_fee: number | null
          target_id: string | null
          target_type: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          weekend_id: string | null
        }
        Insert: {
          balance_transaction_id?: string | null
          charge_id?: string | null
          created_at?: string | null
          gross_amount: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          payment_intent_id?: string | null
          payment_method: string
          payment_owner?: string | null
          stripe_fee?: number | null
          target_id?: string | null
          target_type?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          weekend_id?: string | null
        }
        Update: {
          balance_transaction_id?: string | null
          charge_id?: string | null
          created_at?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          payment_intent_id?: string | null
          payment_method?: string
          payment_owner?: string | null
          stripe_fee?: number | null
          target_id?: string | null
          target_type?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          weekend_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payment_transaction_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_transaction_voided_by_fkey'
            columns: ['voided_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_transaction_weekend_id_fkey'
            columns: ['weekend_id']
            isOneToOne: false
            referencedRelation: 'weekends'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: {
          based_on_role_id: string | null
          description: string | null
          id: string
          label: string
          permissions: string[]
          type: Database['public']['Enums']['role_type']
        }
        Insert: {
          based_on_role_id?: string | null
          description?: string | null
          id?: string
          label: string
          permissions: string[]
          type?: Database['public']['Enums']['role_type']
        }
        Update: {
          based_on_role_id?: string | null
          description?: string | null
          id?: string
          label?: string
          permissions?: string[]
          type?: Database['public']['Enums']['role_type']
        }
        Relationships: [
          {
            foreignKeyName: 'roles_based_on_role_id_fkey'
            columns: ['based_on_role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by_user_id: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          value?: string
        }
        Relationships: []
      }
      team_form_completions: {
        Row: {
          completed_at: string
          form_type: string
          id: string
          weekend_group_member_id: string
        }
        Insert: {
          completed_at: string
          form_type: string
          id?: string
          weekend_group_member_id: string
        }
        Update: {
          completed_at?: string
          form_type?: string
          id?: string
          weekend_group_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_form_completions_weekend_group_member_id_fkey'
            columns: ['weekend_group_member_id']
            isOneToOne: false
            referencedRelation: 'weekend_group_members'
            referencedColumns: ['id']
          },
        ]
      }
      user_medical_profiles: {
        Row: {
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          medical_conditions: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_conditions?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_conditions?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_medical_profiles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          address: Json | null
          church_affiliation: string | null
          email: string | null
          essentials_training_date: string | null
          first_name: string | null
          gender: string | null
          id: string
          is_clergy: boolean
          last_name: string | null
          phone_number: string | null
          profile_photo_path: string | null
          profile_photo_updated_at: string | null
          special_gifts_and_skills: string[] | null
          weekend_attended: string | null
        }
        Insert: {
          address?: Json | null
          church_affiliation?: string | null
          email?: string | null
          essentials_training_date?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          is_clergy?: boolean
          last_name?: string | null
          phone_number?: string | null
          profile_photo_path?: string | null
          profile_photo_updated_at?: string | null
          special_gifts_and_skills?: string[] | null
          weekend_attended?: string | null
        }
        Update: {
          address?: Json | null
          church_affiliation?: string | null
          email?: string | null
          essentials_training_date?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_clergy?: boolean
          last_name?: string | null
          phone_number?: string | null
          profile_photo_path?: string | null
          profile_photo_updated_at?: string | null
          special_gifts_and_skills?: string[] | null
          weekend_attended?: string | null
        }
        Relationships: []
      }
      users_experience: {
        Row: {
          cha_role: string
          created_at: string
          id: string
          rollo: string | null
          updated_at: string
          user_id: string
          weekend_id: string | null
          weekend_reference: string
        }
        Insert: {
          cha_role: string
          created_at?: string
          id?: string
          rollo?: string | null
          updated_at?: string
          user_id: string
          weekend_id?: string | null
          weekend_reference: string
        }
        Update: {
          cha_role?: string
          created_at?: string
          id?: string
          rollo?: string | null
          updated_at?: string
          user_id?: string
          weekend_id?: string | null
          weekend_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_experience_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'users_experience_weekend_id_fkey'
            columns: ['weekend_id']
            isOneToOne: false
            referencedRelation: 'weekends'
            referencedColumns: ['id']
          },
        ]
      }
      weekend_group_fee_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          group_id: string
          id: number
          new_candidate_fee: number | null
          new_online_surcharge: number | null
          new_team_fee: number | null
          old_candidate_fee: number | null
          old_online_surcharge: number | null
          old_team_fee: number | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          group_id: string
          id?: never
          new_candidate_fee?: number | null
          new_online_surcharge?: number | null
          new_team_fee?: number | null
          old_candidate_fee?: number | null
          old_online_surcharge?: number | null
          old_team_fee?: number | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          group_id?: string
          id?: never
          new_candidate_fee?: number | null
          new_online_surcharge?: number | null
          new_team_fee?: number | null
          old_candidate_fee?: number | null
          old_online_surcharge?: number | null
          old_team_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'weekend_group_fee_changes_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'weekend_group_fee_changes_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'weekend_groups'
            referencedColumns: ['id']
          },
        ]
      }
      weekend_group_members: {
        Row: {
          attended_secuela_at: string | null
          created_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          attended_secuela_at?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          attended_secuela_at?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'weekend_group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'weekend_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'weekend_group_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      weekend_groups: {
        Row: {
          candidate_fee: number | null
          created_at: string | null
          id: string
          number: number
          online_surcharge: number | null
          team_fee: number | null
        }
        Insert: {
          candidate_fee?: number | null
          created_at?: string | null
          id: string
          number: number
          online_surcharge?: number | null
          team_fee?: number | null
        }
        Update: {
          candidate_fee?: number | null
          created_at?: string | null
          id?: string
          number?: number
          online_surcharge?: number | null
          team_fee?: number | null
        }
        Relationships: []
      }
      weekend_roster: {
        Row: {
          additional_cha_role: string | null
          cha_role: string | null
          created_at: string
          group_member_id: string | null
          id: string
          rollo: string | null
          special_needs: string | null
          status: string | null
          user_id: string | null
          weekend_id: string | null
        }
        Insert: {
          additional_cha_role?: string | null
          cha_role?: string | null
          created_at?: string
          group_member_id?: string | null
          id?: string
          rollo?: string | null
          special_needs?: string | null
          status?: string | null
          user_id?: string | null
          weekend_id?: string | null
        }
        Update: {
          additional_cha_role?: string | null
          cha_role?: string | null
          created_at?: string
          group_member_id?: string | null
          id?: string
          rollo?: string | null
          special_needs?: string | null
          status?: string | null
          user_id?: string | null
          weekend_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'weekend_roster_group_member_id_fkey'
            columns: ['group_member_id']
            isOneToOne: false
            referencedRelation: 'weekend_group_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'weekend_roster_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'weekend_roster_weekend_id_fkey'
            columns: ['weekend_id']
            isOneToOne: false
            referencedRelation: 'weekends'
            referencedColumns: ['id']
          },
        ]
      }
      weekends: {
        Row: {
          created_at: string
          end_date: string
          group_id: string | null
          id: string
          start_date: string
          status: string | null
          title: string | null
          type: Database['public']['Enums']['weekend_type']
        }
        Insert: {
          created_at?: string
          end_date: string
          group_id?: string | null
          id?: string
          start_date: string
          status?: string | null
          title?: string | null
          type: Database['public']['Enums']['weekend_type']
        }
        Update: {
          created_at?: string
          end_date?: string
          group_id?: string | null
          id?: string
          start_date?: string
          status?: string | null
          title?: string | null
          type?: Database['public']['Enums']['weekend_type']
        }
        Relationships: [
          {
            foreignKeyName: 'weekends_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'weekend_groups'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_cha_has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      auth_user_has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      role_grants_full_access: {
        Args: { target_role_id: string }
        Returns: boolean
      }
    }
    Enums: {
      candidate_status:
        | 'sponsored'
        | 'awaiting_forms'
        | 'pending_approval'
        | 'awaiting_payment'
        | 'confirmed'
        | 'rejected'
      event_type:
        | 'meeting'
        | 'weekend'
        | 'serenade'
        | 'sendoff'
        | 'closing'
        | 'other'
        | 'secuela'
      permissions: 'READ_MEDICAL_HISTORY'
      role_type: 'INDIVIDUAL' | 'COMMITTEE'
      weekend_type: 'MENS' | 'WOMENS'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      candidate_status: [
        'sponsored',
        'awaiting_forms',
        'pending_approval',
        'awaiting_payment',
        'confirmed',
        'rejected',
      ],
      event_type: [
        'meeting',
        'weekend',
        'serenade',
        'sendoff',
        'closing',
        'other',
        'secuela',
      ],
      permissions: ['READ_MEDICAL_HISTORY'],
      role_type: ['INDIVIDUAL', 'COMMITTEE'],
      weekend_type: ['MENS', 'WOMENS'],
    },
  },
} as const
