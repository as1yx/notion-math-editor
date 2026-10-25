import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
let language = 'zh-CN';
type Point = { x: number; y: number };
const editor = '#mathfield-host math-field';
test.beforeEach(async ({ page }, info) => {
  language = info.project.name;
  await page.goto(pathToFileURL(resolve(`dist/notion-math-editor.${language}.html`)).href);
  await expect(page.locator(editor)).toBeVisible();
});
async function drag(page: Page, id: string, point: Point) {
  const source = page.locator(id === 'move-selection' ? '#move-selection' : `[data-symbol="${id}"]`);
  await source.scrollIntoViewIfNeeded();
  const bounds = (await source.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down(); await page.mouse.move(point.x, point.y, { steps: 15 });
  await page.mouse.up();
}
async function emptyPoint(page: Page) {
  const bounds = (await page.locator('#mathfield-host').boundingBox())!;
  return { x: bounds.x + 40, y: bounds.y + bounds.height / 2 };
}
async function atomPoint(page: Page, latex: string, index = 0): Promise<Point> {
  return page.locator(editor).evaluate((f: any, args) => {
    const found = [];
    for (let offset = 1; offset <= f.lastOffset; offset++) {
      const info = f.getElementInfo(offset);
      if (info?.bounds && info.latex === args.latex) found.push(info.bounds);
    }
    const b = found[args.index];
    if (!b) throw Error(`Atom not found: ${args.latex} ${args.index}`);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, { latex, index });
}
async function slotPoint(page: Page, index = 0) { return atomPoint(page, String.raw`\placeholder{}`, index); }
async function load(page: Page, latex: string) {
  await page.locator('#open-import').click(); await page.locator('#latex-input').fill(latex); await page.locator('#apply-import').click();
  await expect(page.locator('#import-panel')).toBeHidden(); await expect(page.locator(editor)).toBeFocused();
}
test('build a fraction entirely by dragging blocks into numerator and denominator', async ({ page }) => {
  await drag(page, 'fraction', await emptyPoint(page));
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{\square}{\square}`);
  await drag(page, 'block-x', await slotPoint(page, 0));
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{x}{\square}`);
  await drag(page, 'block-y', await slotPoint(page, 0));
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{x}{y}`);
  await expect(page.locator('.drag-ghost')).toHaveCount(0); await expect(page.locator('.drop-marker')).toBeHidden();
});
test('nested roots and superscripts use the hovered structure', async ({ page }) => {
  await drag(page, 'fraction', await emptyPoint(page));
  await drag(page, 'sqrt', await slotPoint(page, 0));
  await drag(page, 'block-x', await slotPoint(page, 0));
  await drag(page, 'square', await atomPoint(page, 'x'));
  await drag(page, 'block-one', await slotPoint(page, 0));
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{\sqrt{x^2}}{1}`);
});
test('a square dropped into an empty editor leaves an editable base', async ({ page }) => {
  await drag(page, 'square', await emptyPoint(page));
  await expect(page.locator('#latex-output')).toHaveValue(/^\{?\\square\}?\^\{?2\}?$/);
  await drag(page, 'block-x', await slotPoint(page));
  await expect(page.locator('#latex-output')).toHaveValue(/^\{?x\}?\^\{?2\}?$/);
});
test('matrix cells each accept a dragged block', async ({ page }) => {
  await page.locator('#tab-algebra').click(); await drag(page, 'matrix2', await emptyPoint(page));
  for (const id of ['block-one', 'block-two', 'block-x', 'block-y']) await drag(page, id, await slotPoint(page));
  expect((await page.locator('#latex-output').inputValue()).replace(/\s/g, '')).toBe(String.raw`\begin{pmatrix}1&2\\x&y\end{pmatrix}`);
});
test('dragging a structure over a selection wraps that selection', async ({ page }) => {
  await load(page, 'x+1'); await page.locator(editor).evaluate((f: any) => f.executeCommand('selectAll'));
  await drag(page, 'fraction', await atomPoint(page, '+'));
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{x+1}{\square}`);
});
test('integral bounds and body accept dragged blocks', async ({ page }) => {
  await page.locator('#tab-integrals').click();
  await drag(page, 'definite', await emptyPoint(page));
  // Model order visits the integrand and bounds according to MathLive's tree;
  // identify placeholders by screen position rather than relying on order.
  const slots = await page.locator(editor).evaluate((f: any) => {
    const result = [];
    for (let i = 1; i <= f.lastOffset; i++) { const a = f.getElementInfo(i); if (a?.latex === '\\placeholder{}') result.push({ x: a.bounds.x + a.bounds.width / 2, y: a.bounds.y + a.bounds.height / 2 }); }
    return result;
  });
  const left = [...slots].sort((a, b) => a.x - b.x).slice(0, 2);
  const lower = [...left].sort((a, b) => b.y - a.y)[0];
  await drag(page, 'block-zero', lower);
  const remaining = await page.locator(editor).evaluate((f: any) => {
    const result = []; for (let i = 1; i <= f.lastOffset; i++) { const a = f.getElementInfo(i); if (a?.latex === '\\placeholder{}') result.push({ x: a.bounds.x + a.bounds.width / 2, y: a.bounds.y + a.bounds.height / 2 }); } return result.sort((a, b) => a.y - b.y);
  });
  await drag(page, 'block-one', remaining[0]);
  await drag(page, 'block-x', await slotPoint(page, 0));
  await drag(page, 'block-x', await slotPoint(page, 0));
  await expect(page.locator('#latex-output')).toHaveValue(/\\int_0\^1.*x.*dx/);
});
test('dropping outside the editor and Escape leave the formula intact', async ({ page }) => {
  await load(page, 'x+1');
  await drag(page, 'fraction', { x: 15, y: 15 }); await expect(page.locator('#latex-output')).toHaveValue('x+1');
  const b = (await page.locator('[data-symbol="sqrt"]').boundingBox())!;
  const p = await emptyPoint(page);
  await page.mouse.move(b.x + 10, b.y + 10); await page.mouse.down(); await page.mouse.move(p.x, p.y, { steps: 10 });
  await expect(page.locator('.drag-ghost')).toBeVisible();
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(page.locator('#latex-output')).toHaveValue('x+1');
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await page.locator('[data-symbol="times"]').click(); await expect(page.locator('#latex-output')).toHaveValue(/\\times/);
});
test('dragging a selected expression moves it once, with one-step undo and redo', async ({ page }) => {
  await load(page, 'x+y');
  await page.locator(editor).evaluate((f: any) => { f.selection = { ranges: [[0, 1]] }; });
  await expect(page.locator('#move-selection')).toBeEnabled();
  const end = await atomPoint(page, 'y'); end.x += 25;
  await drag(page, 'move-selection', end);
  await expect(page.locator('#latex-output')).toHaveValue('+yx');
  await page.locator('#undo').click(); await expect(page.locator('#latex-output')).toHaveValue('x+y');
  await page.locator('#redo').click(); await expect(page.locator('#latex-output')).toHaveValue('+yx');
});
test('selected complete structures can be moved into a denominator', async ({ page }) => {
  await load(page, String.raw`\sqrt{x}+\frac{1}{y}`);
  const structure = await page.locator(editor).evaluate((f: any) => {
    for (let i = 1; i <= f.lastOffset; i++) if (f.getElementInfo(i)?.latex === '\\sqrt{x}') return i;
    throw Error('root not found');
  });
  await page.locator(editor).evaluate((f: any, end) => { f.selection = { ranges: [[0, end]] }; }, structure);
  const target = await atomPoint(page, 'y'); target.x += 8;
  await drag(page, 'move-selection', target);
  await expect(page.locator('#latex-output')).toHaveValue(/\\frac\{1\}\{y\\sqrt\{x\}\}/);
  await page.locator('#undo').click(); await expect(page.locator('#latex-output')).toHaveValue(String.raw`\sqrt{x}+\frac{1}{y}`);
});
test('moving into a placeholder removes the original and is a single undo', async ({ page }) => {
  await load(page, 'x'); await page.locator('[data-symbol="fraction"]').click();
  await page.locator(editor).evaluate((f: any) => { f.selection = { ranges: [[0, 1]] }; });
  await drag(page, 'move-selection', await slotPoint(page));
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{x}{\square}`);
  await page.locator('#undo').click(); await expect(page.locator('#latex-output')).toHaveValue(String.raw`x\frac{\square}{\square}`);
});
test('a selected expression can move earlier, and dropping on itself is a no-op', async ({ page }) => {
  await load(page, 'x+y'); await page.locator(editor).evaluate((f: any) => { f.selection = { ranges: [[2, 3]] }; });
  const first = await atomPoint(page, 'x'); first.x -= 16;
  await drag(page, 'move-selection', first); await expect(page.locator('#latex-output')).toHaveValue('yx+');
  await page.locator('#undo').click(); await expect(page.locator('#latex-output')).toHaveValue('x+y');
  await page.locator('#mathfield-host math-field').evaluate((f: any) => { f.selection = { ranges: [[0, 1]] }; });
  await drag(page, 'move-selection', await atomPoint(page, 'x'));
  await expect(page.locator('#latex-output')).toHaveValue('x+y');
});
for (const width of [400, 600, 800]) test(`drag into a nested slot at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1300 });
  await drag(page, 'fraction', await emptyPoint(page));
  await drag(page, 'sqrt', await slotPoint(page));
  await drag(page, 'block-x', await slotPoint(page));
  await drag(page, 'block-one', await slotPoint(page));
  await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{\sqrt{x}}{1}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/${language}/drag-${width}.png`, fullPage: true });
});
test('a click still inserts once after draggable controls are added', async ({ page }) => {
  await page.locator('[data-symbol="block-x"]').click();
  await page.locator('[data-symbol="square"]').click();
  await expect(page.locator('#latex-output')).toHaveValue('x^2');
});
test('drop feedback shows the exact placeholder before committing', async ({ page }) => {
  await page.locator('[data-symbol="fraction"]').click();
  const slot = await slotPoint(page, 0);
  const b = (await page.locator('[data-symbol="block-x"]').boundingBox())!;
  await page.mouse.move(b.x + 8, b.y + 8); await page.mouse.down(); await page.mouse.move(slot.x, slot.y, { steps: 12 });
  await expect(page.locator('.drop-marker')).toHaveAttribute('data-kind', 'slot');
  await expect(page.locator('#drag-status')).toHaveText(/放入此空位|in this slot/);
  await page.screenshot({ path: `docs/${language}/preview-dragging.png`, fullPage: true });
  await page.mouse.up(); await expect(page.locator('#latex-output')).toHaveValue(String.raw`\frac{x}{\square}`);
});
test('dragging works in an opaque iframe with no external connections', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const html = await readFile(`dist/notion-math-editor.${language}.html`, 'utf8');
  await page.goto('about:blank');
  await page.evaluate(html => {
    const frame = document.createElement('iframe'); frame.sandbox.add('allow-scripts'); frame.style.cssText = 'width:760px;height:1000px;border:0';
    frame.srcdoc = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'">`);
    document.body.append(frame);
  }, html);
  const root = page.frameLocator('iframe');
  const source = (await root.locator('[data-symbol="fraction"]').boundingBox())!;
  const target = (await root.locator('#mathfield-host').boundingBox())!;
  await page.mouse.move(source.x + 20, source.y + 20); await page.mouse.down();
  await page.mouse.move(target.x + 40, target.y + target.height / 2, { steps: 15 }); await page.mouse.up();
  await expect(root.locator('#latex-output')).toHaveValue(String.raw`\frac{\square}{\square}`);
  expect(errors).toEqual([]);
});
