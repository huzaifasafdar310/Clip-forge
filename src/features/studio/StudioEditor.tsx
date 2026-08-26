import React, { useState, useEffect } from 'react';
import { Download, UploadCloud, Film, Sparkles, Check, Loader2 } from 'lucide-react';
import { Clip, CaptionStyle } from '@/types/api';
import { AspectRatio, AspectRatioSwitcher } from './AspectRatioSwitcher';
import { SegmentList } from './SegmentList';
import { VideoPlayer } from './VideoPlayer';
import { TimelineScrubber } from './TimelineScrubber';
import { CaptionControls } from './CaptionControls';
import { MetadataEditor } from './MetadataEditor';
import { ExportModal } from './ExportModal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { storageService } from '@/services/storageService';

interface StudioEditorProps {
  clips: Clip[];
  initialActiveClipId?: number | null;
  onClipsUpdated?: (clips: Clip[]) => void;
  onStartUploadJob?: (clips: Clip[]) => void;
}

export const StudioEditor: React.FC<StudioEditorProps> = ({
  clips: initialClips,
  initialActiveClipId,
  onClipsUpdated,
  onStartUploadJob,
}) => {
  const { isAuthenticated, login } = useAuth();
  const [clips, setClips] = useState<Clip[]>(() => {
    if (initialClips && initialClips.length > 0) return initialClips;
    return storageService.getClips();
  });
  const [activeClipId, setActiveClipId] = useState<number | null>(() => {
    if (initialActiveClipId) return initialActiveClipId;
    const current = initialClips && initialClips.length > 0 ? initialClips : storageService.getClips();
    return current.length > 0 ? current[0].id : null;
  });

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('tiktok_pop');
  const [fontSize, setFontSize] = useState<number>(22);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);

  // Rendering & Export state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStatusText, setRenderStatusText] = useState<string>('');

  // Sync incoming clips
  useEffect(() => {
    if (initialClips && initialClips.length > 0) {
      setClips(initialClips);
      if (!activeClipId) {
        setActiveClipId(initialClips[0].id);
      }
    } else {
      const stored = storageService.getClips();
      if (stored.length > 0) {
        setClips(stored);
        if (!activeClipId) {
          setActiveClipId(stored[0].id);
        }
      }
    }
  }, [initialClips]);

  const activeClip = clips.find((c) => c.id === activeClipId) || (clips.length > 0 ? clips[0] : null);

  // Update active clip caption style in DB
  const handleCaptionStyleChange = async (style: CaptionStyle) => {
    setCaptionStyle(style);
    if (activeClip) {
      const updatedClips = clips.map((c) =>
        c.id === activeClip.id ? { ...c, caption_style: style } : c
      );
      setClips(updatedClips);
      onClipsUpdated?.(updatedClips);

      try {
        await api.updateClipCaptionStyle(activeClip.id, { caption_style: style });
      } catch (err) {
        console.warn('Caption style sync note:', err);
      }
    }
  };

  const handleUpdateClipMetadata = (updates: Partial<Clip>) => {
    if (!activeClip) return;
    const updatedClips = clips.map((c) =>
      c.id === activeClip.id ? { ...c, ...updates } : c
    );
    setClips(updatedClips);
    onClipsUpdated?.(updatedClips);
  };

  // Render the active clip into a vertical 9:16 Blob
  const handleRenderActiveClip = async (): Promise<string> => {
    if (!activeClip) throw new Error('No active clip selected');
    if (activeClip.render_status === 'rendered' && activeClip.file_path?.startsWith('blob:')) {
      return activeClip.file_path;
    }

    setIsRendering(true);
    setRenderProgress(10);
    setRenderStatusText('Slicing video frame stream & cropping to 9:16 vertical...');

    try {
      const result = await api.renderClip(activeClip.id, (percent) => {
        setRenderProgress(percent);
        setRenderStatusText(`Burning kinetic typography subtitles (${percent}%)...`);
      });

      const updatedClips = clips.map((c) => (c.id === activeClip.id ? result.clip : c));
      setClips(updatedClips);
      onClipsUpdated?.(updatedClips);

      setRenderProgress(100);
      setRenderStatusText('Render completed!');
      setTimeout(() => setIsRendering(false), 600);

      return result.url;
    } catch (err: any) {
      setIsRendering(false);
      alert(`Render note: ${err.message}`);
      throw err;
    }
  };

  // Direct Download with on-the-fly rendering if unrendered
  const handleDirectDownload = async () => {
    if (!activeClip) return;
    try {
      let downloadUrl = activeClip.file_path;
      if (activeClip.render_status !== 'rendered' || !downloadUrl || !downloadUrl.startsWith('blob:')) {
        downloadUrl = await handleRenderActiveClip();
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `clip_${activeClip.id}_9x16.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Download error:', err);
    }
  };

  // Post to YouTube with validation
  const handlePostToYouTube = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    if (!activeClip) return;

    try {
      if (activeClip.render_status !== 'rendered') {
        await handleRenderActiveClip();
      }
      if (onStartUploadJob) {
        onStartUploadJob([activeClip]);
      }
    } catch (err: any) {
      console.error('YouTube post prep error:', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] bg-surface-1 border border-border-subtle rounded-3xl overflow-hidden shadow-2xl">
      {/* Top Action Bar */}
      <div className="h-14 bg-surface-2 border-b border-border-subtle px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono bg-surface-0 px-3 py-1 rounded-lg text-primary border border-border-subtle font-bold">
            {aspectRatio} Reframe
          </span>
          <span className="text-xs font-bold text-foreground hidden md:inline truncate max-w-sm">
            {activeClip?.title || 'Clip Studio Workspace'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Export / Render Modal Trigger */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExportOpen(true)}
            disabled={!activeClip || isRendering}
            className="text-xs font-mono"
          >
            <Film className="w-3.5 h-3.5 text-primary" />
            <span>Export & Render</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDirectDownload}
            disabled={!activeClip || isRendering}
            className="text-xs font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download MP4</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handlePostToYouTube}
            disabled={!activeClip || isRendering}
            className="text-xs font-bold"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Post to YouTube</span>
          </Button>
        </div>
      </div>

      {/* 3-Column Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-surface-0 relative">
        {/* Rendering Overlay */}
        {isRendering && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">In-Browser Video Engine</h3>
              <p className="text-xs text-muted-foreground font-mono">{renderStatusText}</p>
            </div>
            <div className="w-64 bg-surface-2 h-2 rounded-full overflow-hidden border border-border-subtle">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Left Column: Segments List (3 Cols) */}
        <div className="lg:col-span-3 h-full overflow-hidden">
          <SegmentList
            clips={clips}
            activeClipId={activeClip?.id || null}
            onSelectClip={(c) => {
              setActiveClipId(c.id);
              setCurrentTime(0);
              setIsPlaying(false);
            }}
          />
        </div>

        {/* Center Column: Video Stage & Timeline (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between p-4 overflow-hidden bg-surface-0/60 border-r border-border-subtle">
          <VideoPlayer
            clip={activeClip}
            aspectRatio={aspectRatio}
            captionStyle={captionStyle}
            fontSize={fontSize}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onDurationChange={(d) => setDuration(d)}
          />

          <TimelineScrubber
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSeek={(t) => {
              setCurrentTime(t);
            }}
            segmentLabel={
              activeClip ? `Segment: ${activeClip.startTime} - ${activeClip.endTime}` : undefined
            }
          />
        </div>

        {/* Right Column: Properties & Caption Customizer (3 Cols) */}
        <div className="lg:col-span-3 h-full bg-surface-1 p-4 overflow-y-auto space-y-5">
          <AspectRatioSwitcher
            value={aspectRatio}
            onChange={(r) => setAspectRatio(r)}
          />

          <CaptionControls
            currentStyle={captionStyle}
            fontSize={fontSize}
            onStyleChange={handleCaptionStyleChange}
            onFontSizeChange={(size) => setFontSize(size)}
          />

          {activeClip && (
            <MetadataEditor
              clip={activeClip}
              onUpdate={handleUpdateClipMetadata}
            />
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        clip={activeClip}
        onDownload={handleDirectDownload}
        onUploadYouTube={handlePostToYouTube}
      />
    </div>
  );
};
