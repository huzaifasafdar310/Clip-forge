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
        // Seek to 1 second to capture thumbnail
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
        reject(new Error('Failed to load or parse video metadata.'));
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
    return new Promise(async (resolve, reject) => {
      try {
        const video = document.createElement('video');
        video.src = sourceUrl;
        video.crossOrigin = 'anonymous';
        video.muted = false;
        video.playsInline = true;

        await new Promise((res, rej) => {
          video.onloadedmetadata = res;
          video.onerror = rej;
        });

        // 9:16 Vertical Target Dimensions (720x1280 for fast client-side rendering)
        const targetWidth = 720;
        const targetHeight = 1280;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not initialize canvas context');

        const stream = canvas.captureStream(30);

        // Capture audio from video if possible
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        } catch (audioErr) {
          console.warn('Audio capture note:', audioErr);
        }

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

          // Calculate 9:16 Center Crop Scale
          const videoAspect = video.videoWidth / video.videoHeight;
          const targetAspect = targetWidth / targetHeight;

          let sx = 0,
            sy = 0,
            sWidth = video.videoWidth,
            sHeight = video.videoHeight;

          if (videoAspect > targetAspect) {
            // Video is wider than 9:16 — crop sides to center
            sWidth = video.videoHeight * targetAspect;
            sx = (video.videoWidth - sWidth) / 2;
          } else {
            // Video is taller than 9:16 — crop top/bottom to center
            sHeight = video.videoWidth / targetAspect;
            sy = (video.videoHeight - sHeight) / 2;
          }

          // Clear & Draw frame
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

          // Draw Kinetic Captions
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
      } catch (err) {
        reject(err);
      }
    });
  },
};
