import { it, expect } from 'vitest';
import { english } from '../i18n/english';
import { categories, symbols, buildingBlocks } from '../data/symbols';
import { templates } from '../data/templates';
it('translates all symbol labels and category descriptions', () => {
  for (const message of [...symbols, ...buildingBlocks, ...templates].map(s => s.label).concat(categories.flatMap(c => [c.label, c.description]))) {
    if (/\p{Script=Han}/u.test(message)) expect(english[message], message).toBeTruthy();
  }
});
it('does not introduce untranslated Chinese or broken substitutions', () => {
  for (const [zh, en] of Object.entries(english)) {
    expect(en).not.toMatch(/\p{Script=Han}/u);
    expect(en.match(/\{\w+\}/g) ?? []).toEqual(zh.match(/\{\w+\}/g) ?? []);
  }
});
