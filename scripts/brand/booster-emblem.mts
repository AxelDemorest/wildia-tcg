/**
 * Builds the emblem printed on the booster packs (`assets/brand/booster-emblem.webp`) from
 * the card back (`assets/brand/card-back.webp`): crops the central emblem and turns the
 * dark green background into transparency, keyed on the red channel.
 *   npx tsx scripts/brand/booster-emblem.mts
 */
import path from "node:path";
import sharp from "sharp";

const BRAND_DIR = path.resolve(import.meta.dirname, "../../assets/brand");
const SOURCE = path.join(BRAND_DIR, "card-back.webp");
const TARGET = path.join(BRAND_DIR, "booster-emblem.webp");

const CARD_WIDTH = 600;
const CARD_HEIGHT = 900;
/** Emblem area of the card back, in its pixels. */
const CROP = { left: 88, top: 208, width: 424, height: 474 };
/** Red level at or below which a pixel is background, and the span up to full opacity. */
const BACKGROUND_RED = 45;
const OPAQUE_SPAN = 140;
const WIDTH = 300;
const HEIGHT = 335;

const { data } = await sharp(SOURCE)
  .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "fill" })
  .removeAlpha()
  .extract(CROP)
  .raw()
  .toBuffer({ resolveWithObject: true });

const rgba = Buffer.alloc(CROP.width * CROP.height * 4);
for (let pixel = 0; pixel < CROP.width * CROP.height; pixel++) {
  const red = data[pixel * 3];
  rgba[pixel * 4] = red;
  rgba[pixel * 4 + 1] = data[pixel * 3 + 1];
  rgba[pixel * 4 + 2] = data[pixel * 3 + 2];
  rgba[pixel * 4 + 3] = Math.round(
    Math.min(1, Math.max(0, (red - BACKGROUND_RED) / OPAQUE_SPAN)) * 255,
  );
}

await sharp(rgba, { raw: { width: CROP.width, height: CROP.height, channels: 4 } })
  .resize(WIDTH, HEIGHT)
  .webp({ quality: 90 })
  .toFile(TARGET);

console.log(`${path.relative(process.cwd(), TARGET)} (${WIDTH}×${HEIGHT})`);
