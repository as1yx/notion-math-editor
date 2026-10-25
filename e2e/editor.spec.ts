import { test, expect, type Page } from '@playwright/test';
import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { translated } from './language';
let language = 'zh-CN';
let url: string;
const text = (message: string) => translated(message, language);
const cases = [
  ['平方', 'x^2'], ['平方根', String.raw`\sqrt{x+1}`], ['分式', String.raw`\frac{x+1}{x-1}`],
  ['极限', String.raw`\lim_{x\to0}\frac{\sin x}{x}`], ['定积分', String.raw`\int_0^1x^2\,dx`],
  ['高斯积分', String.raw`\int e^{-x^2}\,dx`], ['级数', String.raw`\sum_{n=1}^{\infty}\frac{1}{n^2}`],
  ['偏导', String.raw`\frac{\partial f}{\partial x}`], ['矩阵', String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`],
  ['分段函数', String.raw`\begin{cases}x^2&x>0\\0&x\le0\end{cases}`],
];
test.beforeAll(async ({}, info) => {
  language = info.project.name;
  const isolated = resolve(`work/final-isolated/${language}`);
  await mkdir(isolated, { recursive: true });
  await copyFile(`dist/notion-math-editor.${language}.html`, resolve(isolated, 'notion-math-editor.html'));
  url = pathToFileURL(resolve(isolated, 'notion-math-editor.html')).href;
});
test.beforeEach(async ({ page }) => { await page.goto(url); await expect(page.locator('math-field')).toBeVisible(); });
async function importLatex(page: Page, latex: string) {
  await page.locator('#open-import').click(); await page.locator('#latex-input').fill(latex); await page.locator('#apply-import').click();
  await expect(page.locator('#import-panel')).toBeHidden();
}
test('empty formula and meaningful disabled states', async ({ page }) => {
  await expect(page.locator('#copy-top')).toBeDisabled(); await expect(page.locator('#clear')).toBeDisabled(); await expect(page.locator('#undo')).toBeDisabled();
  await expect(page.locator('#validation')).toContainText(text('公式为空'));
});
for (const [name, latex] of cases) test(`acceptance expression: ${name}`, async ({ page }) => {
  await importLatex(page, latex); await expect(page.locator('#latex-output')).not.toHaveValue('');
  await expect(page.locator('#validation')).toContainText(text('已通过')); await expect(page.locator('#copy-top')).toBeEnabled();
  const errors = await page.locator('math-field').evaluate((f: any) => f.errors);
  expect(errors).toEqual([]);
});
test('keyboard x then square attaches to x and keyboard undo works', async ({ page }) => {
  await page.locator('math-field').click(); await expect(page.locator('math-field')).toBeFocused(); await page.keyboard.type('x'); await page.locator('[data-symbol="square"]').click();
  await expect(page.locator('#latex-output')).toHaveValue('x^2');
  await page.keyboard.press('Control+z'); await expect(page.locator('#latex-output')).toHaveValue('x');
});
test('selected expression becomes fraction numerator, next slot is editable', async ({ page }) => {
  await importLatex(page, 'x+1');
  await page.locator('math-field').evaluate((f: any) => f.executeCommand('selectAll'));
  await page.locator('[data-symbol="fraction"]').click();
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{x+1}{\square}`);
  await page.keyboard.type('2'); await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{x+1}{2}`);
});
test('fraction focuses numerator, mouse navigation fills denominator', async ({ page }) => {
  await page.locator('[data-symbol="fraction"]').click(); await page.keyboard.type('x');
  await page.locator('#next-slot').click(); await page.keyboard.type('y');
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{x}{y}`);
});
test('click insertion retains a middle caret and selection replacement', async ({ page }) => {
  await importLatex(page, 'xy');
  await page.locator('math-field').evaluate((f: any) => { f.position = 1; });
  await page.locator('[data-symbol="times"]').click(); await expect(page.locator('#latex-output')).toHaveValue(String.raw`x\times y`);
  await page.locator('math-field').evaluate((f: any) => { f.selection = { ranges: [[0, 1]], direction: 'forward' }; });
  await page.locator('[data-symbol="infinity"]').click(); await expect(page.locator('#latex-output')).toHaveValue(String.raw`\infty\times y`);
});
test('native mouse drag selection is preserved by the root button', async ({ page }) => {
  await importLatex(page, 'x+1');
  await expect(page.locator('math-field')).toBeFocused();
  const points = await page.locator('math-field').evaluate((f: any) => {
    const a = f.getElementInfo(1).bounds, b = f.getElementInfo(3).bounds;
    return { x1: a.left - 2, x2: b.right + 2, y: a.top + a.height / 2 };
  });
  await page.mouse.move(points.x1, points.y); await page.mouse.down();
  await page.mouse.move(points.x2, points.y, { steps: 12 }); await page.mouse.up();
  expect(await page.locator('math-field').evaluate((f: any) => f.getValue(f.selection, 'latex'))).toBe('x+1');
  await page.locator('[data-symbol="sqrt"]').click();
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\sqrt{x+1}`);
});
test('undo redo and clear restore complete formulas', async ({ page }) => {
  await importLatex(page, 'x+1'); await page.locator('#clear').click(); await expect(page.locator('#latex-output')).toHaveValue('');
  await page.locator('#undo').click(); await expect(page.locator('#latex-output')).toHaveValue('x+1');
  await page.locator('#redo').click(); await expect(page.locator('#latex-output')).toHaveValue('');
});
test('first import can be undone to empty and redone', async ({ page }) => {
  await importLatex(page, 'x^2'); await page.locator('#undo').click(); await expect(page.locator('#latex-output')).toHaveValue('');
  await page.locator('#redo').click(); await expect(page.locator('#latex-output')).toHaveValue('x^2');
});
test('definite integral placeholders support bounds, integrand and variable', async ({ page }) => {
  await page.locator('#tab-integrals').click(); await page.locator('[data-symbol="definite"]').click();
  await expect(page.locator('math-field')).toBeFocused(); await page.keyboard.type('0');
  await page.locator('#next-slot').click(); await expect(page.locator('math-field')).toBeFocused(); await page.keyboard.type('1');
  await page.locator('#next-slot').click(); await page.keyboard.type('x');
  await page.locator('#tab-common').click(); await page.locator('[data-symbol="square"]').click();
  await page.locator('#next-slot').click(); await page.keyboard.type('x');
  await expect(page.locator('#validation')).toContainText(text('已通过'));
  await expect(page.locator('#latex-output')).toHaveValue(/\\int_0\^1.*x\^2.*dx/);
});
test('invalid imports never replace the existing formula', async ({ page }) => {
  await importLatex(page, 'x'); await page.locator('#open-import').click();
  for (const invalid of ['', String.raw`\frac{`, String.raw`\unknown{x}`, String.raw`\href{javascript:alert(1)}{x}`]) {
    await page.locator('#latex-input').fill(invalid); await page.locator('#apply-import').click();
    await expect(page.locator('#import-error')).not.toBeEmpty(); await expect(page.locator('#latex-output')).toHaveValue('x');
  }
});
test('clipboard denied selects source and exposes manual fallback', async ({ page }) => {
  await importLatex(page, 'x^2');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }));
  await page.locator('#copy-top').click(); await expect(page.locator('#toast')).toContainText('Ctrl+C');
  await expect(page.locator('#latex-output')).toBeFocused();
  expect(await page.locator('#latex-output').evaluate((e: HTMLTextAreaElement) => e.value.slice(e.selectionStart, e.selectionEnd))).toBe('x^2');
});
test('clipboard success gives visible feedback', async ({ page }) => {
  await importLatex(page, 'x');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s: string) => { (window as any).copied = s; return Promise.resolve(); } } }));
  await page.locator('#copy-output').click(); await expect(page.locator('#toast')).toContainText(text('已复制'));
  expect(await page.evaluate(() => (window as any).copied)).toBe('x');
});
test('every math button inserts with no syntax errors', async ({ page }) => {
  for (const category of ['common', 'limits', 'derivatives', 'integrals', 'series', 'algebra']) {
    await page.locator(`#tab-${category}`).click();
    const ids = await page.locator('[data-symbol]').evaluateAll(elements => elements.map(e => (e as HTMLElement).dataset.symbol!));
    for (const id of ids) {
      await page.locator('math-field').evaluate((f: any) => { f.setValue('x'); f.position = -1; });
      await page.locator(`[data-symbol="${id}"]`).click();
      expect(await page.locator('math-field').evaluate((f: any) => f.errors), id).toEqual([]);
      await expect(page.locator('#copy-top'), id).toBeEnabled();
    }
  }
});
test('all embedded font faces load without external requests', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.reload();
  const fonts = await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load())); return [...document.fonts].map(f => f.status); });
  expect(fonts.length).toBeGreaterThanOrEqual(20); expect(fonts.every(f => f === 'loaded')).toBe(true); expect(requests).toEqual([]);
});
for (const width of [400, 600, 800]) test(`responsive at ${width}px, long formulas scroll inside editor`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1100 });
  await importLatex(page, 'x+'.repeat(150) + '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#tab-algebra').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/${language}/preview-${width}.png`, fullPage: true });
});
test('dark theme remains legible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await importLatex(page, cases[4][1]);
  await page.screenshot({ path: `docs/${language}/preview-dark.png`, fullPage: true });
  expect(await page.locator('.app').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(32, 33, 31)');
});
test('opaque iframe under restrictive CSP runs offline, with no parent keyboard messages', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  const html = await readFile(`dist/notion-math-editor.${language}.html`, 'utf8');
  await page.goto('about:blank');
  await page.evaluate(html => {
    (window as any).keyboardMessages = [];
    window.addEventListener('message', e => { if (e.data?.type === 'mathlive#virtual-keyboard-message') (window as any).keyboardMessages.push(e.data); });
    const iframe = document.createElement('iframe'); iframe.sandbox.add('allow-scripts'); iframe.style.cssText = 'width:600px;height:1000px;border:0';
    iframe.srcdoc = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'">`);
    document.body.append(iframe);
  }, html);
  const frame = page.frameLocator('iframe'); await frame.locator('[data-symbol="fraction"]').click();
  await expect(frame.locator('math-field')).toBeFocused();
  await page.keyboard.type('x'); await frame.locator('#next-slot').click(); await page.keyboard.type('y');
  await expect(frame.locator('#latex-output')).toHaveValue(String.raw`\frac{x}{y}`);
  await frame.locator('#copy-top').click(); await expect(frame.locator('#toast')).toContainText('Ctrl+C');
  await frame.locator('#tab-integrals').click(); await frame.locator('[data-symbol="definite"]').click();
  await expect(frame.locator('#latex-output')).toHaveValue(/\\int/);
  expect(errors).toEqual([]); expect(requests).toEqual([]);
  expect(await page.evaluate(() => (window as any).keyboardMessages)).toEqual([]);
  const keyboard = await frame.locator('math-field').evaluate(() => window.mathVirtualKeyboard.visible);
  expect(keyboard).toBe(false);
});
