import type { MathfieldElement } from 'mathlive';
import { exportLatex, validateInput } from '../editor/latex';
import { copyLatex } from '../utils/clipboard';
import { t } from '../i18n';
export function setupExportPanel(field: MathfieldElement, changed: () => void, notify: (text: string) => void) {
  const output = document.querySelector<HTMLTextAreaElement>('#latex-output')!;
  const input = document.querySelector<HTMLTextAreaElement>('#latex-input')!;
  const panel = document.querySelector<HTMLElement>('#import-panel')!;
  const error = document.querySelector<HTMLElement>('#import-error')!;
  const validation = document.querySelector<HTMLElement>('#validation')!;
  const copyButtons = ['#copy-top', '#copy-output'].map(id => document.querySelector<HTMLButtonElement>(id)!);
  const showImport = () => { panel.hidden = false; input.value = output.value; error.textContent = ''; input.focus(); };
  document.querySelector('#open-import')!.addEventListener('click', showImport);
  document.querySelector('#close-import')!.addEventListener('click', () => { panel.hidden = true; document.querySelector<HTMLButtonElement>('#open-import')!.focus(); });
  const apply = () => {
    const checked = validateInput(input.value);
    if (checked.error) { error.textContent = checked.error; input.focus(); return; }
    field.insert(checked.value, { insertionMode: 'replaceAll', selectionMode: 'after', silenceNotifications: false });
    field.position = -1;
    panel.hidden = true;
    // Give MathLive a stable visible focus anchor: a hidden apply button loses
    // native focus during layout and cancels MathLive's delayed focus transfer.
    document.querySelector<HTMLButtonElement>('#open-import')!.focus();
    field.focus();
    changed(); notify('LaTeX 已导入。');
  };
  document.querySelector('#apply-import')!.addEventListener('click', apply);
  input.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') apply(); if (e.key === 'Escape') { panel.hidden = true; field.focus(); } });
  copyButtons.forEach(button => button.addEventListener('click', async () => {
    const success = await copyLatex(output.value, output);
    notify(success ? '已复制 LaTeX，粘贴到 Notion 公式块即可。' : '自动复制不可用，已选中源码。请按 Ctrl+C（Mac：⌘C）复制。');
  }));
  return () => {
    const { latex, incomplete } = exportLatex(field.getValue('latex'));
    output.value = latex;
    const invalid = latex ? validateInput(latex).error : undefined;
    copyButtons.forEach(button => { button.disabled = !latex || !!invalid; });
    validation.classList.toggle('warning', incomplete || !!invalid);
    validation.textContent = t(!latex ? '公式为空。选择一个符号或模板开始。' : invalid ? '当前公式包含不兼容的内容，请修改后再复制。' : incomplete ? '还有空位待填写；导出时用 □ 标记，建议填写后再复制。' : '可复制到 Notion · 已通过常用 KaTeX 语法检查');
    document.querySelector('#editor-state')!.textContent = t(!latex ? '等待输入' : incomplete ? '有空位待填写' : '正在编辑');
  };
}
