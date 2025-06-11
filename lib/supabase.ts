import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      videos: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          status: 'uploading' | 'processing' | 'ready' | 'error'
          original_url: string
          processed_url: string | null
          duration: number
          size: number
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          title: string
          status: 'uploading' | 'processing' | 'ready' | 'error'
          original_url: string
          processed_url?: string | null
          duration: number
          size: number
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          title?: string
          status?: 'uploading' | 'processing' | 'ready' | 'error'
          original_url?: string
          processed_url?: string | null
          duration?: number
          size?: number
        }
      }
      captions: {
        Row: {
          id: string
          created_at: string
          video_id: string
          start_time: number
          end_time: number
          text: string
        }
        Insert: {
          id?: string
          created_at?: string
          video_id: string
          start_time: number
          end_time: number
          text: string
        }
        Update: {
          id?: string
          created_at?: string
          video_id?: string
          start_time?: number
          end_time?: number
          text?: string
        }
      }
    }
  }
} 