# BFL Thumbnail Generator

Generate three YouTube thumbnail concepts from a description using the BFL FLUX.2 API.

The CLI takes a description, wraps it in three style templates, sends all three prompts to FLUX.2, and saves both individual thumbnails and a comparison grid. Pass `--face` to keep the main subject consistent across variants.

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

# 6. Review results
# Open viewer.html in your browser
```

## API Key

- **BFL API Key:** [dashboard.bfl.ai](https://dashboard.bfl.ai/) — create account, add credits, generate key

## Cost

~$0.04 per run for 3 images at current FLUX.2 [klein] pricing. No other APIs required.

## Tutorial

See the [root landing page](../README.md) for the repo overview or the [full tutorial](../tutorial.md) for the complete walkthrough.
