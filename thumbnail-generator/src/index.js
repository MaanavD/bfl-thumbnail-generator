import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Ensure config validates env vars on import
import "./config.js";
import { buildPrompts } from "./promptGenerator.js";
import { generateAllImages } from "./imageGenerator.js";
import { createComparisonGrid } from "./gridCompositor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "output");

function parseArgs(args) {
  let description = null;
  let facePath = null;
  let filePath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--face" && args[i + 1]) {
      facePath = args[++i];
    } else if (args[i] === "--file" && args[i + 1]) {
      filePath = args[++i];
    } else if (!description) {
      description = args[i];
    }
  }

  return { description, facePath, filePath };
}

async function main() {
  const { description: cliDesc, facePath, filePath } = parseArgs(
    process.argv.slice(2)
  );

  // Load description from file or CLI arg
  let description;
  if (filePath) {
    description = (await readFile(filePath, "utf-8")).trim();
    console.log(`\n📄 Loaded description from: ${filePath}`);
  } else if (cliDesc) {
    description = cliDesc;
  } else {
    console.error(
      '\n❌ Usage: node src/index.js "Your video description" [--face headshot.jpg]'
    );
    console.error(
      "         node src/index.js --file description.txt [--face headshot.jpg]\n"
    );
    process.exit(1);
  }

  const hasFace = !!facePath;
  if (hasFace && !existsSync(facePath)) {
    console.error(`\n❌ Face image not found: ${facePath}\n`);
    process.exit(1);
  }

  console.log(`\n🎬 Generating thumbnails for:\n   "${description.slice(0, 120)}${description.length > 120 ? "..." : ""}"\n`);
  if (hasFace) console.log(`👤 Face reference: ${facePath}\n`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Step 1: Build prompts from templates (no external API needed)
  const startPrompts = performance.now();
  const prompts = buildPrompts(description, hasFace);
  const promptTime = ((performance.now() - startPrompts) / 1000).toFixed(1);
  console.log(`📝 Built 3 prompts from templates (${promptTime}s)`);

  const styles = ["Cinematic", "Graphic", "Abstract"];
  prompts.forEach((p, i) => {
    console.log(`   ${styles[i]}: ${p.slice(0, 80)}...`);
  });

  // Step 2: Generate images via BFL FLUX.2 API
  console.log(`\n🎨 Sending 3 prompts to FLUX.2 API...`);
  if (hasFace) console.log(`   (with face reference for character consistency)`);
  console.log(`⏳ Polling for results...\n`);

  const startImages = performance.now();
  const imageBuffers = await generateAllImages(prompts, facePath);
  const imageTime = ((performance.now() - startImages) / 1000).toFixed(1);
  console.log(`\n🖼️  All 3 images generated (${imageTime}s)`);

  // Step 3: Save individual thumbnails
  for (let i = 0; i < imageBuffers.length; i++) {
    const outputPath = join(OUTPUT_DIR, `thumbnail_${i + 1}.png`);
    await writeFile(outputPath, imageBuffers[i]);
  }

  // Step 4: Create comparison grid
  console.log(`🖼️  Building comparison grid...`);
  const gridBuffer = await createComparisonGrid(imageBuffers);
  await writeFile(join(OUTPUT_DIR, "comparison.png"), gridBuffer);

  // Step 5: Write metadata for the HTML viewer
  const metadata = {
    description,
    face: facePath || null,
    generated_at: new Date().toISOString(),
    styles,
    prompts,
  };
  await writeFile(
    join(OUTPUT_DIR, "metadata.json"),
    JSON.stringify(metadata, null, 2)
  );

  // Done
  const totalTime = (
    (performance.now() - startPrompts) /
    1000
  ).toFixed(1);

  console.log(`\n✅ Done in ${totalTime}s! Output saved to output/\n`);
  console.log(`   Comparison grid: output/comparison.png`);
  console.log(`   Individual:      output/thumbnail_1.png`);
  console.log(`                    output/thumbnail_2.png`);
  console.log(`                    output/thumbnail_3.png`);
  console.log(`   Viewer:          Open viewer.html in your browser\n`);
}

main().catch((err) => {
  console.error(`\n💥 Pipeline failed: ${err.message}\n`);
  if (err.cause) console.error("Cause:", err.cause);
  process.exit(1);
});
