/**
 * Generates src/app/favicon.ico from public/icons/icon.png (pure Node, no deps).
 *
 * icon.png is a square icon mark (the "S" glyph in a rounded blue tile) — it
 * already reads fine at small sizes, so unlike the old wordmark-based logo
 * this needs no cropping. It just strips the source's black rounded-corner
 * mask (filling with the sampled brand blue, since .ico ignores alpha in
 * most renderers) and packs 16/32/48px frames into one .ico.
 *
 * Run: node scripts/generate-favicon.mjs
 */
import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "public", "icons", "icon.png");
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

/* ---------------- sample the brand-blue background from the source ---------------- */
function sampleBg(src) {
  // Top-centre strip sits inside the rounded tile, above any glyph strokes →
  // pure background blue.
  const y = Math.floor(src.height * 0.04);
  let r = 0, g = 0, b = 0, n = 0;
  for (let x = Math.floor(src.width * 0.4); x < Math.floor(src.width * 0.6); x++) {
    const i = (y * src.width + x) * 4;
    r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; n++;
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/* ---------------- strip the source's black rounded-corner mask ----------------
 * The artwork sits inside its own rounded square; everything outside that
 * square is black. Fill those corners with the brand blue instead (an .ico
 * needs to stay opaque), with a luminance ramp so the rounded edge stays
 * anti-aliased instead of leaving a hard dark fringe.
 */
function stripCorners(img, bg) {
  const [br, bg_, bb] = bg;
  const DARK = 24; // <= → pure corner
  const LIGHT = 110; // >= → real content (blue tile ~170, white glyph 255)
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.max(d[i], d[i + 1], d[i + 2]);
    if (lum >= LIGHT) continue;
    const t = Math.max(0, (lum - DARK) / (LIGHT - DARK));
    d[i] = Math.round(br * (1 - t) + d[i] * t);
    d[i + 1] = Math.round(bg_ * (1 - t) + d[i + 1] * t);
    d[i + 2] = Math.round(bb * (1 - t) + d[i + 2] * t);
    d[i + 3] = 255;
  }
  return img;
}

/* ---------------- run ---------------- */
const src = decodePNG(readFileSync(SOURCE));
const bg = sampleBg(src);
console.log(`Source: icon.png ${src.width}x${src.height}`);
console.log(`bg blue: rgb(${bg.join(",")})`);

/* ---------------- pack PNG frames into one .ico ---------------- */
// ICO has embedded PNG frames (Vista+): 6-byte ICONDIR, then one 16-byte
// ICONDIRENTRY per frame, then the PNG blobs.
const SIZES = [16, 32, 48];
const frames = SIZES.map((s) => ({ size: s, png: encodePNG(s, stripCorners(resize(src, s), bg).data) }));

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
