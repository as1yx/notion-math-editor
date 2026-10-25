import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { renameSync, readFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { english } from './src/i18n/english.ts';

export default defineConfig(({ mode }) => {
  const poc = mode === 'feasibility';
  const language = mode === 'en' ? 'en' : 'zh-CN';
  const outDir = poc ? 'dist-stage0' : 'dist';
  return {
    base: './',
    define: { __APP_LANGUAGE__: JSON.stringify(language) },
    plugins: [viteSingleFile(), {
      name: 'deliverable-name',
      transformIndexHtml(html) {
        if (language === 'en') {
          html = html.replace('lang="zh-CN"', 'lang="en"');
          for (const [zh, en] of Object.entries(english).sort((a, b) => b[0].length - a[0].length)) html = html.replaceAll(zh, en);
        }
        return html.replace('<html', `<!--\n${readFileSync('THIRD-PARTY-NOTICES.txt', 'utf8')}\n-->\n<html`);
      },
      closeBundle() {
        if (!poc) {
          const target = resolve(outDir, `notion-math-editor.${language}.html`);
          renameSync(resolve(outDir, 'index.html'), target);
          if (language === 'zh-CN') copyFileSync(target, resolve(outDir, 'notion-math-editor.html'));
        }
      },
    }],
    build: { outDir, emptyOutDir: language !== 'en', assetsInlineLimit: Infinity, cssCodeSplit: false, modulePreload: false,
      rollupOptions: { input: resolve(poc ? 'stage0.html' : 'index.html') } },
    test: { include: ['src/tests/**/*.test.ts'] },
  };
});
