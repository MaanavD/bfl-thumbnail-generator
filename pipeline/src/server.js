import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { parseStringPromise } from "xml2js";
import { runPipeline } from "./pipeline.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Parse incoming XML (YouTube Pub/Sub) and JSON (manual triggers)
app.use(express.raw({ type: "application/atom+xml", limit: "1mb" }));
app.use(express.json());

/**
 * GET /webhook — YouTube Pub/Sub hub verification.
 * When you subscribe to a channel's feed, YouTube sends a GET with a challenge.
 */
app.get("/webhook", (req, res) => {
  const challenge = req.query["hub.challenge"];
  if (challenge) {
    console.log("✅ YouTube Pub/Sub subscription verified");
    return res.status(200).send(challenge);
  }
  res.status(400).send("Missing hub.challenge");
});

/**
 * POST /webhook — YouTube Pub/Sub notification.
 * Fires when a new video is published on the subscribed channel.
 * Parses the Atom XML feed entry to extract the video ID.
 */
app.post("/webhook", async (req, res) => {
  // Respond immediately — YouTube expects a 2xx within a few seconds
  res.status(200).send("OK");

  try {
    const xml = req.body.toString("utf-8");
    const parsed = await parseStringPromise(xml);

    const entry = parsed?.feed?.entry?.[0];
    if (!entry) {
      console.log("⚠️  Webhook received but no entry found in feed");
      return;
    }

    const videoId = entry["yt:videoId"]?.[0];
    const title = entry["title"]?.[0];

    if (!videoId) {
      console.log("⚠️  Webhook entry missing videoId");
      return;
    }

    console.log(`\n🔔 New video detected: "${title}" (${videoId})`);
    await runPipeline(videoId);
  } catch (err) {
    console.error(`💥 Webhook processing failed: ${err.message}`);
  }
});

/**
 * POST /trigger — Manual trigger for testing.
 * Body: { "videoId": "dQw4w9WgXcQ", "pick": 0 }
 */
app.post("/trigger", async (req, res) => {
  const { videoId, pick, description } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  try {
    console.log(`\n🔧 Manual trigger for video: ${videoId}`);
    const result = await runPipeline(videoId, { pick, customDescription: description });
    res.json({
      success: true,
      videoId: result.videoId,
      title: result.title,
      style: result.style,
    });
  } catch (err) {
    console.error(`💥 Pipeline failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /health — Simple health check.
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Thumbnail pipeline server running on port ${PORT}`);
  console.log(`   POST /trigger  — manual trigger (JSON body: { videoId })`);
  console.log(`   POST /webhook  — YouTube Pub/Sub notifications`);
  console.log(`   GET  /health   — health check\n`);
});
