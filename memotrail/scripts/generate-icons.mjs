import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../public/", import.meta.url);
const source = fileURLToPath(new URL("icons/memoicon.png", root));
const metadata = await sharp(source).metadata();
if (!metadata.width || !metadata.height || metadata.width < 512 || metadata.height < 512) throw new Error("Provide artwork at least 512 pixels on each side.");
await mkdir(fileURLToPath(new URL("icons/", root)), { recursive: true });
// Make only the near-black exterior matte transparent. Flood filling from the
// image boundary preserves dark details inside the supplied illustration.
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const visited = new Uint8Array(info.width * info.height);
const queue = new Int32Array(visited.length);
let head = 0, tail = 0;
function visit(x, y) {
  if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
  const pixel = y * info.width + x, offset = pixel * 4;
  if (visited[pixel] || data[offset] > 20 || data[offset + 1] > 20 || data[offset + 2] > 20) return;
  visited[pixel] = 1; queue[tail++] = pixel; data[offset + 3] = 0;
}
for (let x = 0; x < info.width; x++) { visit(x, 0); visit(x, info.height - 1); }
for (let y = 0; y < info.height; y++) { visit(0, y); visit(info.width - 1, y); }
while (head < tail) { const pixel = queue[head++], x = pixel % info.width, y = Math.floor(pixel / info.width); visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1); }
const artworkSource = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
// Keep the original source unchanged, with consistent artwork scaling/padding.
for (const [path, size] of [["icons/icon-192.png", 192], ["icons/icon-512.png", 512], ["apple-touch-icon.png", 180], ["favicon.png", 64]]) {
  await sharp(artworkSource).resize(size, size, { fit: "contain", background: "#FAF7F2" }).flatten({ background: "#FAF7F2" }).png().toFile(fileURLToPath(new URL(path, root)));
}
// Fit the entire square artwork inside the maskable 80%-diameter safe circle:
// a 55% square has a diagonal below 80%, so every meaningful pixel is protected.
const size = 512, artworkSize = Math.round(size * .55);
const artwork = await sharp(artworkSource).resize(artworkSize, artworkSize, { fit: "contain", background: "#FAF7F2" }).png().toBuffer();
await sharp({ create: { width: size, height: size, channels: 4, background: "#FAF7F2" } }).composite([{ input: artwork, gravity: "centre" }]).png().toFile(fileURLToPath(new URL("icons/maskable-512.png", root)));
console.log(`Generated 192px, 512px, maskable 512px, Apple 180px and favicon 64px from ${metadata.width}×${metadata.height} supplied artwork.`);
