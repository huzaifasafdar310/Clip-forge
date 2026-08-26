import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Youtube, ArrowLeft, ExternalLink, ShieldAlert, CheckCircle2, Scale, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const TermsOfServicePage: React.FC = () => {
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

          <Button size="sm" variant="outline" onClick={() => navigate('/privacy')} className="text-xs font-mono">
            Privacy Policy
          </Button>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-8 py-12 space-y-10">
        {/* Title Header */}
        <div className="space-y-3 border-b border-border-subtle pb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-mono rounded-full border border-primary/25">
            <Scale className="w-3.5 h-3.5" /> Legal Terms
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            Last Updated: August 26, 2026 &bull; Effective Date: August 26, 2026
          </p>
        </div>

        {/* Section 1: Acceptance */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using <strong>ClipAI Studio</strong> (accessible at{' '}
            <a href="https://cliping-ai-react.vercel.app" className="text-primary hover:underline">
              https://cliping-ai-react.vercel.app
            </a>
            ), you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy. If you do not agree to these Terms, you may not access or use the application.
          </p>
        </section>

        {/* Section 2: YouTube API Services & Third-Party Terms */}
        <section className="space-y-4 p-6 bg-surface-1 border border-border-subtle rounded-3xl">
          <div className="flex items-center gap-2 text-primary">
            <Youtube className="w-5 h-5 fill-current text-red-500" />
            <h2 className="text-lg font-bold text-foreground">
              2. YouTube API Services & Google Integration Terms
            </h2>
          </div>

          <p className="text-sm text-foreground/90 font-medium leading-relaxed">
            ClipAI Studio utilizes <strong>YouTube API Services</strong> to allow creators to authorize and upload generated vertical video clips directly to their YouTube channel.
          </p>

          <div className="p-4 bg-surface-2 rounded-2xl border border-border-subtle space-y-2 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" /> YouTube Terms Compliance Requirement
            </div>
            <p>
              By using ClipAI Studio to upload or manage YouTube content, you expressly acknowledge, agree, and are bound by the{' '}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-bold underline inline-flex items-center gap-1"
              >
                <span>YouTube Terms of Service</span>
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              and the{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-bold underline inline-flex items-center gap-1"
              >
                <span>Google Privacy Policy</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              .
            </p>
          </div>
        </section>

        {/* Section 3: User Responsibilities & Content Ownership */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            3. User Responsibilities & Intellectual Property Rights
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You retain all ownership rights to any video footage, audio, or media that you input, edit, or upload through ClipAI Studio.
          </p>
          <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside leading-relaxed">
            <li>
              You represent and warrant that you own or possess all necessary rights, licenses, and permissions for any video or audio content you process or publish.
            </li>
            <li>
              You agree not to use ClipAI Studio to process or publish content that infringes upon any copyright, trademark, privacy, or proprietary rights of any third party.
            </li>
            <li>
              You are solely responsible for ensuring your published video content complies with the YouTube Community Guidelines and applicable local laws.
            </li>
          </ul>
        </section>

        {/* Section 4: Prohibited Uses */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            4. Prohibited Uses
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You agree not to engage in any of the following prohibited activities:
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside leading-relaxed">
            <li>Using the service for automated spamming, bulk spam uploads, or deceptive practices.</li>
            <li>Attempting to interfere with or compromise the security or integrity of the platform or external APIs.</li>
            <li>Violating YouTube API Services Terms or Google OAuth usage guidelines.</li>
          </ul>
        </section>

        {/* Section 5: Disclaimers & Limitation of Liability */}
        <section className="space-y-3 p-6 bg-surface-1 border border-border-subtle rounded-3xl">
          <div className="flex items-center gap-2 text-primary">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-lg font-bold text-foreground">
              5. Disclaimer of Warranties & Limitation of Liability
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ClipAI Studio is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied. We do not guarantee that the service will be uninterrupted, error-free, or completely free of software bugs.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In no event shall ClipAI Studio, its developers, or contributors be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the application or third-party APIs (including YouTube and Groq).
          </p>
        </section>

        {/* Section 6: Modifications to Terms */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            6. Changes to Terms
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We reserve the right to modify or replace these Terms at any time. When we make material changes, we will update the "Last Updated" date at the top of this page. Continued use of the application following any changes constitutes acceptance of the new Terms.
          </p>
        </section>

        {/* Section 7: Contact Information */}
        <section className="space-y-3 p-6 bg-surface-1 border border-border-subtle rounded-3xl">
          <div className="flex items-center gap-2 text-primary">
            <Mail className="w-5 h-5" />
            <h2 className="text-lg font-bold text-foreground">
              7. Contact Information
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For any questions or legal inquiries regarding these Terms of Service, please contact us at:
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
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Google Privacy</a>
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">YouTube Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
