import Image from 'next/image';
import { FileVideo, Loader2 } from 'lucide-react';
import { useThumbnailUrl } from '@/lib/useThumbnailUrl';

interface ThumbnailImageProps {
    videoId: string;
    title: string;
    hasThumbnail: boolean;
    width?: number;
    height?: number;
    className?: string;
}

export function ThumbnailImage({
    videoId,
    title,
    hasThumbnail,
    width = 192,
    height = 108,
    className = "object-cover w-full h-full"
}: ThumbnailImageProps) {
    const { thumbnailUrl, loading, error } = useThumbnailUrl(videoId, hasThumbnail);

    // Show loading spinner while fetching signed URL
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
        );
    }

    // Show image if we have a valid signed URL
    if (thumbnailUrl && !error) {
        return (
            <Image
                src={thumbnailUrl}
                alt={title}
                width={width}
                height={height}
                className={className}
                onError={() => console.error(`Failed to load thumbnail for video: ${videoId}`)}
                onLoad={() => console.log(`Thumbnail loaded successfully for video: ${videoId}`)}
            />
        );
    }

    // Fallback to file icon
    return (
        <div className="flex items-center justify-center h-full">
            <FileVideo className="w-10 h-10 text-slate-500" />
        </div>
    );
} 