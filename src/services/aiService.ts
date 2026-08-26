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

/**
 * Intelligent Fallback: Scatters clips across the ENTIRE video timeline
 * using natural retention curve focal points (Intro Hook, Core Climax, Peak Insight, Final Takeaway)
 * instead of consecutive 1-minute chunks.
 */
export function generateFallbackSegments(durationSeconds: number, numClips: number = 3): SegmentHighlight[] {
  const clipsCount = Math.max(1, Math.min(Math.floor(numClips), 10));
  const duration = Math.max(20, durationSeconds);

  if (duration <= 45.0 || clipsCount === 1) {
    return [
      {
        start_seconds: 0,
        end_seconds: Math.round(duration * 100) / 100,
        startTime: secondsToTimestamp(0),
        endTime: secondsToTimestamp(duration),
        reasoning: 'Primary viral moment across full video',
        transcript_fallback: true,
      },
    ];
  }

  // Desired clip length between 35s and 55s
  const clipLen = Math.min(50.0, Math.max(25.0, duration * 0.2));
  const segments: SegmentHighlight[] = [];

  // Distribution checkpoints across the entire video timeline (percentages)
  const distributionPoints = [0.08, 0.35, 0.62, 0.82, 0.22, 0.48, 0.74, 0.90];

  const labels = [
    'Opening Hook & Intrigue Point',
    'Core Climax & Breakthrough Moment',
    'High-Energy Insight Spike',
    'Key Takeaway & Punchline',
    'Surprising Turn & Counter-intuitive Insight',
    'Peak Discussion Hook',
    'Golden Actionable Tip',
    'Final Climax & Summary',
  ];

  for (let i = 0; i < clipsCount; i++) {
    const point = distributionPoints[i % distributionPoints.length];
    let startSec = Math.max(0, Math.min(duration * point, duration - clipLen));
    let endSec = Math.min(startSec + clipLen, duration);

    // Ensure round numbers
    startSec = Math.round(startSec);
    endSec = Math.round(endSec);

    segments.push({
      start_seconds: startSec,
      end_seconds: endSec,
      startTime: secondsToTimestamp(startSec),
      endTime: secondsToTimestamp(endSec),
      reasoning: labels[i % labels.length],
      transcript_fallback: true,
    });
  }

  segments.sort((a, b) => a.start_seconds - b.start_seconds);
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

    // Sample transcript strategically across beginning, middle, and end if large
    let sampledTranscript = transcript;
    if (transcript.length > 18000) {
      const third = Math.floor(transcript.length / 3);
      sampledTranscript = `[START OF VIDEO]\n${transcript.slice(0, 6000)}\n\n[MID VIDEO]\n${transcript.slice(third, third + 6000)}\n\n[LATE VIDEO]\n${transcript.slice(-6000)}`;
    }

    const prompt = `
You are a world-class viral video strategist and short-form editor for MrBeast, Alex Hormozi, and top TikTok creators.
Analyze the whole video transcript and find the ${numClips} MOST ENGAGING, VIRAL, and HIGH-RETENTION moments across the ENTIRE timeline (from beginning to end).

Video Title: ${title}
Total Duration: ${durationSeconds} seconds (format: ${secondsToTimestamp(durationSeconds)})
Transcript:
${sampledTranscript}

STRICT SELECTION CRITERIA:
1. DO NOT simply pick consecutive blocks at the start of the video (e.g. 0-60s, 60-120s). That is unacceptable.
2. Scan the FULL video timeline. Select highlights from distinct parts of the video (e.g., one from an early explosive hook, one from a mid-video revelation/climax, one from a late golden insight or punchline).
3. Each clip MUST be 30 to 60 seconds long (e.g., 35s, 45s, 55s).
4. Each segment must have a self-contained story: a captivating starting hook, rising tension/explanation, and a satisfying punchline or resolution.
5. "start_seconds" and "end_seconds" MUST be within 0 to ${durationSeconds}.

Return ONLY a valid JSON object with key "segments" (array of ${numClips} objects):
{
  "segments": [
    {
      "start_seconds": 145,
      "end_seconds": 195,
      "reasoning": "High-energy breakdown of the 3x revenue secret with an explosive opening hook"
    }
  ]
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
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a JSON-only response assistant for extracting non-sequential viral video highlights across entire timelines.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        console.warn('Groq API returned error status, using timeline-distributed fallback highlights:', res.status);
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

        s = Math.max(0, Math.min(s, Math.max(0, durationSeconds - 10)));
        e = Math.max(s + 10, Math.min(e, durationSeconds));

        // Ensure reasonable length (between 20s and 60s)
        if (e - s < 20) {
          e = Math.min(durationSeconds, s + 45);
        } else if (e - s > 65) {
          e = s + 55;
        }

        extracted.push({
          start_seconds: Math.round(s * 100) / 100,
          end_seconds: Math.round(e * 100) / 100,
          startTime: secondsToTimestamp(s),
          endTime: secondsToTimestamp(e),
          reasoning: String(item.reasoning || 'Peak engagement highlight moment'),
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
      const topic = cleanWords.join(' ') || 'Viral Moment';
      return {
        title: `${topic} That Changes Everything 🔥 #${clipNumber}`.slice(0, 60),
        description: `🔥 Key highlight from '${originalTitle}' (${startTimestamp} - ${endTimestamp})\n\n${originalDescription.slice(0, 200)}\n\n#Shorts #Viral #Trending #YouTubeShorts`,
        tags: ['shorts', 'viral', 'trending', 'youtubeshorts', 'clip', 'highlights'],
      };
    }

    const prompt = `
You are an expert social media manager writing optimized titles, descriptions, and tags for YouTube Shorts.

Original Video Title: ${originalTitle}
Original Video Description: ${originalDescription.slice(0, 300)}
Clip Timestamp: ${startTimestamp} to ${endTimestamp}
Clip Transcript Snippet: ${transcriptSnippet || 'N/A'}

REQUIREMENTS:
1. "title": Write a scroll-stopping, curiosity-inducing title specific to this clip's content. Include emojis or #Shorts if helpful. Max 60 characters.
2. "description": Write an engaging 2-3 sentence description summarizing what happens in this clip, ending with high-retention hashtags (#Shorts, #Viral, #Trending). Max 400 characters.
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
          : ['shorts', 'viral', 'trending', 'youtubeshorts'],
      };
    } catch {
      return {
        title: `${originalTitle.slice(0, 45)} #${clipNumber}`.slice(0, 60),
        description: `Highlight from ${originalTitle} (${startTimestamp} - ${endTimestamp})\n\n#Shorts #Viral #YouTubeShorts`,
        tags: ['shorts', 'viral', 'trending', 'youtubeshorts'],
      };
    }
  },
};
