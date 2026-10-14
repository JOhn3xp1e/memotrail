import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { screenshotIds, helpGuides } from "../src/data/help";
import { captureMetadata } from "../src/data/help-captures";

const variants = ["mobile-390", "mobile-360", "desktop"] as const;
const expected = screenshotIds.length * variants.length;
const report = JSON.parse(await readFile(fileURLToPath(new URL("../public/help/capture-report.json", import.meta.url)), "utf8"));
if (report.captures !== expected || !Array.isArray(report.failures) || report.failures.length) throw new Error("The last screenshot run was incomplete. Run npm run docs:screenshots again before building.");
if (captureMetadata.length !== expected) throw new Error(`Expected ${expected} help captures; found ${captureMetadata.length}. Run npm run docs:screenshots before building.`);
for (const guide of helpGuides) if (!screenshotIds.includes(guide.screenshot)) throw new Error(`Unknown screenshot for ${guide.id}`);
let bytes = 0;
for (const variant of variants) for (const id of screenshotIds) {
  const matches = captureMetadata.filter((capture) => capture.id === id && capture.variant === variant);
  if (matches.length !== 1 || !matches[0]!.annotations.length) throw new Error(`Missing or duplicate annotated capture ${variant}/${id}`);
  const capture = matches[0]!;
  for (const kind of ["raw", "annotated"]) {
    const path = fileURLToPath(new URL(`../public/help/${kind}/${variant}/${id}.webp`, import.meta.url));
    const buffer = await readFile(path);
    const image = await sharp(buffer).metadata();
    if (image.format !== "webp" || image.width !== capture.width || image.height !== capture.height) throw new Error(`Invalid screenshot: ${path}`);
    if (kind === "annotated") bytes += buffer.length;
  }
}
if (bytes > 4 * 1024 * 1024) throw new Error("Help screenshots exceed the 4 MiB offline budget. Optimize them before building.");
console.log(`Help assets verified: ${expected} captures / ${expected * 2} WebP files, ${(bytes / 1024 / 1024).toFixed(2)} MiB precached.`);
