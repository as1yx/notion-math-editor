import { createMathfield } from './editor/mathfield';
const field = createMathfield(document.querySelector('#field')!);
const output = document.querySelector<HTMLTextAreaElement>('#latex')!;
for (const [id, latex] of [['integral', String.raw`\int_{\placeholder{}}^{\placeholder{}}\placeholder{}\,d\placeholder{}`], ['fraction', String.raw`\frac{\placeholder{}}{\placeholder{}}`]]) {
  const button = document.getElementById(id)!;
  button.addEventListener('pointerdown', (e) => e.preventDefault());
  button.addEventListener('click', () => field.insert(latex, { focus: true, selectionMode: 'placeholder' }));
}
document.querySelector('#export')!.addEventListener('click', () => { output.value = field.getValue('latex'); });
