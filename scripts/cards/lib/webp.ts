import { statSync } from "node:fs";
import sharp from "sharp";

/** Matches card display width; avoids shipping full Pixabay originals to Storage. */
export const WEBP_MAX_WIDTH = 1280;
export const WEBP_QUALITY = 82;

export async function convertImageFileToWebp(
  inputPath: string,
  outputPath: string,
): Promise<{ bytesBefore: number; bytesAfter: number }> {
  const bytesBefore = statSync(inputPath).size;
  await sharp(inputPath)
    .rotate()
    .resize({ width: WEBP_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(outputPath);
  const bytesAfter = statSync(outputPath).size;
  return { bytesBefore, bytesAfter };
}
