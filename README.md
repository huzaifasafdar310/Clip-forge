# 🎬 ClipAI Studio

> **AI-Driven Viral Short-Form Video Generator & YouTube Shorts Publisher**  
> Turn long-form YouTube videos and local footage into high-retention 9:16 vertical clips with kinetic captions and direct YouTube publishing — running 100% in your browser.

---

## ⚡ Architecture Overview

ClipAI Studio is a **100% client-side React SPA** built with **Vite, TypeScript, Tailwind CSS, and Radix UI**, designed for instant serverless deployment on **Vercel**.

```text
[ YouTube URL / Local MP4 ]
           │
           ▼
[ YouTube TimedText / Video Metadata ]
           │
           ▼
[ Groq Cloud AI (LLaMA 3.3 70B) ] ──▶ Viral Hook Scoring & SEO Metadata
           │
           ▼
[ Browser Canvas & MediaRecorder ] ──▶ 9:16 Vertical Crop & Kinetic Captions
           │
           ▼
[ YouTube Data API v3 ] ───────────▶ Direct YouTube Shorts Publishing
```

---

## ✨ Features

- **🧠 Groq AI Highlight Scoring (LLaMA 3.3 70B):** Analyzes video transcripts and dialog flow to detect high-retention 30–60 second highlight moments.
- **📝 Real YouTube Captions Extraction:** Fetches real timedtext captions for YouTube videos, with automatic smart temporal segmentation fallback when captions are unavailable.
- **🎨 Kinetic Subtitle Engine:** Burn dynamic TikTok Pop, Karaoke, and Bold Stroke subtitles directly onto video frames using HTML5 Canvas.
- **📱 9:16 Smart Vertical Reframing:** Center-crops 16:9 widescreen video to vertical mobile aspect ratio (720x1280 / 1080x1920).
- **🚀 In-Browser Video Slicing & Rendering:** Uses native HTML5 `<video>`, `<canvas>`, and `MediaRecorder` APIs with zero backend server dependencies.
- **📤 Direct YouTube Shorts Upload:** Securely uploads generated clips directly from your browser to your YouTube channel using Google Identity Services OAuth 2.0.
- **💾 Full Client Persistence:** All clips, projects, and schedule rules are saved persistently in browser storage.
- **⚙️ In-App API Key Manager:** Easily enter your own free Groq Cloud API Key and YouTube Data API Key directly in the UI.

---

## 🛠️ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/huzaifasafdar310/Cliping-Ai-React.git
cd Cliping-Ai-React
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Web Client ID for YouTube Shorts upload |
| `VITE_GROQ_API_KEY` | Optional | Groq API Key for LLaMA 3.3 70B highlight analysis (can also be entered in-app) |
| `VITE_YOUTUBE_API_KEY` | Optional | YouTube Data API v3 key for high-res metadata |

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deploying to Vercel

1. Push your repository to GitHub.
2. Import the repo in **[Vercel Dashboard](https://vercel.com/new)**.
3. Framework Preset: **Vite** (Root Directory: `./`).
4. Set Environment Variables:
   - `VITE_GOOGLE_CLIENT_ID`: Your Google Cloud OAuth Web Client ID.
   - `VITE_GROQ_API_KEY` *(optional)*: Your Groq API Key.
5. Click **Deploy**!

---

## 🔒 Security & Privacy

- **In-Memory Tokens:** Google OAuth access tokens are stored strictly in memory during your active session and are never written to `localStorage`.
- **Direct HTTPS:** All API requests (Groq AI, YouTube API) communicate directly over encrypted HTTPS from your browser with no intermediary logging.

---

## 📄 License
MIT License. Free for personal and commercial use.
