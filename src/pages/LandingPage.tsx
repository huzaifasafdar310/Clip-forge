import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, ArrowRight } from 'lucide-react';
import { LandingHero } from '@/features/landing/LandingHero';
import { SocialProofMarquee } from '@/features/landing/SocialProofMarquee';
import { FeatureGrid } from '@/features/landing/FeatureGrid';
import { LiveDemoSection } from '@/features/landing/LiveDemoSection';
import { CTAFooter } from '@/features/landing/CTAFooter';
import { ProcessingModal } from '@/features/studio/ProcessingModal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Clip } from '@/types/api';
import { useAuth } from '@/context/AuthContext';

interface LandingPageProps {
  onClipsLoaded: (clips: Clip[]) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onClipsLoaded }) => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('');
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(10);
  const [statusMessage, setStatusMessage] = useState('Ingesting stream...');
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeYoutube = async (url: string) => {
    setSourceLabel(url);
    setIsProcessing(true);
    setError(null);
    setStep(1);
    setProgress(15);
    setStatusMessage('Fetching YouTube metadata & captions...');

    try {
      const data = await api.analyzeYoutubeUrl(url, 5, (msg, pct, stp) => {
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
      setError(err.message || 'Video analysis failed. Please verify the URL.');
    }
  };

  const handleSelectLocalFile = async (file: File) => {
    setSourceLabel(`Local: ${file.name}`);
    setIsProcessing(true);
    setError(null);
    setStep(1);
    setProgress(20);
    setStatusMessage('Probing video dimensions & duration...');

    try {
      const data = await api.analyzeLocalVideo(file, 5, undefined, (msg, pct, stp) => {
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
      setError(err.message || 'Local video upload failed.');
    }
  };

  return (

    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Landing Navbar */}
      <header className="fixed top-0 w-full z-50 bg-surface-0/85 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-black font-bold shadow-glow-sm group-hover:scale-105 transition-transform">
                <Film className="w-4 h-4" />
              </div>
              <span className="text-xl font-black tracking-tight text-foreground">
                Clip<span className="text-primary">AI</span>
              </span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <button
                onClick={login}
                className="text-xs font-mono uppercase px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-semibold"
              >
                Connect YouTube
              </button>
            ) : (
              <span className="text-xs font-mono text-status-success font-semibold px-3 py-1 bg-status-success/15 rounded-lg border border-status-success/30">
                YouTube Connected
              </span>
            )}

            <Button
              size="md"
              onClick={() => navigate('/app')}
              className="text-xs uppercase font-bold tracking-wider"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Landing Flow */}
      <main className="flex-1">
        <LandingHero
          onAnalyzeYoutube={handleAnalyzeYoutube}
          onSelectLocalFile={handleSelectLocalFile}
        />
        <SocialProofMarquee />
        <FeatureGrid />
        <LiveDemoSection />
        <CTAFooter />
      </main>

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
