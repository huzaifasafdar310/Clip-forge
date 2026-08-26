import { Clip, ScheduleRule, SourceChannel, ScheduledJobRun } from '@/types/api';

const SETTINGS_KEY = 'clipai_settings';
const CHANNELS_KEY = 'clipai_channels';
const RULES_KEY = 'clipai_rules';
const CLIPS_KEY = 'clipai_clips';
const RUNS_KEY = 'clipai_runs';

export interface AppSettings {
  groqApiKey?: string;
  youtubeApiKey?: string;
  googleClientId?: string;
}

export const storageService = {
  // Settings
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  },

  getGroqApiKey(): string {
    const saved = this.getSettings().groqApiKey;
    return (
      saved ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GROQ_API_KEY) ||
      ''
    );
  },

  getYoutubeApiKey(): string {
    const saved = this.getSettings().youtubeApiKey;
    return (
      saved ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_YOUTUBE_API_KEY) ||
      ''
    );
  },

  getGoogleClientId(): string {
    const saved = this.getSettings().googleClientId;
    return (
      saved ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
      '115243955025-34mt0dlogqe8pu8vjfqfg6l6s4v6j0qh.apps.googleusercontent.com'
    );
  },


  // Clips & Projects Storage
  getClips(): Clip[] {
    try {
      const data = localStorage.getItem(CLIPS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveClips(clips: Clip[]): void {
    try {
      localStorage.setItem(CLIPS_KEY, JSON.stringify(clips));
    } catch (e) {
      console.warn('Storage quota note for clips:', e);
    }
  },

  addClips(newClips: Clip[]): Clip[] {
    const existing = this.getClips();
    const existingIds = new Set(existing.map((c) => c.id));
    const merged = [...newClips.filter((c) => !existingIds.has(c.id)), ...existing];
    this.saveClips(merged);
    return merged;
  },

  updateClip(clipId: number, updates: Partial<Clip>): Clip | null {
    const clips = this.getClips();
    const index = clips.findIndex((c) => c.id === clipId);
    if (index === -1) return null;
    clips[index] = { ...clips[index], ...updates };
    this.saveClips(clips);
    return clips[index];
  },

  deleteClip(clipId: number): void {
    const clips = this.getClips().filter((c) => c.id !== clipId);
    this.saveClips(clips);
  },

  // Source Channels Storage
  getSourceChannels(): SourceChannel[] {
    try {
      const data = localStorage.getItem(CHANNELS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addSourceChannel(channel: Omit<SourceChannel, 'id' | 'created_at'>): SourceChannel {
    const channels = this.getSourceChannels();
    const newChannel: SourceChannel = {
      ...channel,
      id: Date.now() + Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
    };
    channels.unshift(newChannel);
    localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels));
    return newChannel;
  },

  deleteSourceChannel(id: number): void {
    const channels = this.getSourceChannels().filter((c) => c.id !== id);
    localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels));
  },

  // Schedule Rules Storage
  getScheduleRules(): ScheduleRule[] {
    try {
      const data = localStorage.getItem(RULES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addScheduleRule(rule: Partial<ScheduleRule>): ScheduleRule {
    const rules = this.getScheduleRules();
    const newRule: ScheduleRule = {
      id: Date.now(),
      user_id: 'local_user',
      name: rule.name || 'Auto-Publish Rule',
      frequency: rule.frequency || 'daily',
      run_at_time: rule.run_at_time || '14:00',
      num_clips_per_video: rule.num_clips_per_video || 3,
      max_videos_per_run: rule.max_videos_per_run || 1,
      caption_style: rule.caption_style || 'tiktok_pop',
      caption_font: rule.caption_font || 'Arial Black',
      caption_color: rule.caption_color || '#FFFF00',
      privacy_status: rule.privacy_status || 'public',
      is_active: rule.is_active ?? true,
      last_run_at: null,
      next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      source_channel_ids: rule.source_channel_ids || [],
      created_at: new Date().toISOString(),
    };
    rules.unshift(newRule);
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    return newRule;
  },

  updateScheduleRule(id: number, updates: Partial<ScheduleRule>): ScheduleRule | null {
    const rules = this.getScheduleRules();
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) return null;
    rules[index] = { ...rules[index], ...updates };
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    return rules[index];
  },

  deleteScheduleRule(id: number): void {
    const rules = this.getScheduleRules().filter((r) => r.id !== id);
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  },

  // Runs Storage
  getRuns(ruleId?: number): ScheduledJobRun[] {
    try {
      const data = localStorage.getItem(RUNS_KEY);
      const runs: ScheduledJobRun[] = data ? JSON.parse(data) : [];
      if (ruleId) {
        return runs.filter((r) => r.schedule_rule_id === ruleId);
      }
      return runs;
    } catch {
      return [];
    }
  },

  addRun(run: Omit<ScheduledJobRun, 'id'>): ScheduledJobRun {
    const runs = this.getRuns();
    const newRun: ScheduledJobRun = {
      ...run,
      id: Date.now(),
    };
    runs.unshift(newRun);
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    return newRun;
  },
};
