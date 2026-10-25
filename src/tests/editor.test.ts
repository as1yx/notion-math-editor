import { describe, it, expect, vi, afterEach } from 'vitest';
import { exportLatex, stripDelimiters, validateInput } from '../editor/latex';
import { prepareInsertion } from '../editor/insertion';
import { symbols } from '../data/symbols';
import { copyLatex } from '../utils/clipboard';
describe('LaTeX import and export', () => {
  it.each(['$x^2$', '$$x^2$$', String.raw`\(x^2\)`, String.raw`\[x^2\]`])('strips %s', value => expect(stripDelimiters(value)).toBe('x^2'));
  it.each(['', '   ', String.raw`\frac{x}{`, String.raw`\notARealCommand{x}`, String.raw`\href{javascript:alert(1)}{x}`, String.raw`\htmlClass{a}{x}`, String.raw`\def\a{\a}\a`, 'x'.repeat(10001)])('rejects invalid or unsafe input %s', value => expect(validateInput(value).error).toBeTruthy());
  it('accepts ordinary math', () => expect(validateInput(String.raw`\int_0^1 x^2\,dx`).error).toBeUndefined());
  it('exports missing inputs visibly', () => expect(exportLatex(String.raw`\frac{\placeholder{}}{x}`)).toEqual({ latex: String.raw`\frac{\square}{x}`, incomplete: true }));
  it('normalizes MathLive double primes for KaTeX', () => expect(exportLatex(String.raw`f^{\doubleprime}(x)`).latex).toBe(String.raw`f^{\prime\prime}(x)`));
  it('wraps selection in numerator', () => expect(prepareInsertion(symbols[0], 'x+1')).toBe(String.raw`\frac{x+1}{\placeholder{}}`));
  it('uses first placeholder for empty numerator', () => expect(prepareInsertion(symbols[0], '')).toBe(String.raw`\frac{\placeholder{}}{\placeholder{}}`));
  it('attaches square at caret and groups selection', () => {
    const square = symbols.find(s => s.id === 'square')!;
    expect(prepareInsertion(square, '')).toBe('^{2}');
    expect(prepareInsertion(square, 'x+1')).toBe('{x+1}^{2}');
  });
});
describe('Clipboard fallback', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('selects the output when clipboard access is denied', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const source = { value: 'x^2', focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn() };
    expect(await copyLatex('x^2', source as unknown as HTMLTextAreaElement)).toBe(false);
    expect(source.focus).toHaveBeenCalled(); expect(source.setSelectionRange).toHaveBeenCalledWith(0, 3);
  });
  it('works without a clipboard API', async () => {
    vi.stubGlobal('navigator', {});
    const source = { value: 'x', focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn() };
    expect(await copyLatex('x', source as unknown as HTMLTextAreaElement)).toBe(false);
  });
  it('reports success only after clipboard write resolves', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyLatex('x', {} as HTMLTextAreaElement)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('x');
  });
});
