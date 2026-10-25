import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
test('UI text, attributes and every category use the selected language', async ({ page }, info) => {
  const language = info.project.name;
  await page.goto(pathToFileURL(resolve(`dist/notion-math-editor.${language}.html`)).href);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  for (const category of ['common', 'limits', 'derivatives', 'integrals', 'series', 'algebra']) {
    await page.locator(`#tab-${category}`).click();
    const text = await page.locator('main').innerText();
    if (language === 'en') expect(text).not.toMatch(/\p{Script=Han}/u);
    else expect(text).toContain('基础积木');
  }
  await page.locator('#open-import').click();
  await page.locator('#latex-input').fill('\\badCommand'); await page.locator('#apply-import').click();
  const attributes = await page.locator('main [title],main [aria-label],main [placeholder]').evaluateAll(elements => elements.flatMap(e => ['title', 'aria-label', 'placeholder'].map(a => e.getAttribute(a) ?? '')).join('\n'));
  if (language === 'en') {
    expect(attributes).not.toMatch(/\p{Script=Han}/u);
    await expect(page.locator('#import-error')).toHaveText(/Invalid|Unsupported/);
    await expect(page.locator('#undo')).toHaveText(/Undo/);
  } else await expect(page.locator('#import-error')).toHaveText(/格式|命令/);
});
