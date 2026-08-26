import React, { useRef, useEffect } from 'react';
import { Play, Pause, Sparkles, Youtube, Film, CheckCircle } from 'lucide-react';
import { AspectRatio } from './AspectRatioSwitcher';
import { CaptionStyle, Clip } from '@/types/api';
import { cn, formatSecondsToTimestamp } from '@/lib/utils';
import { api } from '@/lib/api';

interface VideoPlayerProps {
  clip: Clip | null;
  aspectRatio: AspectRatio;
  captionStyle: CaptionStyle;
  fontSize: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  clip,
  aspectRatio,
  captionStyle,
  fontSize,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onTimeUpdate,
  onDurationChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Synchronize play state for HTML5 video
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Video container sizing based on aspect ratio
  const containerClasses: Record<AspectRatio, string> = {
    '9:16': 'aspect-[9/16] h-[360px] sm:h-[440px]',
    '1:1': 'aspect-square h-[320px] sm:h-[380px]',
    '16:9': 'aspect-[16/9] w-full max-w-[540px]',
  };

  // Caption styling based on preset
  const renderCaptionOverlay = () => {
    const textToDisplay =
      clip?.transcript_text ||
      clip?.title ||
      'THIS IS A VIRAL SHORT CLIP 🔥';

    if (captionStyle === 'tiktok_pop') {
      return (
        <div className="z-20 text-center px-3 py-2 rounded-xl transition-all duration-300 mt-auto mb-3 pointer-events-none">
          <p
            style={{ fontSize: `${fontSize}px`, textShadow: '0 0 12px rgba(250,204,21,0.7)' }}
            className="font-black tracking-tight uppercase text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-all"
          >
            {textToDisplay}
          </p>
        </div>
      );
    } else if (captionStyle === 'minimal') {
      return (
        <div className="z-20 text-center px-4 py-1.5 bg-black/80 backdrop-blur-md rounded-lg border border-white/15 transition-all duration-300 mt-auto mb-3 mx-auto max-w-[90%] pointer-events-none">
          <p
            style={{ fontSize: `${Math.max(12, fontSize - 4)}px` }}
            className="font-semibold tracking-normal text-white"
          >
            {textToDisplay}
          </p>
        </div>
      );
    } else {
      // 'bounce' / kinetic cyber
      return (
        <div className="z-20 text-center px-3 py-2 rounded-xl transition-all duration-300 mt-auto mb-3 pointer-events-none">
          <p
            style={{ fontSize: `${fontSize}px`, textShadow: '0 0 14px rgba(56,189,248,0.7)' }}
            className="font-black italic tracking-tighter uppercase text-secondary drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] animate-pulse-slow"
          >
            {textToDisplay}
          </p>
        </div>
      );
    }
  };

  // Determine media source with accurate render_status gating
  const isCutRendered =
    clip?.render_status === 'rendered' &&
    !!clip?.file_path &&
    clip.file_path.startsWith('blob:');

  const isLocalSource =
    clip?.local_source ||
    clip?.video_url?.startsWith('blob:') ||
    clip?.video_url?.startsWith('data:');

  let directVideoUrl: string | null = null;
  if (isCutRendered && clip?.file_path) {
    directVideoUrl = clip.file_path;
  } else if (isLocalSource && (clip?.video_url || clip?.file_path?.startsWith('blob:'))) {
    directVideoUrl = clip.video_url || clip.file_path || null;
  }

  // YouTube embed fallback for un-cut YouTube clips
  const isYouTubeClip = !isCutRendered && !isLocalSource && !!clip?.video_id;
  const youtubeEmbedUrl = isYouTubeClip
    ? `https://www.youtube-nocookie.com/embed/${clip.video_id}?start=${Math.floor(
        clip.start_seconds
      )}&end=${Math.ceil(clip.end_seconds)}&autoplay=1&controls=1&rel=0&modestbranding=1`
    : null;

  return (
    <div className="flex-1 flex items-center justify-center relative min-h-[360px] p-2">
      {/* Video Container Frame */}
      <div
        className={cn(
          'relative bg-black rounded-3xl border-2 border-border-muted overflow-hidden shadow-2xl transition-all duration-300 flex flex-col justify-between p-4 group',
          containerClasses[aspectRatio]
        )}
      >
        {/* Top Info Overlays */}
        <div className="flex justify-between items-center z-20 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-primary border border-primary/30 flex items-center gap-1.5">
            {isCutRendered ? (
              <>
                <CheckCircle className="w-3 h-3 text-cyan-400" />
                <span className="text-cyan-400">9:16 Rendered Cut</span>
              </>
            ) : isYouTubeClip ? (
              <>
                <Youtube className="w-3 h-3 text-red-500 fill-current" />
                <span>YouTube Live Preview ({clip?.startTime}-{clip?.endTime})</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                <span>Local Video Preview (Unrendered)</span>
              </>
            )}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/10">
            {formatSecondsToTimestamp(currentTime)} / {formatSecondsToTimestamp(duration)}
          </span>
        </div>

        {/* Video / Visualizer / Embed Layer */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
          {directVideoUrl ? (
            <video
              ref={videoRef}
              src={directVideoUrl}
              playsInline
              controls={false}
              onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
              className="w-full h-full object-cover"
            />
          ) : isYouTubeClip && youtubeEmbedUrl ? (
            <iframe
              src={youtubeEmbedUrl}
              title={clip?.title || 'YouTube Segment Preview'}
              className="w-full h-full object-cover border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center my-auto relative text-center p-4">
              <div className="w-20 h-20 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center shadow-lg">
                <Film className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <p className="text-xs font-bold text-foreground mt-3">Select a Clip to Play</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                AI viral segments will stream here automatically
              </p>
            </div>
          )}
        </div>

        {/* Live Subtitle Overlay */}
        {directVideoUrl && renderCaptionOverlay()}

        {/* Play/Pause Center Trigger for direct video */}
        {directVideoUrl && (
          <div
            onClick={onTogglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer z-30 opacity-0 group-hover:opacity-100"
          >
            <div className="w-14 h-14 rounded-full bg-primary text-black flex items-center justify-center shadow-glow transform scale-95 group-hover:scale-105 transition-transform">
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-1" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
