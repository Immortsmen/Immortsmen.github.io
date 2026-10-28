import { mkdir, copyFile } from 'node:fs/promises';
const files = ['index.html', 'app.js', 'engine.mjs', 'renderer.js', 'audio.js', 'style.css', 'favicon.svg'];
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
for (const file of files) await copyFile(new URL(file, import.meta.url), new URL(`dist/${file}`, import.meta.url));
console.log('Build complete: dist/ (7 files, no external dependencies)');
