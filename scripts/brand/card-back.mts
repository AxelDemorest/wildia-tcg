/**
 * Builds the card back served by the site (`assets/brand/card-back.webp`) from the brand
 * artwork `assets/brand/back.png`: trims the white margin around the card, crops the sides
 * a little and fits the result to the 2:3 card ratio.
 *   npx tsx scripts/brand/card-back.mts
 */
import path from "node:path";
import sharp from "sharp";

const BRAND_DIR = path.resolve(import.meta.dirname, "../../assets/brand");
const SOURCE = path.join(BRAND_DIR, "back.png");
const TARGET = path.join(BRAND_DIR, "card-back.webp");

const WIDTH = 600;
const HEIGHT = 900;
/** Antialiased edge left by the trim, in source pixels. */
const EDGE = 4;
/** Taken off each side so the 2:3 fit barely squeezes the emblem; the gold frame stays clear. */
const SIDE_CROP = 20;

const { data, info } = await sharp(SOURCE)
  .trim({ threshold: 30 })
  .toBuffer({ resolveWithObject: true });

await sharp(data)
  .extract({
    left: EDGE + SIDE_CROP,
    top: EDGE,
    width: info.width - 2 * (EDGE + SIDE_CROP),
    height: info.height - 2 * EDGE,
  })
  .resize(WIDTH, HEIGHT, { fit: "fill" })
  .webp({ quality: 86 })
  .toFile(TARGET);

console.log(`${path.relative(process.cwd(), TARGET)} (${WIDTH}×${HEIGHT})`);
