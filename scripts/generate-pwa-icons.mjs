/**
 * Generates PWA icons from public/icons/icon.png (pure Node, no deps).
 *
 *   icon-192.png / icon-512.png        → box-downscaled source (purpose "any")
 *   apple-touch-icon.png (180)         → box-downscaled source
 *   icon-maskable-512.png              → artwork scaled to 80% on a full-bleed
 *                                        brand-blue background, so OS circular
 *                                        masking never clips the wordmark.
 *
 * Run: node scripts/generate-pwa-icons.mjs   (or: pnpm icons)
 */
import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(ICONS_DIR, { recursive: true });
const SOURCE = join(ICONS_DIR, "icon.png");

/* ---------------- PNG decode (RGB/RGBA, 8-bit, non-interlaced) ---------------- */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("Not a PNG");
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`Unsupported bit depth ${bitDepth}`);
  if (interlace !== 0) throw new Error("Interlaced PNG not supported");
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  if (!channels) throw new Error(`Unsupported color type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4); // always emit RGBA
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rp++];
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let val;
      switch (filter) {
        case 0: val = rawByte; break;
        case 1: val = rawByte + a; break;
        case 2: val = rawByte + b; break;
        case 3: val = rawByte + ((a + b) >> 1); break;
        case 4: val = rawByte + paeth(a, b, c); break;
        default: throw new Error(`Bad filter ${filter}`);
      }
      cur[x] = val & 0xff;
    }
    // expand row to RGBA
    for (let x = 0; x < width; x++) {
      const si = x * channels;
      const di = (y * width + x) * 4;
      out[di] = cur[si];
      out[di + 1] = cur[si + 1];
      out[di + 2] = cur[si + 2];
      out[di + 3] = channels === 4 ? cur[si + 3] : 255;
    }
    prev.set(cur);
  }
  return { width, height, data: out };
}

/* ---------------- box-average downscale (RGBA → RGBA) ---------------- */
function resize(src, dstSize) {
  const { width: sw, height: sh, data } = src;
  const dst = Buffer.alloc(dstSize * dstSize * 4);
  const sxRatio = sw / dstSize;
  const syRatio = sh / dstSize;
  for (let dy = 0; dy < dstSize; dy++) {
    const y0 = Math.floor(dy * syRatio);
    const y1 = Math.max(y0 + 1, Math.floor((dy + 1) * syRatio));
    for (let dx = 0; dx < dstSize; dx++) {
      const x0 = Math.floor(dx * sxRatio);
      const x1 = Math.max(x0 + 1, Math.floor((dx + 1) * sxRatio));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * sw + x) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3];
          n++;
        }
      }
      const di = (dy * dstSize + dx) * 4;
      dst[di] = Math.round(r / n);
      dst[di + 1] = Math.round(g / n);
      dst[di + 2] = Math.round(b / n);
      dst[di + 3] = Math.round(a / n);
    }
  }
  return { width: dstSize, height: dstSize, data: dst };
}

/* ---------------- PNG encode (RGBA, filter 0) ---------------- */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rowBytes = size * 4;
  const filtered = Buffer.alloc(size * (rowBytes + 1));
  for (let y = 0; y < size; y++) {
    filtered[y * (rowBytes + 1)] = 0;
    rgba.copy(filtered, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  const idat = deflateSync(filtered, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ---------------- sample the brand-blue background from the source ---------------- */
function sampleBg(src) {
  // Top-center strip sits above the wordmark → pure background blue.
  let br = 0, bg = 0, bb = 0, n = 0;
  const sy = Math.floor(src.height * 0.04);
  for (let x = Math.floor(src.width * 0.4); x < Math.floor(src.width * 0.6); x++) {
    const i = (sy * src.width + x) * 4;
    br += src.data[i]; bg += src.data[i + 1]; bb += src.data[i + 2]; n++;
  }
  return [Math.round(br / n), Math.round(bg / n), Math.round(bb / n)];
}

/* ---------------- strip the source's black corners ----------------
 * The artwork is white-on-blue inside its own rounded square; everything
 * outside that square is black. We key those dark pixels out — either to
 * transparent (premium squircle on any surface) or filled with brand blue
 * (apple-touch needs an opaque icon). A luminance ramp keeps the rounded
 * edge anti-aliased instead of leaving a hard dark fringe.
 */
function stripCorners(img, bg, mode) {
  const [br, bg_, bb] = bg;
  const DARK = 24;   // ≤ → pure corner
  const LIGHT = 110; // ≥ → real content (blue square ~170, white 255)
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.max(d[i], d[i + 1], d[i + 2]);
    if (lum >= LIGHT) continue; // keep blue square / white content untouched
    const t = Math.max(0, (lum - DARK) / (LIGHT - DARK)); // 0..1 across the AA ring
    if (mode === "transparent") {
      // Edge pixels are a black↔blue blend; restore them to clean blue + ramp alpha.
      d[i] = br; d[i + 1] = bg_; d[i + 2] = bb;
      d[i + 3] = Math.round(t * 255);
    } else {
      // fill: blend toward solid blue, stay fully opaque.
      d[i] = Math.round(br * (1 - t) + d[i] * t);
      d[i + 1] = Math.round(bg_ * (1 - t) + d[i + 1] * t);
      d[i + 2] = Math.round(bb * (1 - t) + d[i + 2] * t);
      d[i + 3] = 255;
    }
  }
  return img;
}

/* ---------------- composite: artwork at 80% on full-bleed bg ---------------- */
function makeMaskable(src, size, safe = 0.8) {
  const [br, bg, bb] = sampleBg(src);
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = br; canvas[i * 4 + 1] = bg; canvas[i * 4 + 2] = bb; canvas[i * 4 + 3] = 255;
  }
  const inner = Math.round(size * safe);
  const offset = Math.round((size - inner) / 2);
  const art = resize(src, inner);
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const si = (y * inner + x) * 4;
      const di = ((y + offset) * size + (x + offset)) * 4;
      // Source corners are black (outside its own rounded square); the real
      // content is white on blue. Key out dark pixels so the maskable bg is a
      // clean full-bleed blue with no black corner triangles.
      const r = art.data[si], g = art.data[si + 1], b = art.data[si + 2];
      const isCorner = r < 40 && g < 40 && b < 90;
      canvas[di] = isCorner ? br : r;
      canvas[di + 1] = isCorner ? bg : g;
      canvas[di + 2] = isCorner ? bb : b;
      canvas[di + 3] = 255;
    }
  }
  return { width: size, height: size, data: canvas };
}

/* ---------------- run ---------------- */
const source = decodePNG(readFileSync(SOURCE));
console.log(`Source: icon.png ${source.width}x${source.height}`);
const bg = sampleBg(source);

const direct = [
  // Transparent corners → clean blue squircle on any surface.
  { name: "icon-192.png", size: 192, mode: "transparent" },
  { name: "icon-512.png", size: 512, mode: "transparent" },
  // iOS ignores alpha + applies its own mask → fill corners with brand blue.
  { name: "apple-touch-icon.png", size: 180, mode: "fill" },
];
for (const t of direct) {
  const img = stripCorners(resize(source, t.size), bg, t.mode);
  writeFileSync(join(ICONS_DIR, t.name), encodePNG(t.size, img.data));
  console.log("✓", t.name, `${t.size}x${t.size}`, `(${t.mode})`);
}

const maskable = makeMaskable(source, 512);
writeFileSync(join(ICONS_DIR, "icon-maskable-512.png"), encodePNG(512, maskable.data));
console.log("✓ icon-maskable-512.png 512x512 (80% safe zone)");

console.log("Done →", ICONS_DIR);
