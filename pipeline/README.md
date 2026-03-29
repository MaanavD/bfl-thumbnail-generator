# Thumbnail Pipeline — Automated YouTube Integration

This is the automated version of the thumbnail generator. It listens for new YouTube video uploads via Pub/Sub webhooks, fetches the video description, generates three thumbnail variants with FLUX.2, and sets one live on the video.

The [CLI tool](../thumbnail-generator/) teaches the core image-generation workflow. This package shows how to wire the same logic into production.

## Architecture

```
YouTube Pub/Sub          Pipeline Server              BFL / YouTube
─────────────────       ─────────────────           ─────────────────
                         POST /webhook
New video published ──────────────────►  Parse Atom XML
                                         Extract videoId
                                              │
                                         Fetch description ──► YouTube Data API
                                              │
                                         buildPrompts(desc)
                                              │
                                         generateImages() ───► BFL FLUX.2 API
                                              │
                                         setThumbnail() ─────► YouTube API
                                              │
                                         ✅ Done
```

## Setup

### 1. Install

```bash
cd pipeline
npm install
```

### 2. Configure

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Source | Cost | Required |
|----------|--------|------|----------|
| `BFL_API_KEY` | [dashboard.bfl.ai](https://dashboard.bfl.ai/) | ~$0.04/run | Yes |
| `YOUTUBE_CLIENT_ID` | Google Cloud Console (see below) | Free | Yes |
| `YOUTUBE_CLIENT_SECRET` | Google Cloud Console (see below) | Free | Yes |
| `PORT` | Server port (default: 3000) | — | No |

#### Google Cloud + YouTube API Setup (free, ~5 minutes)

1. **Create a Google Cloud project**
   - Go to [console.cloud.google.com](https://console.cloud.google.com/)
   - Click "Select a project" → "New Project" → name it anything → "Create"
   - All of this is free. No billing account required for the YouTube Data API.

2. **Enable the YouTube Data API v3**
   - In your project, go to **APIs & Services → Library**
   - Search "YouTube Data API v3" → click it → **Enable**
   - Free tier: 10,000 quota units/day (each `videos.list` call = 1 unit, `thumbnails.set` = 50 units — you'd need to generate ~200 thumbnails/day to hit the limit)

3. **Create OAuth2 credentials**
   - Go to **APIs & Services → Credentials**
   - Click **"+ Create Credentials" → "OAuth client ID"**
   - If prompted, configure the OAuth consent screen first:
     - User type: **External**
     - App name: anything (e.g. "Thumbnail Pipeline")
     - Scopes: skip (we set these in code)
     - Test users: **add your own Google email**
     - Save
   - Back to Credentials → "OAuth client ID":
     - Application type: **Desktop app** (simplest for local use)
     - Name: anything
     - Click **Create**
   - You'll see **Client ID** and **Client Secret** — copy both into your `.env`

4. **Authorize your YouTube account**

   ```bash
   npm run auth
   ```

   This opens a URL — paste it in your browser, sign in with the Google account that owns your YouTube channel, click "Allow", and paste the authorization code back into the terminal. A `.youtube-token.json` file is saved locally. You only do this once.

### 3. Run the Server

```bash
npm start
```

### 4. Subscribe to YouTube Pub/Sub (optional — for auto-trigger)

This part is also free. YouTube uses Google's public Pub/Sub hub.

To test locally, you need a public URL. Use [ngrok](https://ngrok.com/) (free tier):

```bash
# In a separate terminal
ngrok http 3000
```

Copy the `https://xxxx.ngrok.io` URL, then subscribe:

```bash
curl -X POST https://pubsubhubbub.appspot.com/subscribe \
  -d "hub.callback=https://xxxx.ngrok.io/webhook" \
  -d "hub.topic=https://www.youtube.com/xml/feeds/videos.xml?channel_id=YOUR_CHANNEL_ID" \
  -d "hub.mode=subscribe" \
  -d "hub.verify=async"
```

Replace `YOUR_CHANNEL_ID` with your actual channel ID (find it at [youtube.com/account_advanced](https://youtube.com/account_advanced)).

The subscription lasts 10 days and auto-renews if your server responds to verification. For production, deploy the server to a permanent URL (Railway, Render, Cloud Run — all have free tiers).

## Usage

### Automatic (Pub/Sub)

Once subscribed, every new video you publish triggers the pipeline automatically. No action needed.

### Manual Trigger (CLI)

```bash
# Generate and set thumbnail for a specific video
node src/trigger.js VIDEO_ID
```

### Manual Trigger (HTTP)

```bash
# POST to the running server
curl -X POST http://localhost:3000/trigger \
  -H "Content-Type: application/json" \
  -d '{"videoId": "VIDEO_ID", "pick": 0}'
```

The `pick` field selects which style to set: `0` for Cinematic, `1` for Graphic, `2` for Abstract.

## Project Structure

```
pipeline/
  src/
    auth.js             One-time OAuth2 setup — authorizes your YouTube account
    server.js           Express server — webhook + manual trigger endpoints
    trigger.js          CLI script for manual one-off runs
    pipeline.js         Orchestrator — wires everything together
    youtubeClient.js    YouTube Data API — fetch video details, set thumbnails
    bflClient.js        BFL FLUX.2 API — image generation
    promptTemplates.js  Style templates (Cinematic, Graphic, Abstract)
```

## Deployment

This server is stateless — deploy to any platform that runs Node.js:

- **Cloud Run / Cloud Functions** — natural fit if already using Google Cloud for the YouTube API
- **Railway / Render / Fly.io** — one-click deploys, free tiers available
- **AWS Lambda + API Gateway** — wrap `server.js` with a Lambda adapter

The only hard requirement is a publicly accessible URL for the YouTube Pub/Sub callback.

## Cost

~$0.04 per video for 3 FLUX.2 images. YouTube API calls stay free within the standard quota limits.
