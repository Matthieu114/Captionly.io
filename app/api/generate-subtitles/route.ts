import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Server-side Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { videoId } = body

        if (!videoId) {
            return NextResponse.json(
                { error: "Video ID is required" },
                { status: 400 }
            )
        }

        // Create a Supabase client for server-side auth
        const cookieStore = cookies()
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                },
            }
        )

        // Get the current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            )
        }

        // Check if the video exists and belongs to the user
        const { data: video, error: videoError } = await supabaseAdmin
            .from('videos')
            .select('id, status, storage_path, user_id')
            .eq('id', videoId)
            .eq('user_id', user.id)
            .single()

        if (videoError || !video) {
            return NextResponse.json(
                { error: "Video not found or access denied" },
                { status: 404 }
            )
        }

        // Check if video is ready for transcription
        if (video.status !== 'ready') {
            return NextResponse.json(
                { error: `Video is not ready for transcription. Current status: ${video.status}` },
                { status: 400 }
            )
        }

        // Update video status to transcribing
        const { error: updateError } = await supabaseAdmin
            .from('videos')
            .update({ status: 'transcribing' })
            .eq('id', videoId)

        if (updateError) {
            console.error('Error updating video status:', updateError)
            return NextResponse.json(
                { error: "Failed to update video status" },
                { status: 500 }
            )
        }

        // TODO: Trigger actual transcription process
        // This is where we'll integrate with OpenAI Whisper or AssemblyAI
        // For now, we'll just simulate the process
        
        // In a real implementation, you would:
        // 1. Get the video file from Supabase Storage
        // 2. Send it to transcription service (Whisper/AssemblyAI)
        // 3. Process the response and save captions
        // 4. Update video status to 'ready' with captions

        console.log(`Started transcription for video ${videoId}`)

        return NextResponse.json({
            success: true,
            message: "Subtitle generation started",
            videoId: videoId
        })

    } catch (error) {
        console.error('Error in generate-subtitles API:', error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
} 