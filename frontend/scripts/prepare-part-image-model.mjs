import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Serve model/runtime from the app, including on LAN devices without internet.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(await fs.readFile(path.join(root, 'node_modules/@imgly/background-removal/package.json'), 'utf8')).version;
const source = `https://staticimgly.com/@imgly/background-removal-data/${version}/dist/`;
const target = path.join(root, 'public/part-image-model');
const response = await fetch(new URL('resources.json', source));
if (!response.ok) throw new Error(`Model manifest download failed: ${response.status}`);
const manifest = await response.json();
const keys = ['/models/isnet_fp16', '/onnxruntime-web/ort-wasm-simd-threaded.wasm', '/onnxruntime-web/ort-wasm-simd-threaded.mjs'];
const selected = Object.fromEntries(keys.map(key => {
  if (!manifest[key]) throw new Error(`Missing model resource: ${key}`);
  return [key, manifest[key]];
}));
await fs.mkdir(target, { recursive: true });
for (const [key, entry] of Object.entries(selected)) {
  for (const chunk of entry.chunks) {
    const destination = path.resolve(target, chunk.name);
    if (!destination.startsWith(target + path.sep)) throw new Error('Invalid resource path');
    const size = chunk.offsets[1] - chunk.offsets[0];
    if ((await fs.stat(destination).catch(() => null))?.size === size) continue;
    const download = await fetch(new URL(chunk.name, source));
    if (!download.ok) throw new Error(`Resource download failed: ${download.status}`);
    const bytes = Buffer.from(await download.arrayBuffer());
    if (bytes.length !== size) throw new Error(`Incomplete download: ${key}`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
  }
  console.log(`Ready: ${key} (${entry.size} bytes)`);
}
await fs.writeFile(path.join(target, 'resources.json'), JSON.stringify(selected));
