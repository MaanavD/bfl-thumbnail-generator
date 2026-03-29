import dotenv from "dotenv";
dotenv.config();

const BFL_API_KEY = process.env.BFL_API_KEY;
const FLUX_ENDPOINT = "https://api.bfl.ai/v1/flux-2-klein-4b";
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 120;

/**
 * Generates an image from a prompt via the BFL FLUX.2 API.
 * @param {string} prompt - The image generation prompt.
 * @returns {Promise<Buffer>} The generated image as a Buffer.
 */
export async function generateImage(prompt) {
  const payload = { prompt, width: 1344, height: 768 };

  const submitRes = await fetch(FLUX_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-key": BFL_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!submitRes.ok) {
    const body = await submitRes.text();
    throw new Error(`BFL submission failed (${submitRes.status}): ${body}`);
  }

  const { polling_url } = await submitRes.json();
  if (!polling_url) throw new Error("BFL API did not return a polling_url");

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(polling_url, {
      headers: { "x-key": BFL_API_KEY },
    });
    if (!pollRes.ok) throw new Error(`BFL polling failed (${pollRes.status})`);

    const result = await pollRes.json();

    if (result.status === "Ready") {
      const imgRes = await fetch(result.result.sample);
      if (!imgRes.ok) throw new Error("Failed to download generated image");
      return Buffer.from(await imgRes.arrayBuffer());
    }

    if (result.status === "Error" || result.status === "Failed") {
      throw new Error(`BFL generation failed: ${JSON.stringify(result)}`);
    }
  }

  throw new Error("BFL polling timed out");
}

/**
 * Generates multiple images concurrently.
 * @param {string[]} prompts - Array of image prompts.
 * @returns {Promise<Buffer[]>} Array of image Buffers.
 */
export async function generateAllImages(prompts) {
  return Promise.all(prompts.map((p) => generateImage(p)));
}
