import type { MathfieldElement, Selection } from 'mathlive';
import type { MathTemplate } from '../data/symbols';
import { createMathfield } from './mathfield';
import { t } from '../i18n';

type Rect = { x: number; y: number; width: number; height: number };
type Target = { selection: Selection; rect: Rect; kind: 'slot' | 'selection' | 'caret' };
const inside = (r: Rect, x: number, y: number, padding = 0) => x >= r.x - padding && x <= r.x + r.width + padding && y >= r.y - padding && y <= r.y + r.height + padding;
export function remapAfterRemoval(range: [number, number], source: [number, number], removed: number): [number, number] {
  return range.map(offset => offset > source[1] ? offset - removed : offset) as [number, number];
}

export function setupDragDrop(field: MathfieldElement, insert: (template: MathTemplate) => void, changed: () => void, notify: (message: string) => void) {
  const host = document.querySelector<HTMLElement>('#mathfield-host')!;
  const surface = document.querySelector<HTMLElement>('.editor-surface')!;
  const status = document.querySelector<HTMLElement>('#drag-status')!;
  const moveButton = document.querySelector<HTMLButtonElement>('#move-selection')!;
  const marker = document.createElement('div');
  marker.className = 'drop-marker'; marker.hidden = true; marker.setAttribute('aria-hidden', 'true');
  document.body.append(marker);
  const scratchHost = document.createElement('div');
  scratchHost.hidden = true; scratchHost.setAttribute('aria-hidden', 'true');
  document.body.append(scratchHost);
  let scratch: MathfieldElement | undefined;
  let dragging = false;
  let cancelPending: (() => void) | undefined;
  const updateMove = () => {
    if (dragging) return;
    const ranges = field.selection.ranges;
    const selected = field.getValue(field.selection, 'latex');
    moveButton.disabled = ranges.length !== 1 || ranges[0][0] === ranges[0][1] || !selected || /^\\placeholder(?:\[[^\]]*\])?\{\}$/.test(selected);
  };
  field.addEventListener('selection-change', updateMove);
  field.addEventListener('input', updateMove);

  function targetAt(x: number, y: number, original: Selection, moving: boolean, template?: MathTemplate): Target | undefined {
    if (!inside(host.getBoundingClientRect(), x, y)) return;
    const atoms: { offset: number; latex: string; bounds: DOMRect; depth: number }[] = [];
    for (let offset = 1; offset <= field.lastOffset; offset++) {
      const info = field.getElementInfo(offset);
      if (info?.bounds && info.bounds.width > 0 && info.bounds.height > 0) atoms.push({ offset, bounds: info.bounds, latex: info.latex ?? '', depth: info.depth ?? 0 });
    }
    // Empty cells and nested placeholders are actual model ranges, not string
    // offsets. Replacing the placeholder keeps fractions/matrices structured.
    const slot = atoms.filter(a => /^\\placeholder(?:\[|\{)/.test(a.latex) && inside(a.bounds, x, y, 4)).sort((a, b) => b.depth - a.depth)[0];
    if (slot) return { selection: { ranges: [[slot.offset - 1, slot.offset]] }, rect: slot.bounds, kind: 'slot' };
    const hit = atoms.filter(a => a.latex && inside(a.bounds, x, y, 4)).sort((a, b) => b.depth - a.depth || a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height)[0];
    if (!moving && hit && original.ranges.some(([a, b]) => hit.offset > a && hit.offset <= b && a !== b)) {
      return { selection: original, rect: hit.bounds, kind: 'selection' };
    }
    let offset = field.getOffsetFromPoint(x, y, { bias: 0 });
    if (offset < 0) offset = field.lastOffset;
    // MathLive's nearest-point lookup can return the first offset while a
    // selected structure is captured by an external drag handle. Resolve
    // visible glyphs from public element bounds, preserving branch depth.
    if (hit) {
      offset = hit.offset;
      if (x < hit.bounds.x + hit.bounds.width / 2) {
        offset--;
        while (offset > 0 && (field.getElementInfo(offset)?.depth ?? 0) > hit.depth) offset--;
      }
    } else if (atoms.length && x > Math.max(...atoms.map(a => a.bounds.right)) + 4) offset = field.lastOffset;
    // Dropping x² onto x should attach a superscript to that atom.
    if (template?.kind === 'power' && hit) offset = hit.offset;
    const bounds = field.getElementInfo(offset)?.bounds;
    const fallback = field.getBoundingClientRect();
    const rect = bounds ? { x: bounds.right, y: bounds.y, width: 2, height: bounds.height } : { x: fallback.left + 4, y: fallback.top + 10, width: 2, height: 32 };
    return { selection: { ranges: [[offset, offset]] }, rect, kind: 'caret' };
  }

  function moveSelection(source: Selection, target: Target): boolean {
    const range = source.ranges[0];
    const destination = target.selection.ranges[0];
    if (destination[0] <= range[1] && destination[1] >= range[0]) {
      notify('放置位置仍在原选区内，公式保持原样。'); return false;
    }
    scratch ??= createMathfield(scratchHost);
    const original = field.getValue('latex');
    const latex = field.getValue(source, 'latex');
    scratch.setValue(original);
    if (scratch.lastOffset !== field.lastOffset) { notify('该选区无法整体移动，请缩小选区后重试。'); return false; }
    const before = scratch.lastOffset;
    scratch.selection = source;
    scratch.executeCommand('deleteBackward');
    const mapped = remapAfterRemoval(destination, range, before - scratch.lastOffset);
    scratch.selection = { ranges: [mapped] };
    scratch.insert(latex, { format: 'latex', selectionMode: 'after' });
    const result = scratch.getValue('latex');
    if (scratch.errors.length) { notify('该位置无法接收所选结构，公式保持原样。'); return false; }
    // Calculate on a hidden MathLive model, then commit once so the whole move
    // is a single undoable operation. No intermediate deletion reaches the UI.
    field.insert(result, { format: 'latex', insertionMode: 'replaceAll', selectionMode: 'after', focus: true });
    field.selection = scratch.selection;
    return true;
  }

  function bind(button: HTMLButtonElement, template?: MathTemplate) {
    let suppressClick = false;
    button.addEventListener('click', e => { if (suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    button.addEventListener('dragstart', e => e.preventDefault());
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary || button.disabled) return;
      cancelPending?.();
      event.preventDefault();
      const original = structuredClone(field.selection);
      const label = t(template?.label ?? '选中部分');
      let started = false, cancelled = false;
      let ghost: HTMLElement | undefined;
      let target: Target | undefined;
      const pointerId = event.pointerId;
      button.setPointerCapture(pointerId);
      function hide() {
        ghost?.remove(); marker.hidden = true; surface.classList.remove('drag-over'); document.body.classList.remove('is-dragging');
      }
      function cleanup() {
        hide(); dragging = false;
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onUp, true);
        document.removeEventListener('pointercancel', onCancel, true);
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('blur', onCancel);
        if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
        cancelPending = undefined; updateMove();
      }
      function suppress() { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
      function onMove(e: PointerEvent) {
        if (e.pointerId !== pointerId || cancelled) return;
        if (!started && Math.hypot(e.clientX - event.clientX, e.clientY - event.clientY) < 6) return;
        e.preventDefault(); e.stopPropagation();
        if (!started) {
          started = true; dragging = true;
          ghost = document.createElement('div'); ghost.className = 'drag-ghost'; ghost.setAttribute('aria-hidden', 'true');
          const preview = button.querySelector('.symbol-math');
          if (preview) ghost.append(preview.cloneNode(true));
          const text = document.createElement('span'); text.textContent = `⠿ ${label}`; ghost.append(text);
          document.body.append(ghost); document.body.classList.add('is-dragging');
        }
        ghost!.style.left = `${Math.min(e.clientX + 16, window.innerWidth - 150)}px`;
        ghost!.style.top = `${Math.min(e.clientY + 16, window.innerHeight - 90)}px`;
        target = targetAt(e.clientX, e.clientY, original, !template, template);
        surface.classList.toggle('drag-over', !!target);
        marker.hidden = !target;
        if (target) {
          marker.dataset.kind = target.kind;
          Object.assign(marker.style, { left: `${target.rect.x - 3}px`, top: `${target.rect.y - 3}px`, width: `${target.rect.width + 6}px`, height: `${target.rect.height + 6}px` });
          status.textContent = target.kind === 'slot' ? t('松开，把「{label}」放入此空位。', { label }) : target.kind === 'selection' ? t('松开，用「{label}」包裹或替换选中部分。', { label }) : t('松开，在绿色标记处{action}「{label}」。', { label, action: t(template ? '插入' : '移动') });
        } else status.textContent = t('拖到公式区内再松开；按 Esc 可取消。');
      }
      function onUp(e: PointerEvent) {
        if (e.pointerId !== pointerId) return;
        if (started || cancelled) {
          e.preventDefault(); e.stopPropagation(); suppress();
          if (started && !cancelled) {
            target = targetAt(e.clientX, e.clientY, original, !template, template);
            if (!target) status.textContent = t('未放入公式区，公式保持原样。');
            else if (template) {
              field.selection = target.selection; insert(template);
              status.textContent = t('已放入「{label}」。可继续把积木拖入空位。', { label });
            } else {
              const moved = moveSelection(original, target);
              status.textContent = t(moved ? '已移动选中部分，可通过撤销恢复。' : '此次移动未修改公式。');
              changed();
            }
          }
        }
        cleanup();
      }
      function onCancel() { if (started) { suppress(); status.textContent = t('已取消拖放，公式保持原样。'); } cleanup(); }
      function onKey(e: KeyboardEvent) {
        if (e.key !== 'Escape') return;
        e.preventDefault(); e.stopPropagation(); cancelled = true; hide();
        status.textContent = t('已取消拖放，公式保持原样。');
      }
      cancelPending = onCancel;
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
      document.addEventListener('pointercancel', onCancel, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('blur', onCancel);
    });
  }
  bind(moveButton);
  moveButton.addEventListener('click', () => notify('按住此按钮，拖到公式内的绿色标记处再松开。'));
  updateMove();
  return (button: HTMLButtonElement, template: MathTemplate) => bind(button, template);
}
