const STYLE_TEMPLATES = [
  {
    name: "Cinematic",
    wrap: (desc, hasFace) =>
      `A photorealistic, cinematic YouTube thumbnail with dramatic lighting and shallow depth of field. ${hasFace ? "The person from the reference image is the main subject, " : ""}The scene depicts: ${desc}. Shot on 35mm film, rich color grading, high contrast, bold composition optimized for small-size readability. Absolutely no text, words, letters, numbers, or writing of any kind in the image.`,
  },
  {
    name: "Graphic",
    wrap: (desc, hasFace) =>
      `A bold, flat-design YouTube thumbnail with strong geometric shapes and vibrant saturated colors. ${hasFace ? "The person from the reference image is featured prominently, stylized to match the graphic aesthetic. " : ""}The scene represents: ${desc}. Vector-art influenced, clean lines, high contrast color blocks, eye-catching at any size. Absolutely no text, words, letters, numbers, or writing of any kind in the image.`,
  },
  {
    name: "Abstract",
    wrap: (desc, hasFace) =>
      `A surreal, conceptual YouTube thumbnail with metaphorical imagery. ${hasFace ? "The person from the reference image appears in a dreamlike context, " : ""}An artistic interpretation of: ${desc}. Dreamlike composition, symbolic elements, thought-provoking visual metaphor, striking colors. Absolutely no text, words, letters, numbers, or writing of any kind in the image.`,
  },
];

/**
 * Builds 3 distinct image prompts from a video description using style templates.
 * No external API needed — pure deterministic string construction.
 * @param {string} description - Rich video description or script excerpt.
 * @param {boolean} hasFace - Whether a face reference image is being used.
 * @returns {string[]} Array of 3 image prompt strings.
 */
export function buildPrompts(description, hasFace = false) {
  return STYLE_TEMPLATES.map((style) => style.wrap(description, hasFace));
}
