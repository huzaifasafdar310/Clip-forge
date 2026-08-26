import React from 'react';
import {
  Bot,
  CheckCircle2,
  Loader2,
  Circle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Youtube,
  Share2,
  Film,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface ProcessingStep {
  label: string;
  description?: string;
}

export interface UploadCompletionDetails {
  clipTitle?: string;
  youtubeUrl?: string;
  videoId?: string;
  channelTitle?: string;
  privacyStatus?: string;
  thumbnail?: string;
}

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  sourceLabel?: string;
  steps?: ProcessingStep[];
  currentStep: number; // 1 to N
  progress: number; // 0 to 100
  statusMessage: string;
  error?: string | null;
  onRetry?: () => void;
  completionDetails?: UploadCompletionDetails | null;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  onClose,
  title = 'ClipAI Processing Pipeline',
  sourceLabel,
  steps: customSteps,
  currentStep,
  progress,
  statusMessage,
  error,
  onRetry,
  completionDetails,
}) => {
  const defaultSteps: ProcessingStep[] = [
    { label: 'Fetching & Ingesting Video Stream (1080p60)' },
    { label: 'Whisper ASR: Extracting Transcript & Spoken Hooks' },
    { label: 'Groq AI (LLaMA 3.3 70B): Virality & Topic Spikes' },
    { label: 'Formatting 9:16 Kinetic Subtitles & SEO Tags' },
  ];

  const steps = customSteps && customSteps.length > 0 ? customSteps : defaultSteps;
  const isFinished = progress === 100 && !error;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isFinished || error ? onClose : () => {}}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-glow-sm ${
                isFinished
                  ? 'bg-status-success text-black'
                  : error
                  ? 'bg-status-error text-white'
                  : 'bg-primary text-black'
              }`}
            >
              {isFinished ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Bot className="w-6 h-6 animate-spin-slow" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isFinished ? 'Publishing Complete!' : title}
              </h3>
              {sourceLabel && (
                <p className="text-xs text-muted-foreground font-mono truncate max-w-xs sm:max-w-sm">
                  {sourceLabel}
                </p>
              )}
            </div>
          </div>

          {isFinished && (
            <span className="px-2.5 py-1 rounded-full bg-status-success/15 border border-status-success/30 text-[11px] font-mono text-status-success font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live
            </span>
          )}
        </div>

        {/* Finished Success Card (Rich Descriptive Overview) */}
        {isFinished && completionDetails ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-surface-2 border border-border-subtle rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-14 rounded-xl bg-black border border-primary/40 flex items-center justify-center shrink-0 shadow-glow-sm">
                  <Youtube className="w-6 h-6 text-red-500 fill-current" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/20 text-primary border border-primary/30 font-semibold">
                    {completionDetails.privacyStatus || 'Public'} Short
                  </span>
                  <h4 className="text-sm font-bold text-foreground truncate leading-snug">
                    {completionDetails.clipTitle || 'Viral 9:16 Clip'}
                  </h4>
                  {completionDetails.channelTitle && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Target Channel: <span className="text-foreground font-semibold">{completionDetails.channelTitle}</span>
                    </p>
                  )}
                </div>
              </div>

              {completionDetails.youtubeUrl && (
                <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row gap-2">
                  <a
                    href={completionDetails.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg transition-colors group"
                  >
                    <Youtube className="w-4 h-4 fill-current" />
                    <span>Watch Short on YouTube</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Steps Progress List */
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isCompleted = stepNum < currentStep || progress === 100;
              const isCurrent = stepNum === currentStep && progress < 100 && !error;

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 text-xs font-medium transition-colors ${
                    isCompleted
                      ? 'text-status-success'
                      : isCurrent
                      ? 'text-primary'
                      : 'text-muted-foreground/60'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">{step.label}</span>
                    {step.description && isCurrent && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Progress Bar & Status Text */}
        <div className="space-y-2">
          <div className="w-full bg-surface-3 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className={`h-full transition-all duration-300 ${
                error
                  ? 'bg-status-error'
                  : isFinished
                  ? 'bg-status-success'
                  : 'bg-primary shadow-glow-sm'
              }`}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className={error ? 'text-status-error font-medium' : 'text-muted-foreground truncate max-w-[80%]'}>
              {error ? `Upload Error: ${error}` : statusMessage}
            </span>
            <span className={`font-bold ${isFinished ? 'text-status-success' : 'text-primary'}`}>
              {progress}%
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-status-error/10 border border-status-error/30 rounded-2xl space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-status-error">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">
                  {error.toLowerCase().includes('exceeded the number of videos')
                    ? 'YouTube Channel Daily Upload Limit Reached'
                    : 'Publishing could not complete'}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {error.toLowerCase().includes('exceeded the number of videos')
                    ? 'YouTube enforces a daily upload limit on channels (resets every 24 hours). You can download the rendered 9:16 MP4 below and upload it directly in YouTube Studio, or wait for your daily upload quota to reset.'
                    : error}
                </p>
              </div>
            </div>

            {error.toLowerCase().includes('exceeded the number of videos') && (
              <div className="p-2.5 bg-surface-2/80 rounded-xl border border-border-subtle text-[11px] text-foreground flex items-center justify-between gap-3">
                <span className="text-muted-foreground font-mono">
                  Bypass API limit via web upload:
                </span>
                <a
                  href="https://studio.youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-bold inline-flex items-center gap-1 shrink-0"
                >
                  <span>Open YouTube Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={onClose} className="text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        )}


        {/* Footer actions when finished */}
        {isFinished && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button size="sm" variant="primary" onClick={onClose} className="text-xs font-bold">
              Done & Return to Studio
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
