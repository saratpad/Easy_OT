export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Role types ─────────────────────────────────────────────────────────────
export type UserRole =
  | 'super_admin'
  | 'sub_admin'
  | 'executive'
  | 'director'
  | 'supervisor'
  | 'employee'

export type OTStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalStatus = 'approved' | 'rejected'
export type DocumentFormat = 'pdf' | 'docx'

// ─── Role helpers ────────────────────────────────────────────────────────────
export const ADMIN_ROLES: UserRole[] = ['super_admin', 'sub_admin']
export const APPROVER_ROLES: UserRole[] = ['supervisor', 'director', 'executive', 'super_admin', 'sub_admin']

export interface Database {
  public: {
    Tables: {
      divisions: {
        Row: {
          id: string
          name: string
          line_channel_access_token: string | null
          line_target_id: string | null
          // เพิ่มใหม่
          executive_ids: string[] | null       // UUID[] ของ executive ที่ดูแลกองนี้
          drive_folder_id: string | null       // Google Drive folder ID สำหรับเก็บ PDF
          doc_number_prefix: string | null     // เช่น 'กนย'
          recipient_name: string | null        // เช่น 'เลขาธิการนายกรัฐมนตรี'
          phone: string | null                 // เบอร์โทรศัพท์กอง
          created_at: string
          updated_at: string
          is_deleted: boolean
        }
        Insert: {
          id?: string
          name: string
          line_channel_access_token?: string | null
          line_target_id?: string | null
          executive_ids?: string[] | null
          drive_folder_id?: string | null
          doc_number_prefix?: string | null
          recipient_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
        Update: {
          id?: string
          name?: string
          line_channel_access_token?: string | null
          line_target_id?: string | null
          executive_ids?: string[] | null
          drive_folder_id?: string | null
          doc_number_prefix?: string | null
          recipient_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
      }
      groups: {
        Row: {
          id: string
          division_id: string
          name: string
          created_at: string
          updated_at: string
          is_deleted: boolean
        }
        Insert: {
          id?: string
          division_id: string
          name: string
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
        Update: {
          id?: string
          division_id?: string
          name?: string
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
      }
      users: {
        Row: {
          id: string
          division_id: string | null
          group_id: string | null
          role: UserRole
          line_uid: string | null
          full_name: string | null
          position: string | null
          seniority_level: number | null
          signature_url: string | null
          created_at: string
          updated_at: string
          is_deleted: boolean
        }
        Insert: {
          id: string
          division_id?: string | null
          group_id?: string | null
          role?: UserRole
          line_uid?: string | null
          full_name?: string | null
          position?: string | null
          seniority_level?: number | null
          signature_url?: string | null
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
        Update: {
          id?: string
          division_id?: string | null
          group_id?: string | null
          role?: UserRole
          line_uid?: string | null
          full_name?: string | null
          position?: string | null
          seniority_level?: number | null
          signature_url?: string | null
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
      }
      ot_requests: {
        Row: {
          id: string
          user_id: string
          division_id: string
          group_id: string | null
          fiscal_year: string
          start_time: string
          end_time: string
          total_hours: number
          reason: string | null
          current_step: number
          status: OTStatus
          pdf_url: string | null
          actual_start_time: string | null
          actual_end_time: string | null
          actual_total_hours: number | null
          is_certified: boolean
          is_worked: boolean
          certification_note: string | null
          certification_step: number
          created_at: string
          updated_at: string
          is_deleted: boolean
        }
        Insert: {
          id?: string
          user_id: string
          division_id: string
          group_id?: string | null
          fiscal_year: string
          start_time: string
          end_time: string
          total_hours: number
          reason?: string | null
          current_step?: number
          status?: OTStatus
          pdf_url?: string | null
          actual_start_time?: string | null
          actual_end_time?: string | null
          actual_total_hours?: number | null
          is_certified?: boolean
          is_worked?: boolean
          certification_note?: string | null
          certification_step?: number
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          division_id?: string
          group_id?: string | null
          fiscal_year?: string
          start_time?: string
          end_time?: string
          total_hours?: number
          reason?: string | null
          current_step?: number
          status?: OTStatus
          pdf_url?: string | null
          actual_start_time?: string | null
          actual_end_time?: string | null
          actual_total_hours?: number | null
          is_certified?: boolean
          is_worked?: boolean
          certification_note?: string | null
          certification_step?: number
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
        }
      }
      approval_routes: {
        Row: {
          id: string
          division_id: string
          step_order: number
          target_role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          division_id: string
          step_order: number
          target_role: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          division_id?: string
          step_order?: number
          target_role?: UserRole
          created_at?: string
        }
      }
      ot_request_approvals: {
        Row: {
          id: string
          request_id: string
          approver_id: string
          step_order: number
          status: ApprovalStatus
          comment: string | null
          acted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          approver_id: string
          step_order: number
          status: ApprovalStatus
          comment?: string | null
          acted_at: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          approver_id?: string
          step_order?: number
          status?: ApprovalStatus
          comment?: string | null
          acted_at?: string
          created_at?: string
        }
      }
      ot_documents: {
        Row: {
          id: string
          division_id: string
          created_by: string
          fiscal_year: string
          month_year: string
          doc_number: string | null
          request_ids: string[]
          format: DocumentFormat
          document_url: string | null
          line_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          division_id: string
          created_by: string
          fiscal_year: string
          month_year: string
          doc_number?: string | null
          request_ids: string[]
          format?: DocumentFormat
          document_url?: string | null
          line_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          division_id?: string
          created_by?: string
          fiscal_year?: string
          month_year?: string
          doc_number?: string | null
          request_ids?: string[]
          format?: DocumentFormat
          document_url?: string | null
          line_sent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
          updated_at?: string
        }
      }
    }
  }
}
