export type Database = {
  public: {
    Tables: {
      videos: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          status: 'uploading' | 'ready' | 'error' | 'transcribing' | 'rendering' | 'rendered'
          processed_url: string | null
          captioned_url: string | null
          storage_path: string
          original_url: string | null
          thumbnail_url: string | null
          duration: number
          size: number
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          title: string
          status: 'uploading' | 'ready' | 'error' | 'transcribing' | 'rendering' | 'rendered'
          processed_url?: string | null
          captioned_url?: string | null
          storage_path?: string
          original_url?: string | null
          thumbnail_url?: string | null
          duration?: number
          size: number
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          title?: string
          status?: 'uploading' | 'ready' | 'error' | 'transcribing' | 'rendering' | 'rendered'
          processed_url?: string | null
          captioned_url?: string | null
          storage_path?: string
          original_url?: string | null
          thumbnail_url?: string | null
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