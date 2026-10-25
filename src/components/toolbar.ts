import type { MathfieldElement } from 'mathlive';
export function setupToolbar(field: MathfieldElement, changed: () => void, notify: (message: string) => void, restore: () => void) {
  const undo = document.querySelector<HTMLButtonElement>('#undo')!;
  const redo = document.querySelector<HTMLButtonElement>('#redo')!;
  const clear = document.querySelector<HTMLButtonElement>('#clear')!;
  for (const [button, command] of [[undo, 'undo'], [redo, 'redo']] as const) {
    button.addEventListener('pointerdown', e => e.preventDefault());
    button.addEventListener('click', () => { field.focus(); restore(); field.executeCommand(command); changed(); });
  }
  clear.addEventListener('pointerdown', e => e.preventDefault());
  clear.addEventListener('click', () => { field.setValue(''); field.focus(); changed(); notify('已清空，可通过撤销恢复。'); });
  return () => { undo.disabled = !field.canUndo(); redo.disabled = !field.canRedo(); clear.disabled = !field.getValue(); };
}
