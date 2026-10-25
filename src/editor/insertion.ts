import type { MathfieldElement, Selection } from 'mathlive';
import type { MathTemplate } from '../data/symbols';

export function prepareInsertion(template: MathTemplate, selected: string): string {
  if (template.kind === 'power') {
    // A collapsed caret attaches the script to the atom immediately to its left.
    return template.latex.replace('#0', selected ? `{${selected}}` : '');
  }
  return template.latex.replaceAll('#0', selected || String.raw`\placeholder{}`);
}

export function manageSelection(field: MathfieldElement) {
  let saved: Selection = structuredClone(field.selection);
  const remember = () => { saved = structuredClone(field.selection); };
  field.addEventListener('selection-change', remember);
  field.addEventListener('input', remember);
  field.addEventListener('blur', remember);
  return {
    restore() { field.selection = saved; },
    insert(template: MathTemplate) {
      const target = structuredClone(field.selection);
      field.focus();
      field.selection = target;
      let selected = field.getValue(field.selection, 'latex');
      if (template.kind === 'power' && field.lastOffset === 0) selected = String.raw`\placeholder{}`;
      field.insert(prepareInsertion(template, selected), {
        format: 'latex', insertionMode: 'replaceSelection',
        selectionMode: 'placeholder', focus: true,
      });
      remember();
    },
  };
}
