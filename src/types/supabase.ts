/// <reference types="vite/client" />
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          created_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: number
          user_id: string
          name: string
          color_code: string | null
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          color_code?: string | null
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          color_code?: string | null
          is_active?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tags: {
        Row: {
          id: number
          user_id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      section_groups: {
        Row: {
          id: number
          user_id: string
          name: string
          rrule: string | null
          is_default: boolean
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          rrule?: string | null
          is_default?: boolean
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          rrule?: string | null
          is_default?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_groups_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      calendar_section_groups: {
        Row: {
          id: number
          user_id: string
          target_date: string
          section_group_id: number
          is_manually_set: boolean
          updated_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          target_date: string
          section_group_id: number
          is_manually_set?: boolean
          updated_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          target_date?: string
          section_group_id?: number
          is_manually_set?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_section_groups_section_group_id_fkey"
            columns: ["section_group_id"]
            referencedRelation: "section_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_section_groups_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sections: {
        Row: {
          id: number
          section_group_id: number
          name: string
          start_time: string
          end_time: string
        }
        Insert: {
          id?: number
          section_group_id: number
          name: string
          start_time: string
          end_time: string
        }
        Update: {
          id?: number
          section_group_id?: number
          name?: string
          start_time?: string
          end_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_section_group_id_fkey"
            columns: ["section_group_id"]
            referencedRelation: "section_groups"
            referencedColumns: ["id"]
          }
        ]
      }
      checklists: {
        Row: {
          id: number
          user_id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      checklist_items: {
        Row: {
          id: number
          checklist_id: number
          content: string
          sort_order: number
        }
        Insert: {
          id?: number
          checklist_id: number
          content: string
          sort_order?: number
        }
        Update: {
          id?: number
          checklist_id?: number
          content?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          }
        ]
      }
      routines: {
        Row: {
          id: number
          user_id: string
          project_id: number | null
          title: string
          scheduled_time: string
          estimated_duration: number
          rrule: string
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          project_id?: number | null
          title: string
          scheduled_time: string
          estimated_duration?: number
          rrule: string
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          project_id?: number | null
          title?: string
          scheduled_time?: string
          estimated_duration?: number
          rrule?: string
          is_active?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routines_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      routine_tags: {
        Row: {
          routine_id: number
          tag_id: number
        }
        Insert: {
          routine_id: number
          tag_id: number
        }
        Update: {
          routine_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_tags_routine_id_fkey"
            columns: ["routine_id"]
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
      routine_checklists: {
        Row: {
          routine_id: number
          checklist_id: number
        }
        Insert: {
          routine_id: number
          checklist_id: number
        }
        Update: {
          routine_id?: number
          checklist_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_checklists_checklist_id_fkey"
            columns: ["checklist_id"]
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_checklists_routine_id_fkey"
            columns: ["routine_id"]
            referencedRelation: "routines"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: number
          user_id: string
          routine_id: number | null
          section_group_id: number
          section_id: number | null
          project_id: number | null
          title: string
          target_date: string
          scheduled_time: string
          estimated_duration: number
          sort_order: number
          status: string
          memo: string | null
          is_planned: boolean
          satisfaction_rating: number | null
          skip_reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          routine_id?: number | null
          section_group_id: number
          section_id?: number | null
          project_id?: number | null
          title: string
          target_date: string
          scheduled_time?: string
          estimated_duration?: number
          sort_order?: number
          status?: string
          memo?: string | null
          is_planned?: boolean
          satisfaction_rating?: number | null
          skip_reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          routine_id?: number | null
          section_group_id?: number
          section_id?: number | null
          project_id?: number | null
          title?: string
          target_date?: string
          scheduled_time?: string
          estimated_duration?: number
          sort_order?: number
          status?: string
          memo?: string | null
          is_planned?: boolean
          satisfaction_rating?: number | null
          skip_reason?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_routine_id_fkey"
            columns: ["routine_id"]
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_section_group_id_fkey"
            columns: ["section_group_id"]
            referencedRelation: "section_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_section_id_fkey"
            columns: ["section_id"]
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      task_tags: {
        Row: {
          task_id: number
          tag_id: number
        }
        Insert: {
          task_id: number
          tag_id: number
        }
        Update: {
          task_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      task_checklists: {
        Row: {
          task_id: number
          checklist_id: number
        }
        Insert: {
          task_id: number
          checklist_id: number
        }
        Update: {
          task_id?: number
          checklist_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_checklist_id_fkey"
            columns: ["checklist_id"]
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      task_checklist_item_states: {
        Row: {
          task_id: number
          checklist_item_id: number
          is_completed: boolean
          completed_at: string | null
        }
        Insert: {
          task_id: number
          checklist_item_id: number
          is_completed?: boolean
          completed_at?: string | null
        }
        Update: {
          task_id?: number
          checklist_item_id?: number
          is_completed?: boolean
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_item_states_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklist_item_states_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      task_logs: {
        Row: {
          id: number
          task_id: number
          started_at: string
          ended_at: string | null
          actual_duration: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          task_id: number
          started_at: string
          ended_at?: string | null
          actual_duration?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          task_id?: number
          started_at?: string
          ended_at?: string | null
          actual_duration?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
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
