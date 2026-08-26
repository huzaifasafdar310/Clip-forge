import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Youtube, ArrowLeft, ExternalLink, Mail, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-surface-0/90 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-5xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-tight">
              Clip<span className="text-primary">AI</span> Studio
            </span>
          </div>

          <Button size="sm" variant="outline" onClick={() => navigate('/terms')} className="text-xs font-mono">
            Terms of Service
          </Button>
        </div>
      </header>

      {/* Main Privacy Document Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-8 py-12 space-y-10">
        {/* Title Header */}
        <div className="space-y-3 border-b border-border-subtle pb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-mono rounded-full border border-primary/25">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Privacy Policy
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            Last Updated: August 26, 2026 &bull; Effective Date: August 26, 2026
          </p>
        </div>

        {/* Section 1: Overview */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span>1. Overview</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome to <strong>ClipAI Studio</strong> ("we," "our," or "us"), available at{' '}
            <a href="https://cliping-ai-react.vercel.app" className="text-primary hover:underline">
              https://cliping-ai-react.vercel.app
            </a>
            . ClipAI Studio is an AI-powered short-form video creation and publishing platform that allows content creators to repurpose long-form video footage into vertical 9:16 video clips and publish them directly to YouTube Shorts.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We are committed to protecting your privacy and being transparent about how user data is accessed, processed, and protected. This Privacy Policy outlines our data handling practices, specifically concerning information accessed via <strong>Google Identity Services</strong> and <strong>YouTube API Services</strong>.
          </p>
        </section>

        {/* Section 2: YouTube API Services & Google User Data */}
        <section className="space-y-4 p-6 bg-surface-1 border border-border-subtle rounded-3xl">
          <div className="flex items-center gap-2 text-primary">
            <Youtube className="w-5 h-5 fill-current text-red-500" />
            <h2 className="text-lg font-bold text-foreground">
              2. Google OAuth & YouTube API Services Data Disclosure
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            ClipAI Studio uses <strong>YouTube API Services</strong> to allow authorized users to publish short-form video content directly to their personal YouTube channels.
          </p>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono uppercase text-foreground font-bold tracking-wider">
              A. What Google User Data We Access:
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
              <li>
                <strong className="text-foreground">Google OAuth Access Token:</strong> Obtained when you click "Connect YouTube" via Google Identity Services.
              </li>
              <li>
                <strong className="text-foreground">Basic Profile Information:</strong> Your account name, email address, and profile avatar (via <code className="text-primary">userinfo</code>) to identify your session in the header.
              </li>
              <li>
                <strong className="text-foreground">YouTube Channel Metadata:</strong> Channel title and channel avatar (via <code className="text-primary">youtube.readonly</code>) to verify the connected channel destination.
              </li>
              <li>
                <strong className="text-foreground">YouTube Upload Scope:</strong> Permission (<code className="text-primary">youtube.upload</code>) solely used when you explicitly request to upload and publish a generated video clip as a YouTube Short.
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono uppercase text-foreground font-bold tracking-wider">
              B. How Google User Data is Stored & Processed:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-surface-2 rounded-2xl border border-border-subtle space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> In-Memory Token Storage
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your OAuth access tokens are stored <strong>strictly in volatile browser memory</strong> during your active session. They are never written to permanent external databases.
                </p>
              </div>
              <div className="p-3 bg-surface-2 rounded-2xl border border-border-subtle space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Direct HTTPS Communication
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  All YouTube API calls occur directly over encrypted HTTPS between your browser and Google's official endpoints (<code className="text-primary">googleapis.com</code>).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Google API Limited Use Requirements */}
        <section className="space-y-3 p-6 bg-primary/5 border border-primary/20 rounded-3xl">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="w-5 h-5" />
            <h2 className="text-lg font-bold text-foreground">
              3. Google API Services User Data Policy (Limited Use Disclosure)
            </h2>
          </div>
          <p className="text-sm text-foreground/90 font-medium leading-relaxed">
            ClipAI Studio's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-bold underline inline-flex items-center gap-1"
            >
              <span>Google API Services User Data Policy</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            , including the <strong>Limited Use</strong> requirements.
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
            <li>We do NOT use Google user data to train generalized AI/ML models.</li>
            <li>We do NOT transfer or sell Google user data to third parties.</li>
            <li>We do NOT use Google user data for advertising, retargeting, or data broker purposes.</li>
          </ul>
        </section>

        {/* Section 4: YouTube Terms of Service Reference */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            4. YouTube Terms of Service & Google Privacy Policy
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using ClipAI Studio to access YouTube API Services and upload YouTube Shorts, you agree to be bound by the{' '}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>YouTube Terms of Service</span>
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            and the{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-primary font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>Google Privacy Policy</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            .
          </p>
        </section>

        {/* Section 5: Data Revocation & Deletion */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            5. User Rights, Data Deletion & Revocation
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You maintain full control over your Google and YouTube data at all times:
          </p>
          <div className="p-4 bg-surface-2 rounded-2xl border border-border-subtle space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">How to Revoke Access:</strong> You can revoke ClipAI Studio’s access to your Google account at any time by visiting the official{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-bold underline inline-flex items-center gap-1"
              >
                <span>Google Account Security & Third-Party Permissions page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              .
            </p>
            <p>
              <strong className="text-foreground">Local Session Clearing:</strong> You can clear all cached video projects and clips anytime by clearing your browser cache and local storage or clicking Disconnect.
            </p>
          </div>
        </section>

        {/* Section 6: Security */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            6. Data Security
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We implement administrative, technical, and physical safeguards designed to protect personal information. Video rendering and transcription formatting occur client-side in your browser using HTML5 Canvas and Web Audio APIs.
          </p>
        </section>

        {/* Section 7: Contact Us */}
        <section className="space-y-3 p-6 bg-surface-1 border border-border-subtle rounded-3xl">
          <div className="flex items-center gap-2 text-primary">
            <Mail className="w-5 h-5" />
            <h2 className="text-lg font-bold text-foreground">
              7. Contact Us & Privacy Inquiries
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions, feedback, or requests regarding this Privacy Policy or our compliance with Google API policies, please contact us at:
          </p>
          <div className="p-3 bg-surface-2 rounded-xl border border-border-subtle font-mono text-xs text-foreground">
            Email: <span className="text-primary font-bold">huzaifasafdar310@gmail.com</span>
            <br />
            Application: <span className="text-muted-foreground">ClipAI Studio (https://cliping-ai-react.vercel.app)</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-surface-0 border-t border-border-subtle text-center text-xs font-mono text-muted-foreground">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; {new Date().getFullYear()} ClipAI Studio. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Google Privacy</a>
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">YouTube Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
