import { storageService } from './storageService';
import curatedChannelsData from '../data/curatedChannels.json';

export interface YoutubeVideoDetails {
  videoId: string;
  title: string;
  description: string;
  durationSeconds: number;
  thumbnailUrl: string;
  channelTitle: string;
}

export interface TranscriptItem {
  start: number;
  dur: number;
  text: string;
}

export interface TranscriptResult {
  available: boolean;
  transcript: string;
  items: TranscriptItem[];
  getSegmentText: (startSec: number, endSec: number) => string;
}

export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // youtube.com/watch?v=ID
  const matchWatch = clean.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (matchWatch) return matchWatch[1];

  // youtube.com/shorts/ID
  const matchShorts = clean.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i);
  if (matchShorts) return matchShorts[1];

  // Plain 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;

  return null;
}

export function parseIsoDuration(durationStr: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function decodeXmlEntities(str: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n/g, ' ')
    .trim();
}

export const youtubeService = {
  async getVideoDetails(videoIdOrUrl: string): Promise<YoutubeVideoDetails> {
    const videoId = extractYoutubeId(videoIdOrUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL or Video ID provided.');
    }

    const apiKey = storageService.getYoutubeApiKey();

    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey.trim()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const item = data.items?.[0];
          if (item) {
            const snippet = item.snippet || {};
            const contentDetails = item.contentDetails || {};
            const durationSeconds = parseIsoDuration(contentDetails.duration || 'PT10M');

            const thumbnails = snippet.thumbnails || {};
            const thumb =
              thumbnails.maxres?.url ||
              thumbnails.high?.url ||
              thumbnails.medium?.url ||
              `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            return {
              videoId,
              title: snippet.title || `YouTube Video (${videoId})`,
              description: snippet.description || '',
              durationSeconds: Math.max(15, durationSeconds),
              thumbnailUrl: thumb,
              channelTitle: snippet.channelTitle || 'YouTube Creator',
            };
          }
        }
      } catch (e) {
        console.warn('YouTube Data API fetch note:', e);
      }
    }

    // Fallback via oEmbed (Works with 0 API keys)
    try {
      const oembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        return {
          videoId,
          title: data.title || `YouTube Video (${videoId})`,
          description: `Video by ${data.author_name || 'YouTube Creator'}`,
          durationSeconds: 300,
          thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          channelTitle: data.author_name || 'YouTube Creator',
        };
      }
    } catch {}

    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      description: '',
      durationSeconds: 300,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: 'YouTube Creator',
    };
  },

  async fetchTranscript(videoId: string): Promise<TranscriptResult> {
    const urls = [
      `https://video.google.com/timedtext?lang=en&v=${videoId}`,
      `https://video.google.com/timedtext?lang=en-US&v=${videoId}`,
      `https://video.google.com/timedtext?v=${videoId}`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const xmlText = await res.text();
        if (!xmlText || !xmlText.includes('<text')) continue;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const textNodes = xmlDoc.getElementsByTagName('text');

        if (textNodes.length === 0) continue;

        const items: TranscriptItem[] = [];
        const fullParts: string[] = [];

        for (let i = 0; i < textNodes.length; i++) {
          const node = textNodes[i];
          const start = parseFloat(node.getAttribute('start') || '0');
          const dur = parseFloat(node.getAttribute('dur') || '0');
          const rawText = node.textContent || '';
          const text = decodeXmlEntities(rawText);

          if (text) {
            items.push({ start, dur, text });
            const mins = Math.floor(start / 60);
            const secs = Math.floor(start % 60);
            const ts = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
            fullParts.push(`${ts} ${text}`);
          }
        }

        if (items.length > 0) {
          return {
            available: true,
            transcript: fullParts.join(' '),
            items,
            getSegmentText: (startSec: number, endSec: number) => {
              const matched = items
                .filter((item) => item.start >= startSec - 1 && item.start <= endSec + 1)
                .map((item) => item.text);
              return matched.join(' ').trim();
            },
          };
        }
      } catch (err) {
        console.warn('TimedText fetch note:', err);
      }
    }

    return {
      available: false,
      transcript: '',
      items: [],
      getSegmentText: () => '',
    };
  },

  async getCuratedChannels(limit: number = 20): Promise<any[]> {
    return (curatedChannelsData as any[]).slice(0, limit);
  },
};
