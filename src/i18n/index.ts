import { english } from './english';
declare const __APP_LANGUAGE__: 'zh-CN' | 'en';
export const language = typeof __APP_LANGUAGE__ === 'undefined' ? 'zh-CN' : __APP_LANGUAGE__;
export function t(message: string, values: Record<string, string> = {}): string {
  let result = language === 'en' ? english[message] ?? message : message;
  for (const [key, value] of Object.entries(values)) result = result.replaceAll(`{${key}}`, value);
  return result;
}
