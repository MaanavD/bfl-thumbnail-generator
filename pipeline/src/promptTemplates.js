const STYLE_TEMPLATES = [
  {
    name: "Cinematic",
    wrap: (desc) =>
      `A photorealistic, cinematic YouTube thumbnail with dramatic lighting and shallow depth of field. The scene depicts: ${desc}. Shot on 35mm film, rich color grading, high contrast, bold composition optimized for small-size readability. Absolutely no text, words, letters, numbers, or writing of any kind in the image.`,
  },
  {
    name: "Graphic",
    wrap: (desc) =>
      `A bold, flat-design YouTube thumbnail with strong geometric shapes and vibrant saturated colors. The scene represents: ${desc}. Vector-art influenced, clean lines, high contrast color blocks, eye-catching at any size. Absolutely no text, words, letters, numbers, or writing of any kind in the image.`,
  },
  {
    name: "Abstract",
    wrap: (desc) =>
      `A surreal, conceptual YouTube thumbnail with metaphorical imagery. An artistic interpretation of: ${desc}. Dreamlike composition, symbolic elements, thought-provoking visual metaphor, striking colors. Absolutely no text, words, letters, numbers, or writing of any kind in the image.`,
  },
];

export function buildPrompts(description) {
  return STYLE_TEMPLATES.map((style) => style.wrap(description));
}

export const STYLE_NAMES = STYLE_TEMPLATES.map((s) => s.name);
