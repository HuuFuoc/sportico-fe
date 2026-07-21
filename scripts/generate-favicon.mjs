/**
 * Generates src/app/favicon.ico from public/logo.png (pure Node, no deps).
 *
 * The logo is a wide "SPORTICO" wordmark — unreadable once a browser scales it
 * to a 16px tab. So this crops just the ball mark, centres it on the brand blue
 * sampled from the logo itself, and packs 16/32/48px frames into one .ico.
 *
 * Run: node scripts/generate-favicon.mjs
 */
import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "public", "logo.png");
const OUT = join(ROOT, "src", "app", "favicon.ico");

/* ---------------- PNG decode (RGB/RGBA, 8-bit, non-interlaced) ---------------- */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("Not a PNG");
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
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
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
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
    for (let x = 0; x < width; x++) {
      const si = x * channels, di = (y * width + x) * 4;
      out[di] = cur[si];
      out[di + 1] = cur[si + 1];
      out[di + 2] = cur[si + 2];
      out[di + 3] = channels === 4 ? cur[si + 3] : 255;
    }
    prev.set(cur);
  }
  return { width, height, data: out };
}

/* ---------------- box-average downscale (RGBA → square RGBA) ---------------- */
function resize(src, dstSize) {
  const { width: sw, height: sh, data } = src;
  const dst = Buffer.alloc(dstSize * dstSize * 4);
  const sxRatio = sw / dstSize, syRatio = sh / dstSize;
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const rowBytes = size * 4;
  const filtered = Buffer.alloc(size * (rowBytes + 1));
  for (let y = 0; y < size; y++) {
    filtered[y * (rowBytes + 1)] = 0;
    rgba.copy(filtered, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  const idat = deflateSync(filtered, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ---------------- locate the ball mark ---------------- */
const src = decodePNG(readFileSync(SOURCE));
const bg = (() => {
  // Top-centre sits above the wordmark → pure background blue.
  const y = Math.floor(src.height * 0.04);
  let r = 0, g = 0, b = 0, n = 0;
  for (let x = Math.floor(src.width * 0.4); x < Math.floor(src.width * 0.6); x++) {
    const i = (y * src.width + x) * 4;
    r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; n++;
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
})();

const isInk = (x, y) => {
  const i = (y * src.width + x) * 4;
  return src.data[i] > 190 && src.data[i + 1] > 190 && src.data[i + 2] > 190 && src.data[i + 3] > 128;
};

// The ball is the right-most blob on the lower mark row. Restrict the search to
// below the wordmark, then isolate that blob by column density — a raw bounding
// box would be dragged out to the full width by stray anti-aliasing specks.
const win = {
  x0: Math.floor(src.width * 0.5), x1: src.width,
  y0: Math.floor(src.height * 0.55), y1: src.height,
};
const MIN_INK = 3; // a column/row needs this many ink pixels to count as solid

const colInk = new Array(src.width).fill(0);
for (let x = win.x0; x < win.x1; x++) {
  for (let y = win.y0; y < win.y1; y++) if (isInk(x, y)) colInk[x]++;
}

// Walk right-to-left: the first solid run we meet is the ball.
let maxX = -1, minX = -1;
for (let x = win.x1 - 1; x >= win.x0; x--) {
  if (maxX < 0) {
    if (colInk[x] >= MIN_INK) maxX = x;
  } else if (colInk[x] < MIN_INK) {
    minX = x + 1;
    break;
  }
}
if (maxX < 0) throw new Error("Ball mark not found — check the search window");
if (minX < 0) minX = win.x0;

let minY = Infinity, maxY = -1;
for (let y = win.y0; y < win.y1; y++) {
  let n = 0;
  for (let x = minX; x <= maxX; x++) if (isInk(x, y)) n++;
  if (n < MIN_INK) continue;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
}
if (maxY < 0) throw new Error("Ball mark has no solid rows");
console.log(`bg blue      : rgb(${bg.join(",")})`);
console.log(`ball bbox    : x ${minX}..${maxX}  y ${minY}..${maxY}  (${maxX - minX + 1} x ${maxY - minY + 1})`);

/* ---------------- crop a padded square around the ball ---------------- */
const PAD = 1.55; // ball occupies ~65% of the tile — breathing room, still bold
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
const side = Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * PAD);
const ox = Math.round(cx - side / 2), oy = Math.round(cy - side / 2);

const tile = Buffer.alloc(side * side * 4);
for (let y = 0; y < side; y++) {
  for (let x = 0; x < side; x++) {
    const sx = ox + x, sy = oy + y;
    const di = (y * side + x) * 4;
    if (sx >= 0 && sx < src.width && sy >= 0 && sy < src.height) {
      const si = (sy * src.width + sx) * 4;
      tile[di] = src.data[si];
      tile[di + 1] = src.data[si + 1];
      tile[di + 2] = src.data[si + 2];
    } else {
      // Outside the artwork — extend the brand blue rather than leaving black.
      tile[di] = bg[0]; tile[di + 1] = bg[1]; tile[di + 2] = bg[2];
    }
    tile[di + 3] = 255;
  }
}
const cropped = { width: side, height: side, data: tile };
console.log(`tile         : ${side} x ${side} (pad ${PAD})`);

/* ---------------- pack PNG frames into one .ico ---------------- */
// ICO has embedded PNG frames (Vista+): 6-byte ICONDIR, then one 16-byte
// ICONDIRENTRY per frame, then the PNG blobs.
const SIZES = [16, 32, 48];
const frames = SIZES.map((s) => ({ size: s, png: encodePNG(s, resize(cropped, s).data) }));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type 1 = icon
header.writeUInt16LE(frames.length, 4);

let offset = 6 + frames.length * 16;
const entries = [];
for (const f of frames) {
  const e = Buffer.alloc(16);
  e[0] = f.size === 256 ? 0 : f.size; // width  (0 means 256)
  e[1] = f.size === 256 ? 0 : f.size; // height
  e[2] = 0; // palette colours
  e[3] = 0; // reserved
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(f.png.length, 8);
  e.writeUInt32LE(offset, 12);
  entries.push(e);
  offset += f.png.length;
}

writeFileSync(OUT, Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]));
console.log(`✓ ${OUT}  (${SIZES.join(", ")}px — ${offset} bytes)`);
