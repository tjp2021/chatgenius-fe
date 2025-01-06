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
          name: string
          image_url: string | null
          role: 'USER' | 'ADMIN'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          email: string
          name: string
          image_url?: string | null
          role?: 'USER' | 'ADMIN'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          image_url?: string | null
          role?: 'USER' | 'ADMIN'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
    }
  }
} 