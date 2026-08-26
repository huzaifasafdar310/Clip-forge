import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Film } from 'lucide-react';
import { QuickIngestCard } from '@/features/dashboard/QuickIngestCard';
import { RecentClipsGrid } from '@/features/dashboard/RecentClipsGrid';
import { PublishHub } from '@/features/dashboard/PublishHub';
import { ProcessingModal } from '@/features/studio/ProcessingModal';
import { api } from '@/lib/api';
import { Clip } from '@/types/api';

interface DashboardPageProps {
  onClipsLoaded: (clips: Clip[]) => void;
  onSelectStudioClip: (clip: Clip) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onClipsLoaded,
  onSelectStudioClip,
}) => {
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('');
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(10);
  const [statusMessage, setStatusMessage] = useState('Ingesting stream...');
  const [error, setError] = useState<string | null>(null);

  // Fetch recent clips and stats
  const { data: projectsData, isLoading: isProjectsLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });


  const handleAnalyzeYoutube = async (url: string, numClips: number, suffix: string) => {
    setSourceLabel(url);
    setIsProcessing(true);
    setError(null);
    setStep(1);
    setProgress(15);
    setStatusMessage('Fetching YouTube metadata & captions...');

    try {
      const data = await api.analyzeYoutubeUrl(url, numClips, (msg, pct, stp) => {
        setStatusMessage(msg);
        setProgress(pct);
        if (stp) setStep(stp);
      });

      const adjustedClips = data.clips.map((c) => {
        let desc = c.description || '';
        if (suffix) desc = desc ? `${desc}\n\n${suffix}` : suffix;
        return { ...c, description: desc };
      });

      setTimeout(() => {
        setIsProcessing(false);
        onClipsLoaded(adjustedClips);
        navigate('/app/studio');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Video analysis failed. Please verify the URL.');
    }
  };

  const handleSelectLocalFile = async (file: File, numClips: number) => {
    setSourceLabel(`Local: ${file.name}`);
    setIsProcessing(true);
    setError(null);
    setStep(1);
    setProgress(20);
    setStatusMessage('Probing video dimensions & duration...');

    try {
      const data = await api.analyzeLocalVideo(file, numClips, undefined, (msg, pct, stp) => {
        setStatusMessage(msg);
        setProgress(pct);
        if (stp) setStep(stp);
      });

      setTimeout(() => {
        setIsProcessing(false);
        onClipsLoaded(data.clips);
        navigate('/app/studio');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Local video analysis failed.');
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Ingest Box */}
      <QuickIngestCard
        onAnalyzeYoutube={handleAnalyzeYoutube}
        onSelectLocalFile={handleSelectLocalFile}
        isAnalyzing={isProcessing}
      />

      {/* Recent Clips & Publish Hub */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              <span>Recent Generated Clips</span>
            </h2>
            <button
              onClick={() => navigate('/app/projects')}
              className="text-xs font-mono text-primary hover:underline"
            >
              View All in Library &rarr;
            </button>
          </div>

          <RecentClipsGrid
            clips={projectsData?.clips || []}
            onSelectClip={(clip) => {
              onSelectStudioClip(clip);
              navigate('/app/studio');
            }}
            onClipsChanged={() => refetch()}
            isLoading={isProjectsLoading}
          />

        </div>

        <div className="space-y-4">
          <PublishHub />
        </div>
      </div>

      {/* Neural Pipeline Progress Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        onClose={() => setIsProcessing(false)}
        sourceLabel={sourceLabel}
        currentStep={step}
        progress={progress}
        statusMessage={statusMessage}
        error={error}
      />
    </div>
  );
};
