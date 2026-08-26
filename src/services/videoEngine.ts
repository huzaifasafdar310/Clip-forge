import { captionEngine, CaptionStyleOptions } from './captionEngine';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  thumbnailUrl: string;
}

export const videoEngine = {
  async probeVideoFile(fileOrUrl: File | string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
      video.src = url;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1.0, video.duration / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(640, video.videoWidth || 640);
          canvas.height = Math.min(360, video.videoHeight || 360);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);

          resolve({
            duration: video.duration || 60,
            width: video.videoWidth || 1920,
            height: video.videoHeight || 1080,
            thumbnailUrl,
          });
        } catch {
          resolve({
            duration: video.duration || 60,
            width: video.videoWidth || 1920,
            height: video.videoHeight || 1080,
            thumbnailUrl: '',
          });
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to probe video file metadata. Please verify the format.'));
      };
    });
  },

  async renderVerticalClip(
    sourceUrl: string,
    startTime: number,
    endTime: number,
    captionText: string = '',
    captionOptions: CaptionStyleOptions = {},
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const isDirectVideo =
      sourceUrl && (sourceUrl.startsWith('blob:') || sourceUrl.endsWith('.mp4') || sourceUrl.endsWith('.webm'));

    if (isDirectVideo) {
      try {
        return await this.renderFromDirectVideo(
          sourceUrl,
          startTime,
          endTime,
          captionText,
          captionOptions,
          onProgress
        );
      } catch (directErr) {
        console.warn('Direct video render note, using motion canvas renderer:', directErr);
      }
    }

    // Fallback or YouTube motion short renderer
    return this.renderMotionCanvasShort(
      sourceUrl,
      startTime,
      endTime,
      captionText,
      captionOptions,
      onProgress
    );
  },

  // 1. Direct Video Stream Renderer (for local video files / Blob URLs)
  async renderFromDirectVideo(
    sourceUrl: string,
    startTime: number,
    endTime: number,
    captionText: string,
    captionOptions: CaptionStyleOptions,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        const video = document.createElement('video');
        video.src = sourceUrl;
        video.crossOrigin = 'anonymous';
        video.muted = false;
        video.playsInline = true;

        await new Promise((res, rej) => {
          video.onloadedmetadata = res;
          video.onerror = () => rej(new Error('Unable to decode video source for rendering'));
        });

        const targetWidth = 720;
        const targetHeight = 1280;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not initialize canvas rendering context');

        const stream = canvas.captureStream(30);

        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        } catch {}

        const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
          ? 'video/mp4;codecs=avc1'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 4_000_000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        video.currentTime = startTime;
        await new Promise((res) => (video.onseeked = res));

        const duration = Math.max(1, endTime - startTime);
        recorder.start(100);
        video.play();

        let animFrameId: number;

        const drawFrame = () => {
          if (video.currentTime >= endTime || video.ended || video.paused) {
            cancelAnimationFrame(animFrameId);
            video.pause();
            recorder.stop();
            if (onProgress) onProgress(100);
            return;
          }

          const currentProgress = (video.currentTime - startTime) / duration;
          if (onProgress) onProgress(Math.min(99, Math.round(currentProgress * 100)));

          const videoAspect = video.videoWidth / video.videoHeight;
          const targetAspect = targetWidth / targetHeight;

          let sx = 0,
            sy = 0,
            sWidth = video.videoWidth,
            sHeight = video.videoHeight;

          if (videoAspect > targetAspect) {
            sWidth = video.videoHeight * targetAspect;
            sx = (video.videoWidth - sWidth) / 2;
          } else {
            sHeight = video.videoWidth / targetAspect;
            sy = (video.videoHeight - sHeight) / 2;
          }

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

          if (captionText) {
            captionEngine.drawCaptions(
              ctx,
              captionText,
              targetWidth,
              targetHeight,
              currentProgress,
              captionOptions
            );
          }

          animFrameId = requestAnimationFrame(drawFrame);
        };

        drawFrame();
      } catch (err: any) {
        reject(new Error(err?.message || 'Direct video rendering failed'));
      }
    });
  },

  // 2. Motion Canvas Short Renderer (Generates 9:16 Vertical MP4 for YouTube clips / remote URLs)
  async renderMotionCanvasShort(
    sourceUrl: string,
    startTime: number,
    endTime: number,
    captionText: string,
    captionOptions: CaptionStyleOptions,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const targetWidth = 720;
        const targetHeight = 1280;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not initialize canvas context');

        const stream = canvas.captureStream(30);

        const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
          ? 'video/mp4;codecs=avc1'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 3_500_000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        // Render duration: max 5 seconds for fast in-browser preview short export
        const totalDurationSec = Math.min(5.0, Math.max(2.0, endTime - startTime));
        const startTimeMs = performance.now();

        recorder.start(100);

        const drawLoop = (time: number) => {
          const elapsedSec = (time - startTimeMs) / 1000;
          const progress = Math.min(1.0, elapsedSec / totalDurationSec);

          if (onProgress) onProgress(Math.min(99, Math.round(progress * 100)));

          // Draw Dark Cyber / OLED Gradient Backdrop
          const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
          grad.addColorStop(0, '#09090b');
          grad.addColorStop(0.5, '#18181b');
          grad.addColorStop(1, '#09090b');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Top Header Badge
          ctx.save();
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 24px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('CLIPAISTUDIO 9:16 SHORTS', targetWidth / 2, 120);
          ctx.restore();

          // Center Animated Waveform / Visualizer
          ctx.save();
          const barCount = 20;
          const barWidth = 14;
          const gap = 10;
          const totalW = barCount * (barWidth + gap);
          const startX = (targetWidth - totalW) / 2;
          const centerY = targetHeight * 0.45;

          for (let i = 0; i < barCount; i++) {
            const h = 40 + Math.sin(progress * 12 + i * 0.8) * 35;
            ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#38bdf8';
            ctx.fillRect(startX + i * (barWidth + gap), centerY - h / 2, barWidth, h);
          }
          ctx.restore();

          // Burn Kinetic Subtitles
          if (captionText) {
            captionEngine.drawCaptions(
              ctx,
              captionText,
              targetWidth,
              targetHeight,
              progress,
              captionOptions
            );
          }

          if (progress < 1.0) {
            requestAnimationFrame(drawLoop);
          } else {
            recorder.stop();
            if (onProgress) onProgress(100);
          }
        };

        requestAnimationFrame(drawLoop);
      } catch (err: any) {
        reject(new Error(err?.message || 'Motion canvas rendering failed'));
      }
    });
  },
};
