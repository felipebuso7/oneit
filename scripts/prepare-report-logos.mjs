import sharp from "sharp";
import path from "node:path";

const root = process.cwd();
await sharp(path.join(root, "public", "oneit-logo.png")).trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(root, "public", "oneit-logo-rto.png"));
await sharp(path.join(root, "public", "servicia-logo.png")).trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(root, "public", "servicia-logo-rto.png"));
