import './styles.css';
import { t } from './i18n';
import { createMathfield } from './editor/mathfield';
import { manageSelection } from './editor/insertion';
import { setupDragDrop } from './editor/drag-drop';
import { setupSymbolPanel } from './components/symbol-panel';
import { setupToolbar } from './components/toolbar';
import { setupExportPanel } from './components/export-panel';
import { examples } from './data/templates';
const field = createMathfield(document.querySelector('#mathfield-host')!);
const selection = manageSelection(field);
let toastTimer: ReturnType<typeof setTimeout>;
function notify(message: string) {
  const toast = document.querySelector<HTMLElement>('#toast')!;
  toast.textContent = t(message); toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
}
let updateToolbar = () => {};
let updateExport = () => {};
function changed() { updateToolbar(); updateExport(); }
updateToolbar = setupToolbar(field, changed, notify, selection.restore);
updateExport = setupExportPanel(field, changed, notify);
const insertTemplate = (template: Parameters<typeof selection.insert>[0]) => { selection.insert(template); changed(); };
const bindDrag = setupDragDrop(field, insertTemplate, changed, notify);
setupSymbolPanel(insertTemplate, bindDrag);
field.addEventListener('input', changed);
field.addEventListener('undo-state-change', () => queueMicrotask(changed));
document.querySelector('#next-slot')!.addEventListener('pointerdown', e => e.preventDefault());
document.querySelector('#next-slot')!.addEventListener('click', () => {
  field.focus(); selection.restore(); field.executeCommand('moveToNextPlaceholder');
});
document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(button => {
  button.addEventListener('pointerdown', e => e.preventDefault());
  button.addEventListener('click', () => {
    field.focus(); selection.restore();
    field.insert(examples[button.dataset.example!], { selectionMode: 'after', focus: true });
    changed(); notify('示例已插入光标位置，可继续修改。');
  });
});
changed();
