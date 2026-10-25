import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const expected = ['notion-math-editor.zh-CN.html', 'notion-math-editor.en.html', 'notion-math-editor.html'];
const files = (await readdir('dist')).sort();
if (JSON.stringify(files) !== JSON.stringify([...expected].sort())) throw Error('Unexpected files in dist');
const reports = [];
for (const name of expected) {
const path = `dist/${name}`;
const html = await readFile(path, 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)];
if (scripts.length !== 1 || /\bsrc\s*=/.test(scripts[0][1])) throw Error('JavaScript must be inline');
const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
if (/<link\b[^>]*(?:stylesheet|modulepreload)/i.test(markup)) throw Error('External CSS or module dependency');
const urls = [...markup.matchAll(/url\(([^)]+)\)/g)].map(x => x[1].replace(/^["']|["']$/g, ''));
const external = urls.filter(url => !url.startsWith('data:') && !url.startsWith('#'));
if (external.length) throw Error(`Non-inline CSS resources: ${external}`);
const fonts = urls.filter(url => /^data:font\/woff2;base64,/.test(url));
if (fonts.length < 20) throw Error(`Missing font payloads: ${fonts.length}`);
if (/<(?:img|iframe|audio|video)\b[^>]*\bsrc\s*=\s*["'](?!data:)/i.test(markup)) throw Error('External media');
const report = { file: path, bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex'), inlineScripts: scripts.length, embeddedFontFaces: fonts.length, externalCssResources: external, generatedAt: new Date().toISOString() };
reports.push(report);
}
if (reports[0].sha256 !== reports[2].sha256) throw Error('Legacy Chinese alias differs');
await mkdir('docs', { recursive: true });
await writeFile('docs/build-verification.json', JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
