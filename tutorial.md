# Build AI YouTube Thumbnails with FLUX.2 in Under 15 Minutes

**Turn a manual thumbnail workflow into a single CLI command using the BFL API.**

Most thumbnail workflows are still slow: collect references, open a design tool, make a few variants, export them, compare them, and repeat for every video.

This tutorial replaces that with a small Node.js project that takes a real video description and generates three thumbnail directions in seconds.

> Working repo: [github.com/MaanavD/bfl-thumbnail-generator](https://github.com/MaanavD/bfl-thumbnail-generator) (private for now; make it public before sharing this tutorial externally).

### What You'll Build

In this tutorial you'll build the first artifact in the repo:

| Artifact | What it does | What it teaches |
|----------|--------------|------------------|
| **`thumbnail-generator/`** | CLI tool that turns a description into 3 thumbnails | BFL FLUX.2 API, async polling, prompt templating, image compositing with sharp |

The repo also includes a separate `pipeline/` artifact that shows where this can go in production, but this tutorial stays focused on the generator itself.

---

## Who This Is For

This is for developers who are already comfortable with Node.js and API-based workflows.

**Prerequisites:**
- Node.js 20+
- A BFL API key ([dashboard.bfl.ai](https://dashboard.bfl.ai/) — $10 in credits is plenty)

That's the minimum to get the CLI working. No secondary LLM service is required.

---

## The Architecture

At its core, this is a small Node.js pipeline: take a description, wrap it in three style templates, send those prompts to FLUX.2, then save both individual outputs and a comparison grid. If you pass a headshot, FLUX.2's multi-reference editing can keep the subject consistent across all variants.

```
                                     +----------------------------+
+----------------+    +-----------+  |   BFL FLUX.2 API           |
| CLI Input      |    | Prompt    |  |   flux-2-klein-4b          |
|                |--->| Builder   |->|                            |
| description    |    |           |  |   3 concurrent requests    |
| + [headshot]   |    | 3 style   |  |   (+ face if provided)     |
+----------------+    | templates |  +-----------+----------------+
                      +-----------+              |
                                    +------------v---------------+
                                    |   sharp (compositing)      |
                                    |   3 individual PNGs        |
                                    |   + comparison grid        |
                                    +------------+---------------+
                                                 |
                                    +------------v---------------+
                                    |   HTML Viewer (local file) |
                                    |   Compare all 3 - Copy     |
                                    +----------------------------+
```

### Why No LLM for Prompts?

You might expect an LLM to generate the prompts. This project skips that layer for three reasons:

1. **The source material is already good.** A real description of the video is stronger input than a title-only prompt expansion.
2. **Templates are predictable.** The same input always produces the same three style directions.
3. **The system stays simpler.** One fewer dependency, one fewer bill, one fewer failure point.

### Why FLUX.2?

YouTube thumbnails need prompt adherence more than raw image quality. FLUX.2 is what makes this viable: it follows composition instructions well enough that style templates become useful instead of aspirational. The `flux-2-klein-4b` endpoint is also fast enough and cheap enough to generate three options per run without friction.

When you pass a headshot with `--face`, the same endpoint activates multi-reference editing. Same API, same endpoint, one extra parameter.

### Cost Per Run

| Component | Cost |
|-----------|------|
| FLUX.2 × 3 images (1344×768) | ~\$0.04 |
| **Total per run** | **~\$0.04** |

Three thumbnail concepts for roughly four cents.

---

## Let's Build It

### Step 1: Clone and Configure (2 minutes)

```bash
git clone git@github.com:MaanavD/bfl-thumbnail-generator.git
cd bfl-thumbnail-generator/thumbnail-generator
npm install
```

The repo root contains this tutorial plus both artifacts:

- `thumbnail-generator/` - the CLI tool you'll build first
- `pipeline/` - a separate GitHub artifact showing how the same core logic can run in production

Create a `.env` file:

```env
BFL_API_KEY=your_bfl_api_key_here
```

> **Get your BFL API key:** Go to [dashboard.bfl.ai](https://dashboard.bfl.ai/), create an account, add credits (\$5 minimum), navigate to API → Keys, and create a key. You only see the full key once — copy it immediately.

### Step 2: The Prompt Builder — No LLM Required

Instead of calling an LLM, we use style templates that wrap your description. Here's the core of `src/promptGenerator.js`:

```javascript
const STYLE_TEMPLATES = [
  {
    name: "Cinematic",
    wrap: (desc, hasFace) =>
      `A photorealistic, cinematic YouTube thumbnail with dramatic lighting
       and shallow depth of field. ${hasFace ? "The person from the reference
       image is the main subject, " : ""}The scene depicts: ${desc}. Shot on
       35mm film, rich color grading, high contrast, bold composition optimized
       for small-size readability.`,
  },
  // ... Graphic and Abstract templates follow the same pattern
];

export function buildPrompts(description, hasFace = false) {
  return STYLE_TEMPLATES.map((style) => style.wrap(description, hasFace));
}
```

Each template targets a distinct visual style — Cinematic, Graphic, Abstract — and when a face reference is provided, the templates instruct FLUX.2 to feature "the person from the reference image" as the subject.

You write the description. The templates handle the visual direction. FLUX.2 handles the rest.

### Step 3: Hitting the FLUX.2 Endpoint

The image generator in `src/imageGenerator.js` submits requests to BFL's API. Here's the core of it:

```javascript
const FLUX_ENDPOINT = "https://api.bfl.ai/v1/flux-2-klein-4b";

// Build the request payload
const payload = {
  prompt,
  width: 1344,
  height: 768,
};

// If a face reference is provided, use multi-reference editing
if (faceBase64) {
  payload.input_image = faceBase64;
}

// Submit the request
const response = await fetch(FLUX_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-key": BFL_API_KEY,
  },
  body: JSON.stringify(payload),
});

const { polling_url } = await response.json();
```

Notice the elegance: the *same endpoint* handles both text-to-image and multi-reference editing. When `input_image` is present, FLUX.2 activates character consistency automatically. When it's absent, pure text-to-image. No endpoint switching, no separate API calls.

### Step 4: The Polling Pattern

BFL uses async generation — you submit, then poll. Simple loop:

```javascript
for (let poll = 0; poll < MAX_POLLS; poll++) {
  await sleep(1000);

  const pollResponse = await fetch(polling_url, {
    headers: { "x-key": BFL_API_KEY },
  });
  const result = await pollResponse.json();

  if (result.status === "Ready") {
    // Download the image from result.result.sample (a signed URL)
    const image = await fetch(result.result.sample);
    return Buffer.from(await image.arrayBuffer());
  }
}
```

We run all 3 generations concurrently with `Promise.all`, so the total wait is the time for the *slowest* image — not three sequential waits.

### Tip: Getting a Good Description Without Writing One

The generator runs on a description — but you don't have to write it from scratch. The best thumbnails come from rich, specific descriptions of your video's content. Here are three ways to get one with minimal effort, starting with the easiest.

**Option A: YouTube's AI Summary (recommended — free, zero setup)**

YouTube has a built-in "Ask about this video" feature powered by Gemini. Click the sparkle icon below any video and hit **"Summarize the video"**. You'll get a structured breakdown like this:

```
This video breaks down the major upgrades in FLUX.2, the new text-to-image
model from Black Forest Labs, and how to adapt your workflow for best results.

Key Enhancements:
• New Architecture: FLUX.2 is a brand new model, not just a fine-tune,
  utilizing a language-model approach for deeper semantic understanding.
• Performance: It offers faster inference (rendering up to 10x faster)
  and supports high-resolution 2K output.
• Prompt Adherence: The model now interprets complex, nuanced instructions
  more literally, allowing for the combination of opposing styles.
```

Copy that summary, paste it into a text file, and feed it to the generator:

```bash
node src/index.js --file youtube-summary.txt --face headshot.jpg
```

This is the sweet spot: YouTube already watched your video, extracted the key themes, and structured them — for free, on any account. The summary gives FLUX.2 exactly the kind of rich, specific context it needs to generate relevant thumbnails.

**Option B: Whisper (local, free, no API key)**

If your video isn't on YouTube yet, OpenAI's [Whisper](https://github.com/openai/whisper) runs entirely on your machine. Install it, point it at your video, and pipe the output straight into the generator:

```bash
# Transcribe your video locally
whisper my-video.mp4 --model base --output_format txt

# Feed the transcript to the thumbnail generator
node src/index.js --file my-video.txt --face headshot.jpg
```

The `base` model runs on CPU in seconds for a 10-minute video. You don't need a perfect transcript — you need the *gist*, and Whisper delivers that reliably.

**Option C: Just talk into your mic**

No video yet? Open a voice memo app, spend 30 seconds describing what your video is about — the topic, the vibe, the key takeaway — and transcribe that with Whisper. A spoken, rambling paragraph produces better thumbnails than a polished three-word title because it gives FLUX.2 more visual material to work with.

The point: **don't overthink the input.** A YouTube AI summary, a rough transcript, or a stream-of-consciousness voice note will all outperform a carefully crafted title, because more context means more visual specificity in the generated thumbnails.

### Step 5: Run It

**Basic — text-to-image from a description:**

```bash
node src/index.js "A deep dive into building SaaS products in 2025. We cover the full stack — React frontend, serverless backend on AWS, Stripe billing integration, and why most indie hackers fail at distribution not engineering."
```

**With a face — put yourself in the thumbnails:**

```bash
node src/index.js "A deep dive into building SaaS products in 2025" --face headshot.jpg
```

**From a file — for longer descriptions or full script excerpts:**

```bash
node src/index.js --file video-description.txt --face headshot.jpg
```

You'll see:

```
Generating thumbnails for:
   "A deep dive into building SaaS products in 2025..."

Face reference: headshot.jpg

Built 3 prompts from templates (0.0s)
Sending 3 prompts to FLUX.2 API...
   (with face reference for character consistency)
Polling for results...

Image 1 ready — downloading...
Image 2 ready — downloading...
Image 3 ready — downloading...

All 3 images generated (8.2s)
Building comparison grid...

Done in 8.4s! Output saved to output/
```

Open `viewer.html` in your browser. Three distinct thumbnails — and if you used `--face`, *you're in all of them*.

### What a Real Run Produces

This repo includes committed example outputs in `examples/` so a reader can see the result immediately without spending credits first.

These files were generated from this exact command:

```bash
node src/index.js "A deep dive into building SaaS products in 2025, covering React frontends, serverless backends on AWS, and Stripe billing integration"
```

Generated artifacts:

```text
thumbnail-generator/output/
├── comparison.png
├── metadata.json
├── thumbnail_1.png
├── thumbnail_2.png
└── thumbnail_3.png

examples/
├── cli-comparison.png
├── cli-cinematic.png
├── cli-graphic.png
└── cli-abstract.png
```

Committed showcase grid:

![Generated comparison grid](examples/cli-comparison.png)

The corresponding `metadata.json` captures the exact description, styles, and prompts used for the run:

```json
{
  "description": "A deep dive into building SaaS products in 2025, covering React frontends, serverless backends on AWS, and Stripe billing integration",
  "face": null,
  "generated_at": "2026-03-28T17:54:22.846Z",
  "styles": ["Cinematic", "Graphic", "Abstract"]
}
```

This is more than a one-off demo script. Each run produces outputs you can inspect, compare, archive, or pass into a downstream approval flow.

### Step 6: Iterate

```bash
# Different content, same face
node src/index.js "Why Rust is eating Python's lunch in systems programming" --face headshot.jpg

# No face, pure concept art
node src/index.js "The hidden costs of microservices — why monoliths are making a comeback"

# Long-form description from a file
node src/index.js --file script-excerpt.txt
```

Each run overwrites `output/` with fresh results. Total turnaround: under 10 seconds.

---

## Beyond the Tutorial

This tutorial stops at the point where you have a working thumbnail generator you can run locally in a few seconds. That's the right scope for a launch-day tutorial: fast setup, one API, real output.

If you want to take it further, the GitHub repo includes a separate `pipeline/` artifact that turns the same core logic into an automated YouTube workflow. That project listens for new videos, pulls descriptions, generates options, and can push a thumbnail live automatically.

The important part is that the generator you built here is already the reusable core:

```text
description -> prompt templates -> FLUX.2 -> thumbnails
```

Once that exists, you can wire it into whatever environment you want:

- BFL's API directly
- a third-party FLUX provider like Replicate or Fal
- self-hosted open weights
- a webhook-driven publishing pipeline
- a human approval flow for choosing the final thumbnail

That broader production path belongs on GitHub, not in the launch tutorial. The tutorial should get a developer from zero to first successful API result quickly. The repo can then show what comes next.