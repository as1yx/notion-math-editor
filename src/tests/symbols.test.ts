import { describe, it, expect } from 'vitest';
import { renderToString } from 'katex';
import { symbols, categories, buildingBlocks } from '../data/symbols';
import { templates } from '../data/templates';
import { prepareInsertion } from '../editor/insertion';
import { exportLatex } from '../editor/latex';
const catalogue = [...symbols, ...templates, ...buildingBlocks];
describe('Symbol catalogue', () => {
  it('has six populated categories and unique identifiers', () => {
    expect(categories).toHaveLength(6);
    expect(new Set(catalogue.map(x => x.id)).size).toBe(catalogue.length);
    for (const category of categories) expect(catalogue.filter(x => x.category === category.id).length).toBeGreaterThan(0);
  });
  it.each(catalogue)('$id preview and insertion use KaTeX compatible syntax', template => {
    expect(() => renderToString(template.preview, { throwOnError: true, trust: false })).not.toThrow();
    const inserted = prepareInsertion(template, 'x');
    expect(() => renderToString(exportLatex(inserted).latex, { throwOnError: true, trust: false })).not.toThrow();
  });
});
