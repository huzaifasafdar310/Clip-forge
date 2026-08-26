import React, { useState, useEffect } from 'react';
import { Settings, Key, Sparkles, Youtube, Check, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { storageService, AppSettings } from '@/services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>({
    groqApiKey: '',
    youtubeApiKey: '',
    googleClientId: '',
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(storageService.getSettings());
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="API & Service Settings"
      description="Configure your client-side AI and YouTube API keys for instant browser processing."
      maxWidth="lg"

    >
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        {/* Groq API Key */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Groq Cloud API Key (LLaMA 3.3 70B)</span>
          </label>
          <Input
            type="password"
            placeholder="gsk_..."
            value={settings.groqApiKey || ''}
            onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Used for AI transcript highlight detection & viral SEO metadata.{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Get free key →
            </a>
          </p>
        </div>

        {/* YouTube API Key */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground font-semibold">
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span>YouTube Data API v3 Key (Optional)</span>
          </label>
          <Input
            type="password"
            placeholder="AIzaSy..."
            value={settings.youtubeApiKey || ''}
            onChange={(e) => setSettings({ ...settings, youtubeApiKey: e.target.value })}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Enables high-resolution metadata & Creative Commons channel discovery.
          </p>
        </div>

        {/* Google OAuth Client ID */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground font-semibold">
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google OAuth 2.0 Client ID (Optional)</span>
          </label>
          <Input
            type="text"
            placeholder="115243955025-34mt0dlogqe8pu8vjfqfg6l6s4v6j0qh.apps.googleusercontent.com"
            value={settings.googleClientId || ''}
            onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            OAuth Web Client ID for YouTube Shorts upload authorization.
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
          <span className="font-bold">🔒 Client-Side Key Notice:</span> Your API keys are stored locally in your browser and used for direct HTTPS requests to <code className="text-amber-200">api.groq.com</code> and Google APIs. Keys are never sent to any intermediary backend.
        </div>



        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" className="gap-1.5">
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
