import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 30000,
  reporter: [['list'], ['json', { outputFile: 'docs/e2e-results.json' }]],
  projects: [{ name: 'zh-CN' }, { name: 'en' }],
  use: { ...(process.env.CI ? {} : { channel: 'msedge' }), headless: true, offline: true, viewport: { width: 800, height: 1000 }, trace: 'retain-on-failure' },
});
