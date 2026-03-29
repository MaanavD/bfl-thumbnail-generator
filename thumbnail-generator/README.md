# BFL Thumbnail Generator

Automated YouTube thumbnail generator powered by the BFL FLUX.2 API.

Takes a video description → builds 3 style-variant prompts → sends them to FLUX.2 → outputs a comparison grid. Optionally pass a headshot with `--face` for character-consistent thumbnails featuring you.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env with your BFL API key
echo "BFL_API_KEY=your_key_here" > .env

# 3. Run it
node src/index.js "Your detailed video description here"

# 4. With a face reference
node src/index.js "Your description" --face headshot.jpg

# 5. From a file
node src/index.js --file description.txt --face headshot.jpg

# 6. View results
# Open viewer.html in your browser
```

## API Key

- **BFL API Key:** [dashboard.bfl.ai](https://dashboard.bfl.ai/) — create account, add credits, generate key

## Cost

~$0.04 per run (3 images at FLUX.2 [klein] pricing). No other APIs needed.

## Tutorial

See the [full tutorial](../tutorial.md) for the complete walkthrough.
