import sharp from "sharp";

const IMAGE_WIDTH = 1344;
const IMAGE_HEIGHT = 768;
const GAP = 12;
const BORDER = 2;
const LABEL_HEIGHT = 36;

const STYLE_LABELS = ["Cinematic", "Graphic", "Abstract"];

/**
 * Creates an SVG text label for overlay compositing.
 * @param {string} text - The label text.
 * @param {number} width - The width of the label area.
 * @returns {Buffer} SVG as a Buffer.
 */
function createLabel(text, width) {
  const svg = `<svg width="${width}" height="${LABEL_HEIGHT}">
    <rect width="${width}" height="${LABEL_HEIGHT}" fill="rgba(0,0,0,0.7)" rx="4"/>
    <text x="${width / 2}" y="${LABEL_HEIGHT / 2 + 6}" 
          font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold"
          fill="white" text-anchor="middle">${text}</text>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Composites 3 images into a side-by-side comparison grid with labels.
 * @param {Buffer[]} imageBuffers - Array of 3 image Buffers.
 * @returns {Promise<Buffer>} The composited grid image as a PNG Buffer.
 */
export async function createComparisonGrid(imageBuffers) {
  if (imageBuffers.length !== 3) {
    throw new Error(`Expected 3 images, got ${imageBuffers.length}`);
  }

  const totalWidth = IMAGE_WIDTH * 3 + GAP * 2;
  const totalHeight = IMAGE_HEIGHT;

  // Resize each image to exact dimensions and add border
  const processedImages = await Promise.all(
    imageBuffers.map(async (buf, i) => {
      const resized = await sharp(buf)
        .resize(IMAGE_WIDTH - BORDER * 2, IMAGE_HEIGHT - BORDER * 2, {
          fit: "cover",
        })
        .extend({
          top: BORDER,
          bottom: BORDER,
          left: BORDER,
          right: BORDER,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toBuffer();

      // Composite the style label onto the image
      const label = createLabel(STYLE_LABELS[i], IMAGE_WIDTH);
      return sharp(resized)
        .composite([
          {
            input: label,
            top: IMAGE_HEIGHT - LABEL_HEIGHT - 8,
            left: 0,
          },
        ])
        .png()
        .toBuffer();
    })
  );

  // Create the grid canvas and composite images side by side
  const grid = sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).composite(
    processedImages.map((img, i) => ({
      input: img,
      left: i * (IMAGE_WIDTH + GAP),
      top: 0,
    }))
  );

  return grid.png().toBuffer();
}
