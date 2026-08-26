import React, { useState, useEffect } from 'react';
import { StudioEditor } from '@/features/studio/StudioEditor';
import { ProcessingModal, UploadCompletionDetails } from '@/features/studio/ProcessingModal';
import { Clip } from '@/types/api';
import { api } from '@/lib/api';
import { storageService } from '@/services/storageService';
import { useAuth } from '@/context/AuthContext';

interface StudioPageProps {
  clips: Clip[];
  activeClipId: number | null;
  onClipsUpdated: (clips: Clip[]) => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({
  clips,
  activeClipId,
  onClipsUpdated,
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(10);
  const [uploadStatus, setUploadStatus] = useState('Initiating background publishing queue...');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentClipLabel, setCurrentClipLabel] = useState<string>('');
  const [completionDetails, setCompletionDetails] = useState<UploadCompletionDetails | null>(null);

  const uploadSteps = [
    { label: 'Preparing Clip & YouTube Shorts Metadata', description: 'Formatting viral tags, #Shorts, and description' },
    { label: 'Rendering 9:16 Vertical Video with Kinetic Captions', description: 'Client-side Canvas & MediaRecorder engine' },
    { label: 'Authorizing Resumable Upload Session', description: 'Google Identity Services OAuth 2.0' },
    { label: 'Streaming MP4 Video & Publishing to YouTube Channel', description: 'YouTube Data API v3' },
  ];

  // Restore clips from storage if navigating directly or refreshing /app/studio
  useEffect(() => {
    if (!clips || clips.length === 0) {
      const stored = storageService.getClips();
      if (stored && stored.length > 0) {
        onClipsUpdated(stored);
      }
    }
  }, [clips, onClipsUpdated]);

  const handleStartUploadJob = async (selectedClips: Clip[]) => {
    if (!user?.accessToken) return;
    const targetClip = selectedClips[0];

    setIsUploading(true);
    setUploadError(null);
    setCompletionDetails(null);
    setUploadStep(1);
    setUploadProgress(20);
    setCurrentClipLabel(targetClip?.title || 'Selected Clip');
    setUploadStatus(`Preparing metadata for "${targetClip?.title || 'Viral Short'}"...`);

    try {
      const res = await api.startUploadJob(selectedClips, user.accessToken, (msg, pct) => {
        setUploadStatus(msg);
        setUploadProgress(pct);
        if (pct < 40) setUploadStep(2);
        else if (pct < 80) setUploadStep(3);
        else setUploadStep(4);
      });

      const jobId = res.job_id;

      // Real-time polling
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await api.getJobStatus(jobId);
          if (statusRes.status === 'processing') {
            setUploadStep(3);
            setUploadProgress((prev) => Math.min(85, prev + 5));
          } else if (statusRes.status === 'completed') {
            clearInterval(pollInterval);
            setUploadStep(4);
            setUploadProgress(100);
            setUploadStatus('Upload complete! Published successfully as a YouTube Short.');

            const uploaded = statusRes.results?.[0] || targetClip;
            setCompletionDetails({
              clipTitle: uploaded?.title || targetClip?.title || 'Viral Short',
              youtubeUrl: uploaded?.youtube_url || (uploaded?.video_id ? `https://youtube.com/shorts/${uploaded.video_id}` : undefined),
              channelTitle: user?.channelTitle || user?.name || 'Your YouTube Channel',
              privacyStatus: uploaded?.privacyStatus || 'public',
            });

            if (statusRes.results && statusRes.results.length > 0) {
              onClipsUpdated(statusRes.results);
            }
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval);
            setUploadError(statusRes.error_message || 'YouTube publishing failed.');
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          setUploadError(err.message || 'Polling connection error.');
        }
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to initialize upload job.');
    }
  };

  return (
    <div className="h-full">
      <StudioEditor
        clips={clips}
        initialActiveClipId={activeClipId}
        onClipsUpdated={onClipsUpdated}
        onStartUploadJob={handleStartUploadJob}
      />

      {/* Upload Job Processing Modal */}
      <ProcessingModal
        isOpen={isUploading}
        onClose={() => setIsUploading(false)}
        title="YouTube Shorts Publishing Pipeline"
        sourceLabel={currentClipLabel}
        steps={uploadSteps}
        currentStep={uploadStep}
        progress={uploadProgress}
        statusMessage={uploadStatus}
        error={uploadError}
        completionDetails={completionDetails}
      />
    </div>
  );
};
