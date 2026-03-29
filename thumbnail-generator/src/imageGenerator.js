import { readFile } from "node:fs/promises";
import { BFL_API_KEY } from "./config.js";

const BFL_BASE_URL = "https://api.bfl.ai/v1";
const FLUX_ENDPOINT = `${BFL_BASE_URL}/flux-2-klein-4b`;
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 120;

/**
 * Encodes a local image file to a base64 data URI.
 * @param {string} filePath - Path to the image file.
 * @returns {Promise<string>} Base64 data URI string.
 */
async function encodeImageToBase64(filePath) {
  const buffer = await readFile(filePath);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

/**
 * Submits an image generation request to the BFL FLUX.2 API and polls until complete.
 * When a face reference is provided, it uses multi-reference editing to maintain
 * character consistency across all generated thumbnails.
 * @param {string} prompt - The image generation prompt.
 * @param {number} index - The image index (1-based, for logging).
 * @param {string|null} faceBase64 - Base64-encoded face reference image, or null.
 * @returns {Promise<Buffer>} The generated image as a Buffer.
 */
export async function generateImage(prompt, index, faceBase64 = null) {
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

  // Step 1: Submit generation request
  const submitResponse = await fetch(FLUX_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-key": BFL_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!submitResponse.ok) {
    const errorBody = await submitResponse.text();
    throw new Error(
      `BFL API submission failed (${submitResponse.status}): ${errorBody}`
    );
  }

  const { polling_url } = await submitResponse.json();

  if (!polling_url) {
    throw new Error("BFL API did not return a polling_url");
  }

  // Step 2: Poll for result
  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await sleep(POLL_INTERVAL_MS);

    const pollResponse = await fetch(polling_url, {
      headers: { "x-key": BFL_API_KEY },
    });

    if (!pollResponse.ok) {
      throw new Error(`BFL polling failed (${pollResponse.status})`);
    }

    const result = await pollResponse.json();

    if (result.status === "Ready") {
      console.log(`📦 Image ${index} ready — downloading...`);
      return await downloadImage(result.result.sample);
    }

    if (result.status === "Error" || result.status === "Failed") {
      throw new Error(
        `BFL generation failed for image ${index}: ${JSON.stringify(result)}`
      );
    }
  }

  throw new Error(`BFL polling timed out for image ${index} after ${MAX_POLLS}s`);
}

/**
 * Generates multiple images concurrently.
 * @param {string[]} prompts - Array of image prompts.
 * @param {string|null} facePath - Path to face reference image, or null.
 * @returns {Promise<Buffer[]>} Array of image Buffers.
 */
export async function generateAllImages(prompts, facePath = null) {
  let faceBase64 = null;
  if (facePath) {
    console.log(`👤 Encoding face reference: ${facePath}`);
    faceBase64 = await encodeImageToBase64(facePath);
  }

  return Promise.all(
    prompts.map((prompt, i) => generateImage(prompt, i + 1, faceBase64))
  );
}

/**
 * Downloads an image from a signed URL and returns it as a Buffer.
 * @param {string} url - The signed image URL.
 * @returns {Promise<Buffer>} The image data.
 */
async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
