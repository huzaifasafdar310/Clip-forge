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
      throw new Error('Google OAuth access token is required to upload to YouTube.');
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

    // Step 1: Initiate Resumable Upload Session
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(videoBlob.size),
          'X-Upload-Content-Type': videoBlob.type || 'video/mp4',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      const msg = err.error?.message || `YouTube API upload init failed with HTTP ${initRes.status}`;
      throw new Error(msg);
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('Did not receive resumable upload URL from YouTube API.');
    }

    // Step 2: Upload Binary Video Data
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': videoBlob.type || 'video/mp4',
      },
      body: videoBlob,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `YouTube video upload failed with HTTP ${uploadRes.status}`);
    }

    const uploadData = await uploadRes.json();
    const videoId = uploadData.id;

    return {
      videoId,
      youtubeUrl: `https://youtube.com/shorts/${videoId}`,
    };
  },
};
