import { english } from '../src/i18n/english';
export function translated(message: string, language: string) {
  if (language !== 'en') return message;
  const fragments: Record<string, string> = { '已通过': 'syntax checked', '公式为空': 'No equation yet', '已复制': 'copied' };
  return fragments[message] ?? english[message] ?? message;
}
