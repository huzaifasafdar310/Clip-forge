import { storageService } from './storageService';

export interface SegmentHighlight {
  start_seconds: number;
  end_seconds: number;
  startTime: string;
  endTime: string;
  reasoning: string;
  transcript_fallback: boolean;
}

export interface ClipMetadata {
  title: string;
  description: string;
  tags: string[];
}

export function secondsToTimestamp(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSec = sec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
}

export function parseSeconds(val: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const parts = String(val).trim().split(':');
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

export function generateFallbackSegments(durationSeconds: number, numClips: number = 3): SegmentHighlight[] {
  const clipsCount = Math.max(1, Math.min(Math.floor(numClips), 10));
  const duration = Math.max(15, durationSeconds);

  const clipLen = Math.min(60.0, Math.max(15.0, duration * 0.75));
  if (duration <= 15.0 || clipsCount === 1) {
    return [
      {
        start_seconds: 0,
        end_seconds: Math.round(duration * 100) / 100,
        startTime: secondsToTimestamp(0),
        endTime: secondsToTimestamp(duration),
        reasoning: 'Full video viral moment',
        transcript_fallback: true,
      },
    ];
  }

  const maxStart = Math.max(0, duration - clipLen);
  const step = maxStart / Math.max(1, clipsCount - 1);
  const segments: SegmentHighlight[] = [];

  for (let i = 0; i < clipsCount; i++) {
    const startSec = Math.round(i * step * 100) / 100;
    const endSec = Math.round(Math.min(startSec + clipLen, duration) * 100) / 100;
    segments.push({
      start_seconds: startSec,
      end_seconds: endSec,
      startTime: secondsToTimestamp(startSec),
      endTime: secondsToTimestamp(endSec),
      reasoning: `High-retention segment #${i + 1}`,
      transcript_fallback: true,
    });
  }

  return segments;
}

export const aiService = {
  async analyzeTranscriptHighlights(
    transcript: string,
    durationSeconds: number,
    title: string,
    numClips: number = 3
  ): Promise<SegmentHighlight[]> {
    const apiKey = storageService.getGroqApiKey();
    if (!apiKey || !transcript || transcript.trim().length < 20) {
      return generateFallbackSegments(durationSeconds, numClips);
    }

    const prompt = `
You are an expert viral video editor specializing in YouTube Shorts and TikToks.
Analyze the following video transcript and metadata to extract the ${numClips} TOP viral highlight segments suitable for 45-60 second YouTube Shorts.

Video Title: ${title}
Video Duration: ${durationSeconds} seconds
Transcript:
${transcript.slice(0, 8000)}

REQUIREMENTS:
1. Identify the ${numClips} best non-overlapping highlight segments.
2. Each segment MUST be between 30 and 60 seconds long.
3. Start timestamp and End timestamp MUST be within 0 to ${durationSeconds} seconds.
4. Focus on strong hooks, punchlines, dramatic moments, insights, or key takeaways.
5. Return ONLY a valid JSON object with key "segments": array of objects with keys:
   - "start_seconds": number
   - "end_seconds": number
   - "reasoning": string (short explanation of why this segment is viral)
`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a JSON-only response assistant for viral short video clip editing.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        console.warn('Groq API returned error status, using fallback highlights:', res.status);
        return generateFallbackSegments(durationSeconds, numClips);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return generateFallbackSegments(durationSeconds, numClips);

      const parsed = JSON.parse(content);
      const list = parsed.segments || parsed.highlights || parsed.clips || Object.values(parsed)[0];

      if (!Array.isArray(list) || list.length === 0) {
        return generateFallbackSegments(durationSeconds, numClips);
      }

      const extracted: SegmentHighlight[] = [];
      for (const item of list) {
        let s = parseSeconds(item.start_seconds);
        let e = parseSeconds(item.end_seconds || s + 45);

        s = Math.max(0, Math.min(s, Math.max(0, durationSeconds - 5)));
        e = Math.max(s + 5, Math.min(e, durationSeconds));

        extracted.push({
          start_seconds: Math.round(s * 100) / 100,
          end_seconds: Math.round(e * 100) / 100,
          startTime: secondsToTimestamp(s),
          endTime: secondsToTimestamp(e),
          reasoning: String(item.reasoning || 'AI highlighted hook moment'),
          transcript_fallback: false,
        });
      }

      extracted.sort((a, b) => a.start_seconds - b.start_seconds);
      return extracted.slice(0, numClips);
    } catch (err) {
      console.warn('Groq AI highlight analysis failed, using fallback segments:', err);
      return generateFallbackSegments(durationSeconds, numClips);
    }
  },

  async generateClipMetadata(
    originalTitle: string,
    originalDescription: string,
    transcriptSnippet: string,
    startTimestamp: string,
    endTimestamp: string,
    clipNumber: number
  ): Promise<ClipMetadata> {
    const apiKey = storageService.getGroqApiKey();
    if (!apiKey) {
      const cleanWords = originalTitle.split(' ').filter((w) => w.length > 3).slice(0, 3);
      const topic = cleanWords.join(' ') || 'Viral Clip';
      return {
        title: `${topic} - Part ${clipNumber} #${startTimestamp}`.slice(0, 60),
        description: `🔥 Key highlight from '${originalTitle}' (${startTimestamp} - ${endTimestamp})\n\n${originalDescription.slice(0, 200)}\n\n#Shorts #Viral #Trending`,
        tags: ['shorts', 'viral', 'trending', 'youtubeshorts', 'clip'],
      };
    }

    const prompt = `
You are an expert social media manager writing optimized titles, descriptions, and tags for YouTube Shorts.

Original Video Title: ${originalTitle}
Original Video Description: ${originalDescription.slice(0, 300)}
Clip Timestamp: ${startTimestamp} to ${endTimestamp}
Clip Transcript Snippet: ${transcriptSnippet || 'N/A'}

REQUIREMENTS:
1. "title": Write a scroll-stopping, highly engaging title specific to this clip's content. Max 60 characters.
2. "description": Write an engaging description summarizing what happens in this specific clip, ending with relevant hashtags (#Shorts, #Viral, etc.). Max 400 characters.
3. "tags": Provide 5-8 relevant tags as a JSON array of strings.

Return ONLY a valid JSON object format:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", "tag3"]
}
`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a JSON-only YouTube Shorts metadata generator.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) throw new Error(`Groq API HTTP ${res.status}`);

      const data = await res.json();
      const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');

      return {
        title: String(content.title || `${originalTitle.slice(0, 45)} #${clipNumber}`).slice(0, 60),
        description: String(content.description || originalDescription.slice(0, 300)),
        tags: Array.isArray(content.tags)
          ? content.tags.map((t: string) => String(t).toLowerCase().replace('#', ''))
          : ['shorts', 'viral', 'trending'],
      };
    } catch {
      return {
        title: `${originalTitle.slice(0, 45)} #${clipNumber}`.slice(0, 60),
        description: `Highlight from ${originalTitle} (${startTimestamp} - ${endTimestamp})\n\n#Shorts #Viral`,
        tags: ['shorts', 'viral', 'trending'],
      };
    }
  },
};
