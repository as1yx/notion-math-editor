export type Category = 'common' | 'limits' | 'derivatives' | 'integrals' | 'series' | 'algebra';
export interface MathTemplate { id: string; category: Category; label: string; preview: string; latex: string; kind?: 'power' }
export const categories: { id: Category; label: string; description: string }[] = [
  { id: 'common', label: '常用', description: '从一个简单的数学结构开始' },
  { id: 'limits', label: '极限', description: '趋近、左右极限与经典极限' },
  { id: 'derivatives', label: '导数与微分', description: '变化率、偏导与高阶微分' },
  { id: 'integrals', label: '积分', description: '从不定积分到多重积分' },
  { id: 'series', label: '级数', description: '求和、乘积与无穷级数' },
  { id: 'algebra', label: '线性代数', description: '矩阵、向量与线性变换' },
];
export const buildingBlocks: MathTemplate[] = [
  ['x', '变量 x', 'x'], ['y', '变量 y', 'y'], ['z', '变量 z', 'z'],
  ['a', '变量 a', 'a'], ['b', '变量 b', 'b'], ['n', '变量 n', 'n'],
  ['zero', '数字 0', '0'], ['one', '数字 1', '1'], ['two', '数字 2', '2'],
  ['plus', '加号', '+'], ['minus', '减号', '-'], ['equals', '等号', '='],
  ['e', '自然常数 e', 'e'], ['function', '函数 f(x)', 'f(x)'],
].map(([id, label, latex]) => ({ id: `block-${id}`, label, latex, preview: latex, category: 'common' }));
export const symbols: MathTemplate[] = [
  { id: 'fraction', category: 'common', label: '分数', preview: String.raw`\frac{a}{b}`, latex: String.raw`\frac{#0}{\placeholder{}}` },
  { id: 'square', category: 'common', label: '平方', preview: 'x^2', latex: '#0^{2}', kind: 'power' },
  { id: 'power', category: 'common', label: '任意次方', preview: 'x^n', latex: String.raw`#0^{\placeholder{}}`, kind: 'power' },
  { id: 'subscript', category: 'common', label: '下标', preview: 'x_n', latex: String.raw`#0_{\placeholder{}}`, kind: 'power' },
  { id: 'sqrt', category: 'common', label: '平方根', preview: String.raw`\sqrt{x}`, latex: String.raw`\sqrt{#0}` },
  { id: 'abs', category: 'common', label: '绝对值', preview: String.raw`\left|x\right|`, latex: String.raw`\left|#0\right|` },
  { id: 'parentheses', category: 'common', label: '括号', preview: '(x)', latex: String.raw`\left(#0\right)` },
  ...[
    ['infinity', '无穷大', String.raw`\infty`], ['times', '乘号', String.raw`\times`], ['divide', '除号', String.raw`\div`],
    ['approx', '约等于', String.raw`\approx`], ['neq', '不等于', String.raw`\ne`], ['leq', '小于等于', String.raw`\le`], ['geq', '大于等于', String.raw`\ge`],
  ].map(([id, label, latex]) => ({ id, label, latex, preview: latex, category: 'common' as const })),
  ...[
    ['arrow', '趋近', String.raw`\to`], ['sin', '正弦', String.raw`\sin`], ['cos', '余弦', String.raw`\cos`], ['log', '自然对数', String.raw`\ln`],
  ].map(([id, label, latex]) => ({ id, label, latex, preview: latex, category: 'limits' as const })),
  ...[
    ['alpha', 'α 阿尔法', String.raw`\alpha`], ['beta', 'β 贝塔', String.raw`\beta`], ['gamma', 'γ 伽马', String.raw`\gamma`], ['lambda', '特征值 λ', String.raw`\lambda`], ['theta', 'θ 西塔', String.raw`\theta`], ['pi', '圆周率 π', String.raw`\pi`],
  ].map(([id, label, latex]) => ({ id, label, latex, preview: latex, category: 'algebra' as const })),
];
