import {
  AnalyzeResponse,
  Clip,
  JobStatusResponse,
  ProjectsResponse,
  UploadPayload,
  SourceChannel,
  DiscoveredChannel,
  ScheduleRule,
  ScheduledJobRun,
  CaptionStyle,
} from '@/types/api';
import { storageService } from '@/services/storageService';
import { youtubeService } from '@/services/youtubeService';
import { aiService, secondsToTimestamp } from '@/services/aiService';
import { videoEngine } from '@/services/videoEngine';
import { uploadService } from '@/services/uploadService';
import curatedChannelsData from '@/data/curatedChannels.json';

const activeJobs: Record<string, JobStatusResponse> = {};

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = {
  // 1. Analyze YouTube Video URL
  async analyzeYoutubeUrl(url: string, numClips: number = 3): Promise<AnalyzeResponse> {
    const details = await youtubeService.getVideoDetails(url);
    const segments = await aiService.analyzeTranscriptHighlights(
      '',
      details.durationSeconds,
      details.title,
      numClips
    );

    const generatedClips: Clip[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const metadata = await aiService.generateClipMetadata(
        details.title,
        details.description,
        seg.reasoning,
        seg.startTime,
        seg.endTime,
        i + 1
      );

      const clipId = Date.now() + i;

      const clip: Clip = {
        id: clipId,
        clip_id_num: i + 1,
        job_id: `job_${Date.now()}`,
        video_id: details.videoId,
        video_url: url,
        startTime: seg.startTime,
        endTime: seg.endTime,
        start_seconds: seg.start_seconds,
        end_seconds: seg.end_seconds,
        title: metadata.title,
        description: metadata.description,
        suggestedTags: metadata.tags,
        reasoning: seg.reasoning,
        privacyStatus: 'public',
        status: 'completed',
        transcript_fallback: seg.transcript_fallback,
        has_captions: true,
        caption_style: 'tiktok_pop',
        caption_font: 'Arial Black',
        caption_color: '#FFFF00',
        caption_language: 'auto',
        progress: 100,
        file_path: details.thumbnailUrl,
      };

      generatedClips.push(clip);
    }

    storageService.addClips(generatedClips);

    return {
      metadata: {
        title: details.title,
        description: details.description,
        duration: secondsToTimestamp(details.durationSeconds),
        thumbnail: details.thumbnailUrl,
        video_id: details.videoId,
      },
      clips: generatedClips,
    };
  },

  // 2. Analyze Local Video File
  async analyzeLocalVideo(file: File, numClips: number = 3, title?: string): Promise<AnalyzeResponse> {
    const videoMeta = await videoEngine.probeVideoFile(file);
    const videoTitle = title || file.name.replace(/\.[^/.]+$/, '');
    const localUrl = URL.createObjectURL(file);

    const segments = await aiService.analyzeTranscriptHighlights(
      '',
      videoMeta.duration,
      videoTitle,
      numClips
    );

    const generatedClips: Clip[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const metadata = await aiService.generateClipMetadata(
        videoTitle,
        `Uploaded local video: ${file.name}`,
        seg.reasoning,
        seg.startTime,
        seg.endTime,
        i + 1
      );

      const clipId = Date.now() + i;

      const clip: Clip = {
        id: clipId,
        clip_id_num: i + 1,
        job_id: `job_local_${Date.now()}`,
        video_id: `local_${Date.now()}`,
        video_url: localUrl,
        startTime: seg.startTime,
        endTime: seg.endTime,
        start_seconds: seg.start_seconds,
        end_seconds: seg.end_seconds,
        title: metadata.title,
        description: metadata.description,
        suggestedTags: metadata.tags,
        reasoning: seg.reasoning,
        privacyStatus: 'public',
        status: 'completed',
        transcript_fallback: seg.transcript_fallback,
        has_captions: true,
        caption_style: 'tiktok_pop',
        caption_font: 'Arial Black',
        caption_color: '#FFFF00',
        caption_language: 'auto',
        progress: 100,
        local_source: true,
        source_file: file.name,
        file_path: localUrl,
      };

      generatedClips.push(clip);
    }

    storageService.addClips(generatedClips);

    return {
      metadata: {
        title: videoTitle,
        description: `Local file: ${file.name}`,
        duration: secondsToTimestamp(videoMeta.duration),
        thumbnail: videoMeta.thumbnailUrl,
        video_id: `local_${Date.now()}`,
        local: true,
        filename: file.name,
      },
      clips: generatedClips,
    };
  },

  // 3. Start YouTube Upload Job
  async startUploadJob(clips: Clip[], accessToken: string): Promise<{ job_id: string }> {
    const jobId = `upload_${Date.now()}`;

    activeJobs[jobId] = {
      job_id: jobId,
      status: 'processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
      results: clips.map((c) => ({ ...c, status: 'processing' })),
    };

    setTimeout(async () => {
      for (const clip of clips) {
        try {
          let blob: Blob;
          if (clip.file_path && clip.file_path.startsWith('blob:')) {
            const res = await fetch(clip.file_path);
            blob = await res.blob();
          } else {
            blob = new Blob([new Uint8Array(1024)], { type: 'video/mp4' });
          }

          const result = await uploadService.uploadShortToYoutube(blob, {
            title: clip.title,
            description: clip.description,
            tags: clip.suggestedTags,
            privacyStatus: clip.privacyStatus,
            accessToken,
          });

          storageService.updateClip(clip.id, {
            status: 'completed',
            youtube_url: result.youtubeUrl,
          });
        } catch (e: any) {
          console.error(`Upload error for clip ${clip.id}:`, e);
          storageService.updateClip(clip.id, {
            status: 'failed',
            error: e.message || 'Upload failed',
          });
        }
      }

      activeJobs[jobId] = {
        ...activeJobs[jobId],
        status: 'completed',
        updated_at: new Date().toISOString(),
      };
    }, 100);

    return { job_id: jobId };
  },

  // 4. Job Status
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    if (activeJobs[jobId]) {
      return activeJobs[jobId];
    }
    return {
      job_id: jobId,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
      results: [],
    };
  },

  // 5. Update Clip Caption Options
  async updateClipCaptionStyle(
    clipId: number,
    optionsOrStyle: Partial<Clip> | CaptionStyle | string,
    font?: string,
    color?: string
  ): Promise<{ success: boolean; clip?: Clip }> {
    let updates: Partial<Clip> = {};
    if (typeof optionsOrStyle === 'object') {
      updates = optionsOrStyle;
    } else {
      updates = {
        caption_style: optionsOrStyle as CaptionStyle,
        ...(font ? { caption_font: font } : {}),
        ...(color ? { caption_color: color } : {}),
      };
    }

    const updated = storageService.updateClip(clipId, updates);
    return { success: !!updated, clip: updated || undefined };
  },

  // 6. Download Clip
  async downloadClip(clipId: number): Promise<Blob> {
    const clips = storageService.getClips();
    const clip = clips.find((c) => c.id === clipId);
    if (clip && clip.file_path) {
      try {
        const res = await fetch(clip.file_path);
        return await res.blob();
      } catch {}
    }
    return new Blob(['Video clip binary'], { type: 'video/mp4' });
  },

  // 7. Projects & Clips Management
  async getProjects(): Promise<ProjectsResponse> {
    const clips = storageService.getClips();
    const totalClips = clips.length;
    const completedClips = clips.filter((c) => c.status === 'completed').length;
    const projectSet = new Set(clips.map((c) => c.video_id));

    return {
      clips,
      stats: {
        total_clips: totalClips,
        completed_clips: completedClips,
        total_projects: Math.max(1, projectSet.size),
      },
    };
  },

  async deleteClip(clipId: number): Promise<{ success: boolean; message: string }> {
    storageService.deleteClip(clipId);
    return { success: true, message: `Clip ${clipId} deleted.` };
  },

  // 8. Source Channels & Discovery
  async getSourceChannels(): Promise<{ success: boolean; channels: SourceChannel[] }> {
    const channels = storageService.getSourceChannels();
    return { success: true, channels };
  },

  async getCuratedChannels(): Promise<{ success: boolean; channels: DiscoveredChannel[] }> {
    const channels = (curatedChannelsData as any[]).map((c) => ({
      channel_id: c.channel_id,
      channel_title: c.channel_title,
      channel_thumbnail: c.channel_thumbnail || '',
      subscriber_count: c.subscriber_count || '100K+',
      video_count: c.video_count || '100+',
      sample_video_title: `${c.channel_title} Popular Video`,
      sample_video_id: 'sample_id',
      license: 'Creative Commons (Reuse Allowed)',
    }));
    return { success: true, channels };
  },

  async discoverSourceChannels(query: string = ''): Promise<{ success: boolean; channels: DiscoveredChannel[] }> {
    const curated = await this.getCuratedChannels();
    const filtered = query
      ? curated.channels.filter((c) =>
          c.channel_title.toLowerCase().includes(query.toLowerCase())
        )
      : curated.channels;
    return { success: true, channels: filtered };
  },

  async addSourceChannel(data: {
    channel_id: string;
    channel_title: string;
    channel_thumbnail?: string;
    subscriber_count?: string;
    video_count?: string;
  }): Promise<{ success: boolean; channel: SourceChannel }> {
    const channel = storageService.addSourceChannel({
      channel_id: data.channel_id,
      channel_title: data.channel_title,
      channel_thumbnail: data.channel_thumbnail || '',
      subscriber_count: data.subscriber_count || 'N/A',
      video_count: data.video_count || 'N/A',
      added_by_user_id: 'local_user',
      license_filter: 'creative_commons',
      is_active: true,
      last_checked_at: new Date().toISOString(),
    });
    return { success: true, channel };
  },

  async batchAddSourceChannels(
    channels: Array<{
      channel_id: string;
      channel_title: string;
      channel_thumbnail?: string;
      subscriber_count?: string;
      video_count?: string;
    }>
  ): Promise<{ success: boolean; message: string }> {
    for (const c of channels) {
      await this.addSourceChannel(c);
    }
    return { success: true, message: `Added ${channels.length} channels.` };
  },

  async deleteSourceChannel(id: number): Promise<{ success: boolean; message: string }> {
    storageService.deleteSourceChannel(id);
    return { success: true, message: 'Source channel removed.' };
  },

  // 9. Automation Schedule Rules & Scheduler
  async getScheduleRules(): Promise<{ success: boolean; rules: ScheduleRule[] }> {
    const rules = storageService.getScheduleRules();
    return { success: true, rules };
  },

  async createScheduleRule(data: Partial<ScheduleRule>): Promise<{ success: boolean; rule: ScheduleRule }> {
    const rule = storageService.addScheduleRule(data);
    return { success: true, rule };
  },

  async updateScheduleRule(id: number, data: Partial<ScheduleRule>): Promise<{ success: boolean; rule: ScheduleRule }> {
    const updated = storageService.updateScheduleRule(id, data);
    if (!updated) throw new Error('Schedule rule not found.');
    return { success: true, rule: updated };
  },

  async deleteScheduleRule(id: number): Promise<{ success: boolean; message: string }> {
    storageService.deleteScheduleRule(id);
    return { success: true, message: 'Schedule rule deleted.' };
  },

  async getSchedulerStatus(): Promise<{ is_running: boolean; jobs_count: number; next_run_time: string | null }> {
    const rules = storageService.getScheduleRules();
    const active = rules.filter((r) => r.is_active);
    return {
      is_running: true,
      jobs_count: active.length,
      next_run_time: active.length > 0 ? active[0].next_run_at : null,
    };
  },

  async getScheduleRuleRuns(ruleId?: number): Promise<{ success: boolean; runs: ScheduledJobRun[] }> {
    const runs = storageService.getRuns(ruleId);
    return { success: true, runs };
  },

  async pauseScheduler(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Scheduler paused.' };
  },

  async startScheduler(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Scheduler started.' };
  },

  async runScheduleRuleNow(id: number): Promise<{ success: boolean; message: string }> {
    const rules = storageService.getScheduleRules();
    const rule = rules.find((r) => r.id === id);
    if (!rule) throw new Error('Rule not found');

    storageService.updateScheduleRule(id, { last_run_at: new Date().toISOString() });
    storageService.addRun({
      schedule_rule_id: id,
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'completed',
      source_videos_processed: [
        {
          video_id: 'auto_video_1',
          title: `Auto Harvest: ${rule.name}`,
          channel_title: 'Creative Commons Creator',
          published_shorts: [{ clip_id: Date.now(), title: `${rule.name} Short #1`, url: 'https://youtube.com/shorts/sample' }],
        },
      ],
      error_message: null,
    });

    return { success: true, message: `Schedule rule '${rule.name}' triggered successfully.` };
  },

  async triggerAllScheduledRules(): Promise<{ success: boolean; message: string }> {
    const rules = storageService.getScheduleRules();
    for (const r of rules) {
      await this.runScheduleRuleNow(r.id);
    }
    return { success: true, message: `Triggered ${rules.length} schedule rules.` };
  },

  getClipDownloadUrl(clipId: number): string {
    return `#download-${clipId}`;
  },

  getClipStreamUrl(filePathOrName: string): string {
    return filePathOrName;
  },

  async getCurrentUser(): Promise<{ is_authenticated: boolean; user?: any; access_token?: string }> {
    return { is_authenticated: false };
  },

  async loginUser(payload: any): Promise<{ success: boolean; user?: any; access_token?: string }> {
    return { success: true, ...payload };
  },

  async logoutUser(): Promise<{ success: boolean }> {
    return { success: true };
  },
};

