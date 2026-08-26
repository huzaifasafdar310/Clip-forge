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

// Cache for rendered video Blobs in memory during session
const renderedBlobsCache: Record<number, Blob> = {};

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = {
  // 1. Analyze YouTube Video URL with Real Pipeline Progress
  async analyzeYoutubeUrl(
    url: string,
    numClips: number = 3,
    onProgress?: (statusMessage: string, progressPercent: number, step?: number) => void
  ): Promise<AnalyzeResponse> {
    onProgress?.('Fetching YouTube video metadata & thumbnail...', 15, 1);
    const details = await youtubeService.getVideoDetails(url);

    onProgress?.('Extracting video transcript & spoken dialog...', 35, 2);
    const transcriptResult = await youtubeService.fetchTranscript(details.videoId);

    let segments: any[];
    if (transcriptResult.available && transcriptResult.transcript.length > 30) {
      onProgress?.('Groq AI (LLaMA 3.3 70B): Scoring viral hooks & highlight moments...', 60, 3);
      segments = await aiService.analyzeTranscriptHighlights(
        transcriptResult.transcript,
        details.durationSeconds,
        details.title,
        numClips
      );
    } else {
      onProgress?.('Captions unavailable — applying smart temporal segmentation...', 60, 3);
      segments = await aiService.analyzeTranscriptHighlights(
        '',
        details.durationSeconds,
        details.title,
        numClips
      );
    }

    onProgress?.('Generating viral titles, descriptions & SEO tags...', 85, 4);
    const generatedClips: Clip[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segmentTranscript = transcriptResult.available
        ? transcriptResult.getSegmentText(seg.start_seconds, seg.end_seconds)
        : '';

      const metadata = await aiService.generateClipMetadata(
        details.title,
        details.description,
        segmentTranscript || seg.reasoning,
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
        transcript_text: segmentTranscript,
        privacyStatus: 'public',
        status: 'analyzed',
        render_status: 'unrendered',
        transcript_fallback: seg.transcript_fallback,
        has_captions: true,
        caption_style: 'tiktok_pop',
        caption_font: 'Arial Black',
        caption_color: '#FFFF00',
        caption_language: 'auto',
        progress: 100,
      };

      generatedClips.push(clip);
    }

    storageService.addClips(generatedClips);
    onProgress?.('Pipeline complete! Clips ready in Studio.', 100, 4);

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

  // 2. Analyze Local Video File with Real Pipeline Progress
  async analyzeLocalVideo(
    file: File,
    numClips: number = 3,
    title?: string,
    onProgress?: (statusMessage: string, progressPercent: number, step?: number) => void
  ): Promise<AnalyzeResponse> {
    onProgress?.('Probing local video file & dimensions...', 20, 1);
    const videoMeta = await videoEngine.probeVideoFile(file);
    const videoTitle = title || file.name.replace(/\.[^/.]+$/, '');
    const localUrl = URL.createObjectURL(file);

    onProgress?.('Applying smart segment split on video duration...', 50, 2);
    const segments = await aiService.analyzeTranscriptHighlights(
      '',
      videoMeta.duration,
      videoTitle,
      numClips
    );

    onProgress?.('Generating optimized clip metadata...', 80, 3);
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
        status: 'analyzed',
        render_status: 'unrendered',
        transcript_fallback: true,
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
    onProgress?.('Local video analysis complete!', 100, 4);

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

  // 3. Render Vertical 9:16 Clip In-Browser
  async renderClip(
    clipId: number,
    onProgress?: (percent: number) => void
  ): Promise<{ clip: Clip; blob: Blob; url: string }> {
    const clips = storageService.getClips();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) throw new Error(`Clip ${clipId} not found in library.`);

    // If already rendered and blob exists in cache
    if (clip.render_status === 'rendered' && renderedBlobsCache[clipId] && clip.file_path) {
      return { clip, blob: renderedBlobsCache[clipId], url: clip.file_path };
    }

    storageService.updateClip(clipId, { render_status: 'rendering' });

    try {
      const sourceUrl = clip.file_path || clip.video_url;
      const captionText = clip.transcript_text || clip.title;

      const blob = await videoEngine.renderVerticalClip(
        sourceUrl,
        clip.start_seconds,
        clip.end_seconds,
        captionText,
        {
          style: clip.caption_style,
          font: clip.caption_font,
          color: clip.caption_color,
        },
        onProgress
      );

      const blobUrl = URL.createObjectURL(blob);
      renderedBlobsCache[clipId] = blob;

      const updated = storageService.updateClip(clipId, {
        render_status: 'rendered',
        status: 'completed',
        file_path: blobUrl,
      });

      return { clip: updated || clip, blob, url: blobUrl };
    } catch (err: any) {
      storageService.updateClip(clipId, { render_status: 'failed', error: err.message });
      throw err;
    }
  },

  // 4. Start YouTube Upload Job
  async startUploadJob(
    clips: Clip[],
    accessToken: string,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<{ job_id: string }> {
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
      const updatedResults: Clip[] = [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        try {
          // Verify or trigger render before uploading
          let blob = renderedBlobsCache[clip.id];

          if (!blob) {
            onProgress?.(`Rendering 9:16 vertical clip: "${clip.title}"...`, 30);
            const renderResult = await api.renderClip(clip.id);
            blob = renderResult.blob;
          }

          onProgress?.(`Streaming bytes to YouTube Shorts: "${clip.title}"...`, 75);

          const result = await uploadService.uploadShortToYoutube(blob, {
            title: clip.title,
            description: clip.description,
            tags: clip.suggestedTags,
            privacyStatus: clip.privacyStatus,
            accessToken,
          });

          const updated = storageService.updateClip(clip.id, {
            status: 'completed',
            render_status: 'rendered',
            youtube_url: result.youtubeUrl,
          });

          updatedResults.push(updated || { ...clip, status: 'completed', youtube_url: result.youtubeUrl });
        } catch (e: any) {
          console.error(`Upload error for clip ${clip.id}:`, e);
          const failed = storageService.updateClip(clip.id, {
            status: 'failed',
            error: e.message || 'YouTube Upload Failed',
          });
          updatedResults.push(failed || { ...clip, status: 'failed', error: e.message });
        }
      }

      activeJobs[jobId] = {
        ...activeJobs[jobId],
        status: updatedResults.some((r) => r.status === 'completed') ? 'completed' : 'failed',
        error_message: updatedResults.find((r) => r.status === 'failed')?.error || null,
        results: updatedResults,
        updated_at: new Date().toISOString(),
      };
    }, 100);

    return { job_id: jobId };
  },


  // 5. Job Status
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

  // 6. Update Clip Caption Options
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

  // 7. Download Clip URL
  getClipDownloadUrl(clipId: number): string {
    const clips = storageService.getClips();
    const clip = clips.find((c) => c.id === clipId);
    if (clip && clip.file_path && clip.file_path.startsWith('blob:')) {
      return clip.file_path;
    }
    return '';
  },

  // 8. Projects & Clips Management
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

  // 9. Source Channels & Discovery (Preview Data)
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
      sample_video_title: `${c.channel_title} Popular Highlights`,
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

  // 10. Automation Schedule Rules
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
    return { success: true, message: 'Scheduler preview paused.' };
  },

  async startScheduler(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Scheduler preview active.' };
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
          video_id: 'sample_video',
          title: `Auto Harvest: ${rule.name}`,
          channel_title: 'Creative Commons Creator',
          published_shorts: [{ clip_id: Date.now(), title: `${rule.name} Short`, url: 'https://youtube.com/shorts' }],
        },
      ],
      error_message: null,
    });

    return { success: true, message: `Schedule rule '${rule.name}' triggered.` };
  },

  async triggerAllScheduledRules(): Promise<{ success: boolean; message: string }> {
    const rules = storageService.getScheduleRules();
    for (const r of rules) {
      await this.runScheduleRuleNow(r.id);
    }
    return { success: true, message: `Triggered ${rules.length} schedule rules.` };
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
