import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// Explicit source allowlist: never upload node_modules, local browser traces,
// machine-readable reports containing local paths, or personal pause notes.
const roots = ['.gitignore', 'index.html', 'stage0.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'playwright.config.ts', 'README.md', 'README.zh-CN.md', 'THIRD-PARTY-NOTICES.txt'];
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat();
}
const paths = [...roots, ...(await Promise.all(['src', 'e2e', 'scripts', 'dist'].map(walk))).flat(),
  'docs/verification.md', 'docs/build-verification.json',
  'docs/en/preview-dragging.png', 'docs/en/preview-dark.png',
  'docs/zh-CN/preview-dragging.png', 'docs/zh-CN/preview-dark.png'];
const files = await Promise.all(paths.map(async path => {
  const bytes = await readFile(path);
  return { path, binary: path.endsWith('.png'), content: bytes.toString(path.endsWith('.png') ? 'base64' : 'utf8'), bytes: bytes.length };
}));
await mkdir('work', { recursive: true });
await writeFile('work/github-upload.json', JSON.stringify(files));
console.log(JSON.stringify({ files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), manifest: resolve('work/github-upload.json') }));
