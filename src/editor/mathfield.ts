import { MathfieldElement, initVirtualKeyboardInCurrentBrowsingContext } from 'mathlive';
import 'mathlive/static.css';
import { language, t } from '../i18n';

// Global font faces are bundled as data URLs. Disable all dynamic asset loading.
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;
MathfieldElement.computeEngine = null;
MathfieldElement.locale = language === 'en' ? 'en' : 'zh-cn';

// MathLive 0.111.1's configurable iframe proxy getter posts to origin "null"
// before sandboxed policy can take effect. Remove that uninitialized getter
// and use the public local-context initializer. The parent stays untouched.
if (window !== window.top) {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'mathVirtualKeyboard');
  if (descriptor?.configurable && descriptor.get) {
    Reflect.deleteProperty(window, 'mathVirtualKeyboard');
  }
  initVirtualKeyboardInCurrentBrowsingContext();
}

export function createMathfield(host: HTMLElement): MathfieldElement {
  const field = new MathfieldElement();
  // 'sandboxed' mounts the keyboard controller in this frame, then uses manual
  // visibility. No parent-frame proxy or opaque-origin postMessage is needed.
  field.mathVirtualKeyboardPolicy = 'sandboxed';
  field.setAttribute('aria-label', t('可视化公式编辑器'));
  field.setAttribute('placeholder', t('点击数学符号，或在这里输入…'));
  host.append(field);
  field.menuItems = [];
  return field;
}
