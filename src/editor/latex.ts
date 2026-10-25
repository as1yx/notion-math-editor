import { renderToString } from 'katex';
import { t } from '../i18n';
export const MAX_LATEX_LENGTH = 10000;
export function stripDelimiters(input: string): string {
  let value = input.trim();
  for (const [a, b] of [['$$', '$$'], ['\\[', '\\]'], ['\\(', '\\)'], ['$', '$']]) {
    if (value.startsWith(a) && value.endsWith(b) && value.length >= a.length + b.length) {
      value = value.slice(a.length, -b.length).trim();
      break;
    }
  }
  return value;
}
export function validateInput(input: string): { value: string; error?: string } {
  const value = stripDelimiters(input);
  if (!value) return { value, error: t('请输入 LaTeX 公式。') };
  if (value.length > MAX_LATEX_LENGTH) return { value, error: t('公式过长，请控制在 10000 个字符以内。') };
  if (/\\(?:html\w*|href|url|includegraphics|def|gdef|newcommand|renewcommand|require|class|style|cssId|placeholder|error|unicode)\b/i.test(value)) {
    return { value, error: t('包含不支持的命令。请使用常用数学 LaTeX，不要包含链接、HTML 或自定义宏。') };
  }
  try {
    // Validation only: never attach generated markup from user input to the DOM.
    renderToString(value, { throwOnError: true, trust: false, strict: 'error', maxExpand: 1000 });
    return { value };
  } catch {
    return { value, error: t('LaTeX 格式有误或命令不兼容，请检查括号、上下标和命令。') };
  }
}
export function exportLatex(value: string): { latex: string; incomplete: boolean } {
  const incomplete = /\\placeholder\b/.test(value);
  // A visible square is valid KaTeX and keeps missing inputs apparent on export.
  return { latex: value.replace(/\\placeholder(?:\[[^\]]*\])?\{[^{}]*\}/g, '\\square').replace(/\\doubleprime\b/g, '\\prime\\prime'), incomplete };
}
