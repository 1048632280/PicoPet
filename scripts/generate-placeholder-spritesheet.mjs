import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const assetDir = join(root, "src", "assets", "pet");
const frameWidth = 128;
const frameHeight = 128;
const frames = 8;
const width = frameWidth * frames;
const height = frameHeight;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createPng() {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const frame = Math.floor(x / frameWidth);
      const localX = x % frameWidth;
      const dx = localX - 64;
      const dy = y - 68 + Math.sin(frame / frames * Math.PI * 2) * 5;
      const body = Math.hypot(dx, dy) <= 38;
      const eyeLeft = Math.hypot(localX - 50, y - 58) <= 4;
      const eyeRight = Math.hypot(localX - 78, y - 58) <= 4;
      const offset = row + 1 + x * 4;

      if (body) {
        raw[offset] = 80 + frame * 12;
        raw[offset + 1] = 160;
        raw[offset + 2] = 220;
        raw[offset + 3] = 255;
      }
      if (eyeLeft || eyeRight) {
        raw[offset] = 20;
        raw[offset + 1] = 30;
        raw[offset + 2] = 40;
        raw[offset + 3] = 255;
      }
    }
  }

  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

mkdirSync(assetDir, { recursive: true });
writeFileSync(join(assetDir, "pico_idle.png"), createPng());
writeFileSync(
  join(assetDir, "pico_idle.json"),
  `${JSON.stringify(
    {
      image: "pico_idle.png",
      frame_width: frameWidth,
      frame_height: frameHeight,
      frames,
      fps: 12,
      loop: true
    },
    null,
    2
  )}\n`
);

console.log(`Generated ${join(assetDir, "pico_idle.png")}`);
