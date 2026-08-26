import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Film, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const CTAFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="w-full py-20 bg-surface-0 border-t border-border-subtle text-center px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 p-2 rounded-2xl bg-surface-1 border border-border-subtle text-foreground text-xs font-mono">
          <Film className="w-4 h-4 text-primary" />
          <span>Automated AI Video Repurposing Pipeline</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-foreground">
          Stop editing for hours. Start clipping today.
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          AI highlight extraction, kinetic caption burn-in, and one-click YouTube Shorts publishing.
        </p>

        <div>
          <Button
            size="lg"
            onClick={() => navigate('/app')}
            className="text-sm font-bold uppercase tracking-wider px-8 py-4 rounded-full shadow-glow hover:scale-105 transition-transform"
          >
            <span>Open Studio Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Compliant Footer Links for Google Verification */}
        <div className="pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div>
            &copy; {new Date().getFullYear()} ClipAI Studio. All rights reserved.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="text-primary hover:underline font-semibold"
            >
              Privacy Policy
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </button>
            <span>&bull;</span>
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Google Privacy
            </a>
            <span>&bull;</span>
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              YouTube Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
