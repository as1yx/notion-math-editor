import { convertLatexToMarkup } from 'mathlive';
import { buildingBlocks, categories, symbols, type MathTemplate } from '../data/symbols';
import { templates } from '../data/templates';
import { t } from '../i18n';
export function setupSymbolPanel(insert: (template: MathTemplate) => void, bindDrag: (button: HTMLButtonElement, template: MathTemplate) => void) {
  const tabs = document.querySelector('#categories')!;
  const panel = document.querySelector('#symbols')!;
  const blockPanel = document.querySelector('#building-blocks')!;
  buildingBlocks.forEach(template => blockPanel.append(makeButton(template, true)));
  function makeButton(template: MathTemplate, compact = false) {
    const button = document.createElement('button');
    button.className = compact ? 'block-chip' : 'symbol';
    button.dataset.symbol = template.id;
    button.title = `${t(template.label)} · ${t('拖到公式或空位，也可点击插入')}`;
    button.setAttribute('aria-label', t(template.label));
    const math = document.createElement('span');
    math.className = 'symbol-math';
    if (template.preview.length > 16) math.classList.add('compact');
    math.setAttribute('aria-hidden', 'true');
    // All previews here are fixed developer-authored catalogue data.
    math.innerHTML = convertLatexToMarkup(template.preview);
    button.append(math);
    if (!compact) {
      const label = document.createElement('span');
      label.className = 'symbol-label'; label.textContent = t(template.label);
      button.append(label);
    }
    bindDrag(button, template);
    button.addEventListener('click', () => insert(template));
    return button;
  }
  const buttons = categories.map((category, index) => {
    const button = document.createElement('button');
    button.id = `tab-${category.id}`;
    button.textContent = t(category.label);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'symbols');
    button.addEventListener('click', () => activate(index));
    button.addEventListener('keydown', e => {
      let next = index;
      if (e.key === 'ArrowRight') next = (index + 1) % categories.length;
      else if (e.key === 'ArrowLeft') next = (index + categories.length - 1) % categories.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = categories.length - 1;
      else return;
      e.preventDefault(); activate(next); buttons[next].focus();
    });
    tabs.append(button);
    return button;
  });
  function activate(index: number) {
    buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
    const category = categories[index];
    document.querySelector('#category-description')!.textContent = t(category.description);
    panel.setAttribute('aria-labelledby', buttons[index].id);
    panel.replaceChildren();
    [...symbols, ...templates].filter(s => s.category === category.id).forEach(template => {
      panel.append(makeButton(template));
    });
  }
  activate(0);
}
