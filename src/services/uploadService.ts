export interface YoutubeUploadOptions {
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: 'public' | 'unlisted' | 'private';
  accessToken: string;
  onProgress?: (percent: number) => void;
}

export interface YoutubeUploadResult {
  videoId: string;
  youtubeUrl: string;
}

export const uploadService = {
  async uploadShortToYoutube(
    videoBlob: Blob,
    options: YoutubeUploadOptions
  ): Promise<YoutubeUploadResult> {
    if (!options.accessToken) {
      throw new Error('Google OAuth token is missing or expired. Please click "Connect YouTube" to re-authenticate.');
    }

    const titleWithTag = options.title.toLowerCase().includes('#shorts')
      ? options.title
      : `${options.title} #Shorts`.slice(0, 100);

    const descriptionWithTags = `${options.description}\n\n#Shorts #Viral #YouTubeShorts`;

    const metadata = {
      snippet: {
        title: titleWithTag,
        description: descriptionWithTags,
        tags: options.tags || ['shorts', 'viral', 'trending'],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: options.privacyStatus || 'public',
        selfDeclaredMadeForKids: false,
      },
    };

    // Construct standard Multipart/Related body for reliable in-browser upload
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaHeader = `--${boundary}\r\nContent-Type: ${videoBlob.type || 'video/mp4'}\r\n\r\n`;

    const metadataBlob = new Blob([metadataPart], { type: 'text/plain' });
    const mediaHeaderBlob = new Blob([mediaHeader], { type: 'text/plain' });
    const closeDelimiterBlob = new Blob([closeDelimiter], { type: 'text/plain' });

    const multipartBlob = new Blob([metadataBlob, mediaHeaderBlob, videoBlob, closeDelimiterBlob], {
      type: `multipart/related; boundary=${boundary}`,
    });

    try {
      const res = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBlob,
        }
      );

      if (!res.ok) {
        let errorMsg = `YouTube API Error (HTTP ${res.status})`;
        try {
          const errData = await res.json();
          if (errData.error?.message) {
            errorMsg = errData.error.message;
          }
          if (res.status === 401) {
            errorMsg = 'Google OAuth session expired. Please click "Connect YouTube" to re-authenticate.';
          } else if (res.status === 403) {
            if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('exceeded')) {
              errorMsg = 'YouTube channel daily upload limit reached. YouTube limits how many videos can be uploaded per day.';
            }
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const uploadData = await res.json();
      const videoId = uploadData.id;

      return {
        videoId,
        youtubeUrl: `https://youtube.com/shorts/${videoId}`,
      };
    } catch (fetchErr: any) {
      if (fetchErr.message && fetchErr.message.includes('YouTube')) {
        throw fetchErr;
      }
      throw new Error(
        fetchErr.message === 'Failed to fetch'
          ? 'Google OAuth token expired or network connection interrupted. Please re-connect your YouTube account.'
          : fetchErr.message || 'YouTube Upload Failed'
      );
    }
  },
};
