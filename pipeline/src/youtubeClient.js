import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";

const TOKEN_PATH = new URL("../../.youtube-token.json", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

/**
 * Creates an authenticated OAuth2 client for the YouTube API.
 * On first run, prompts the user to authorize via browser.
 * Saves the refresh token locally so subsequent runs are automatic.
 * @returns {Promise<import("googleapis").youtube_v3.Youtube>}
 */
export async function createYouTubeClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    "http://localhost:3000/oauth2callback"
  );

  // Load saved token if it exists
  if (existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
    oauth2Client.setCredentials(tokens);
  } else {
    throw new Error(
      "No YouTube token found. Run `node src/auth.js` first to authorize."
    );
  }

  return google.youtube({ version: "v3", auth: oauth2Client });
}

/**
 * Runs the interactive OAuth2 authorization flow.
 * Opens a URL in the browser, user consents, pastes the code back.
 * Saves the refresh token for future use.
 */
export async function authorize() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\n🔗 Open this URL in your browser to authorize:\n");
  console.log(`   ${authUrl}\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise((resolve) => {
    rl.question("📋 Paste the authorization code here: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("\n✅ Token saved! You can now run the pipeline.\n");
}

/**
 * Fetches a video's title and description from the YouTube Data API.
 * @param {string} videoId - The YouTube video ID.
 * @returns {Promise<{title: string, description: string}>}
 */
export async function fetchVideoDetails(videoId) {
  const youtube = await createYouTubeClient();
  const { data } = await youtube.videos.list({
    part: ["snippet"],
    id: [videoId],
  });

  if (!data.items || data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }

  const { title, description } = data.items[0].snippet;
  return { title, description };
}

/**
 * Sets a custom thumbnail on a YouTube video.
 * @param {string} videoId - The YouTube video ID.
 * @param {Buffer} imageBuffer - The thumbnail image as a PNG Buffer.
 */
export async function setThumbnail(videoId, imageBuffer) {
  const youtube = await createYouTubeClient();
  const { Readable } = await import("node:stream");

  await youtube.thumbnails.set({
    videoId,
    media: {
      mimeType: "image/png",
      body: Readable.from(imageBuffer),
    },
  });
}
