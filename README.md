# BFL Thumbnail Generator

Generate three YouTube thumbnail concepts from a description in seconds, then scale the same workflow into a fully automated YouTube pipeline.

This repo is intentionally split into two usable artifacts:

| Artifact | Purpose | Best for |
|----------|---------|----------|
| `thumbnail-generator/` | CLI tool that turns a description into 3 FLUX.2-generated thumbnails plus a comparison grid | Learning the BFL API and shipping fast experiments |
| `pipeline/` | Express server that reacts to YouTube events, generates thumbnails, and sets one live on the video | Production automation and end-to-end workflows |

Also included:

- `tutorial.md` - full build walkthrough from zero to working pipeline
- `examples/` - committed sample outputs so you can see the result before spending credits

## Why This Exists

Most thumbnail workflows are still manual: write copy, hunt for references, open a design tool, export a few versions, compare them, repeat. This repo collapses that into a small Node.js project with one image API and a clear path to production.

Core idea:

```text
description -> 3 style templates -> FLUX.2 -> thumbnails -> comparison grid -> optional YouTube upload
```

No LLM prompt generation layer. No second AI provider. No heavy orchestration required to get something useful working.

## Quick Start

### CLI

```bash
cd thumbnail-generator
npm install
cp .env.example .env
# add BFL_API_KEY
node src/index.js "A deep dive into building SaaS products in 2025"
```

Output:

```text
thumbnail-generator/output/
├── comparison.png
├── metadata.json
├── thumbnail_1.png
├── thumbnail_2.png
└── thumbnail_3.png
```

### Pipeline

```bash
cd pipeline
npm install
cp .env.example .env
# add BFL_API_KEY, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET
npm run auth
npm start
```

Manual trigger:

```bash
node src/trigger.js VIDEO_ID
```

## Example Output

Sample outputs are committed in `examples/`:

- `examples/cli-cinematic.png`
- `examples/cli-graphic.png`
- `examples/cli-abstract.png`
- `examples/cli-comparison.png`

These were generated from a real run of the CLI artifact, not mocked assets.

## Where To Start

- Want the full walkthrough: read `tutorial.md`
- Want the simplest entry point: start in `thumbnail-generator/`
- Want the automated version: go to `pipeline/`

## Cost

Roughly `$0.04` per CLI run for 3 generated images at the current FLUX.2 [klein] pricing.
