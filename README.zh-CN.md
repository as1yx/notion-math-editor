# Notion Math Editor

[English](README.md) · [简体中文](README.zh-CN.md)

本项目提供两个独立离线版本，功能相同，界面与提示分别为中英文：

- 中文：[`dist/notion-math-editor.zh-CN.html`](dist/notion-math-editor.zh-CN.html)
- 英文：[`dist/notion-math-editor.en.html`](dist/notion-math-editor.en.html)

原文件名 `dist/notion-math-editor.html` 保留为中文版兼容副本。`npm run build` 会同时生成中英文两个版本。

拖拽数学积木和结构模板编辑高等数学公式，复制常用 KaTeX 兼容 LaTeX 到 Notion。原生 HTML + CSS + TypeScript，使用 MathLive 可视化编辑，Vite 生成完全离线的单个 HTML。

**直接使用：双击 `dist/notion-math-editor.html`。无需安装 Node.js，无需联网，无需配套字体目录。**

**Notion 实机验证待完成。** 自动化浏览器与沙箱验证不代表 Notion 桌面版验收通过。当前交付的测试证据见 `docs/verification.md`。

## 功能

- 常用、极限、导数与微分、积分、级数、线性代数六类面板，56 个符号/模板，加 14 个变量、数字与运算符积木，共 70 个可拖放或点击的按钮。
- 分式、上下标、根式、极限、积分、求和、矩阵、行列式、向量、分段函数等结构；复杂模板提供可编辑空位。
- 在光标处插入；选中 `x+1` 点击分式后成为分子；输入 `x` 点击平方得到 `x²`。
- 将分式、根式、矩阵、积分等结构拖入公式区，再把变量或数字拖入空位。绿色标记显示插入点或目标空位。
- 选中公式后，按住“拖动选中部分”移到另一个位置；整次移动只需一次撤销。支持拖到选区上进行包裹、Esc 取消和拖出编辑区取消。
- 点击定位、鼠标选择、字母数字键盘输入、Tab/“下一个空位”导航、撤销重做、清空。
- 实时只读 LaTeX 输出；显式导入应用，不双向同步；支持去除 `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 外层定界符。
- 使用 KaTeX 做语法检查，MathLive 做渲染。拒绝外链、HTML 和自定义宏。输入限制 10000 字符。
- 剪贴板不可用时聚焦并选中源码，提示 Ctrl+C / ⌘C。
- 简体中文、响应式布局、系统亮色/暗色；无需账户、Notion API 或浏览器扩展。
- 不存储公式；刷新会丢失内容，请复制保存。

## 项目结构

```text
notion-math-editor/
  index.html                    完整应用入口
  stage0.html                   最小可行性入口
  package.json / package-lock.json
  vite.config.ts / tsconfig.json / playwright.config.ts
  src/
    main.ts / stage0.ts / styles.css
    editor/                     MathLive 初始化、选区插入、结构拖放、LaTeX 校验
    components/                 工具栏、符号面板、导入导出
    data/                       独立符号和模板数据
    i18n/                       中英文文案与语言选择
    utils/clipboard.ts          复制和手动备用路径
    tests/                      Vitest 单元测试
  e2e/editor.spec.ts             原有编辑、离线浏览器与沙箱测试
  e2e/drag-drop.spec.ts          结构拖放、移动撤销与尺寸测试
  e2e/language.spec.ts          全分类及无障碍属性的语言完整性测试
  scripts/                      阶段 0 验证、单文件资源检查
  docs/                         构建报告、测试证据、界面截图
  dist/notion-math-editor.html   最终交付文件
  dist-stage0/stage0.html        阶段 0 单文件
```

## 开发环境与命令

推荐 Node.js 22.12+ 或 24 LTS，npm 10+。本次使用 Windows、Node.js 24.18.0、npm 11.16.0、Microsoft Edge 无头浏览器。所有直接依赖精确指定版本，传递依赖由 `package-lock.json` 固定。

在项目目录运行：

```sh
npm ci
npm run dev
npm run build
npm run preview
```

开发服务器默认打开 `http://127.0.0.1:5173`。预览构建文件访问预览服务器的 `/notion-math-editor.html`，根路径没有 `index.html`。

英文开发预览可运行 `npm run dev -- --mode en`；构建预览可直接访问 `/notion-math-editor.en.html`。界面、模板名称、错误提示、拖放反馈与无障碍标签均随构建版本本地化，数学公式和用户输入保持原样。

测试命令：

```sh
npm test
npm run test:e2e
npm run verify:html
npm run build:stage0
npm run test:stage0
```

浏览器测试默认使用已安装的 Microsoft Edge（`channel: 'msedge'`），无须下载 Playwright 浏览器。不使用 Edge 时，可运行 `npx playwright install chromium`，在 `playwright.config.ts` 和 `scripts/phase0.mjs` 中移除 `channel` 设置。测试不接触个人浏览器配置或账户。

`npm run test:e2e` 前先 `npm run build`；测试针对最终产物，而非开发服务器。中英文各自执行相同的完整浏览器回归；主编辑测试将 HTML 单独复制到 `work/final-isolated/<语言>`，在断网浏览器中打开。机器可读报告在本地生成，并从 Git 排除；公开可复核的摘要见 `docs/verification.md`。`test:stage0` 同样针对独立复制的阶段 0 产物。

## 像搭积木一样拖放

1. 按住“分数”按钮，拖到公式编辑区再松开，出现两个空位。
2. 把“基础积木”中的 `x` 拖入分子空位；松开前，目标空位会显示绿色框。
3. 把“平方”拖到刚放好的 `x` 上，得到 `x²`。
4. 把数字 `1` 拖入分母，即得到 `x²/1`。同样可以先把根号拖入空位，再把变量拖入根号内部。
5. 想调整已有内容时，先用鼠标选中一段公式，再按住“拖动选中部分”按钮，把它移到新位置；点击撤销可恢复整次移动。
6. 拖放过程中按 Esc，或在编辑区外松开，公式保持原样。单击按钮仍按原光标位置插入。

截图 [`docs/zh-CN/preview-dragging.png`](docs/zh-CN/preview-dragging.png) 展示中文拖放提示；英文对应 [`docs/en/preview-dragging.png`](docs/en/preview-dragging.png)。测试还会生成三种宽度的结果截图。

拖放发生在这个编辑器内部。把 HTML 上传为 Notion 页面中的 HTML 区块后，可在该区块里组装公式；最终仍通过 LaTeX 复制到原生公式块。更新编辑器时，需要用最新 HTML 替换已上传的文件。

## 单文件实现

Vite + vite-plugin-singlefile 将 JavaScript、CSS 和 MathLive 的 20 个 WOFF2 字体面全部内联。`MathfieldElement.fontsDirectory = null` 关闭动态字体请求，`soundsDirectory = null` 禁用音效，`computeEngine = null` 关闭可选计算引擎。

iframe 内使用 MathLive 的当前浏览上下文键盘初始化函数和 `sandboxed` 策略（内部转为手动显示）；隐藏键盘与菜单按钮，只用自定义符号面板。0.111.1 的未初始化 iframe 代理 getter 会向 `null` 来源发送消息，因此在当前窗口移除该可配置 getter 后再调用公开初始化 API。不会访问父页面 DOM、修改宿主或放宽 iframe 沙箱。

导入使用 `insert(..., { insertionMode: 'replaceAll' })` 保留撤销历史，清空使用 `setValue('')`；保留 MathLive 初始空快照。不要无故调用 `resetUndo()`，否则首次导入无法撤销。符号插入使用 `selection` 和 `insert()`，不拼接公式尾部。

拖放使用当前文档内的 Pointer Events 和捕获，不依赖父窗口的拖放通信。通过 `getElementInfo()` 的边界和层级定位空位，并结合 `getOffsetFromPoint()` 解析插入点。移动已选结构先在隐藏的 MathLive 模型计算结果，再一次提交到主编辑器，以保留单步撤销；不依赖私有模型 API。

输出将未填占位符转换为 `\square`，并将 MathLive 的 `\doubleprime` 规范化为 KaTeX 可识别的 `\prime\prime`。KaTeX 仅在内存中检查语法，其用户输入渲染结果不会注入 DOM。面板里的 HTML 预览仅来自固定开发者模板。

## Notion 桌面版上传与人工验收

1. 先断网双击 `dist/notion-math-editor.html`，确认分式和积分正常。若只测试阶段 0，可使用 `dist-stage0/stage0.html`。
2. 打开并登录 Notion 桌面版，新建测试页面。
3. 输入 `/html`，选择 HTML 嵌入区块，上传该 `.html` 文件。不要使用设置里的通用 HTML 导入器，它用于转换文档，不能保证执行脚本。
4. 若 `/html` 不存在，检查客户端版本和工作区功能是否可用；记录版本和现象。此项目不会绕过宿主限制。
5. 将区块高度调到能完整看到面板与编辑区（窄屏建议约 1200px），分别调整至约 400、600、800px 宽。确认无整页横向溢出，长公式只在编辑区横向滚动。
6. 拖入“分数”，再把 `x`、`y` 拖进分子和分母；检查绿色目标框与实际放入位置一致；鼠标再次点选分子并修改。
7. 切换“积分”，拖入定积分，将 0、1、x、x 依次放进下限、上限、被积函数和变量空位；确认虚拟键盘不会出现在区块外。
8. 把“平方”拖到 `x` 上；选中 `x+1` 后把分式拖到选区；使用“拖动选中部分”移动现有公式并撤销。拖出区域或按 Esc 确认不插入。
9. 验证撤销、重做、清空并撤销、导入正确/错误源码；切换系统亮暗色检查可读性。
10. 点击“复制 LaTeX”。如果沙箱禁止剪贴板，确认源码自动聚焦并选中，然后按 Ctrl+C（Mac：⌘C）。
11. 在同一页面另建 Notion 原生公式块，粘贴源码并确认显示。行内公式同样粘贴源码，不要额外加入 `$` 定界符。
12. 对下面十个验收表达式逐一重复，记录 Notion 版本、系统、宽度、复制方式与结果。

验收表达式：`x²`、`√(x+1)`、`(x+1)/(x-1)`、正弦经典极限、`∫₀¹ x²dx`、高斯积分、`Σₙ₌₁∞ 1/n²`、偏导数、2×2 矩阵、分段函数。完整 LaTeX 数据在 `e2e/editor.spec.ts`。

**完成以上操作前，不应把 MVP 的“Notion 实机验证”标记为通过。**

## 已知兼容性问题

- Notion 实际 iframe 的 CSP、字体策略、上传限制、区块尺寸和系统剪贴板权限需要实机确认。已测沙箱为 `allow-scripts`、无 `allow-same-origin`，并限制 `connect-src 'none'`、字体仅允许 data URL；若宿主完全禁止内联脚本或 data 字体，HTML 无法自行解除限制。
- 自动复制在某些沙箱/浏览器中不可用，手动选中复制是预期备用路径。成功路径使用受控剪贴板桩验证；未写入用户真实系统剪贴板。
- 并非所有 MathLive 命令都兼容 Notion。已验证内置模板及指定验收表达式，但 Notion 的 KaTeX 版本可能与本地校验库不同。高阶自定义宏和 HTML 命令不在支持范围。
- 自动化使用 Windows Edge，尚未实测 Safari、Firefox、移动端或真实 Notion 客户端。
- MathLive 在 `file:` 或 `about:srcdoc` 中可能在控制台提示无法确定相对资源基址，这是其内联脚本探测日志；动态字体和音效已关闭，离线资源实测不受影响。页面异常与外部请求单独检测。
- 拖放支持结构插入、空位填写和连续选区移动；不支持跨 iframe 拖到 Notion 原生公式块、二维任意排版或不连续选区移动。长公式请先滚动到目标位置，再进行拖放；较矮的区块请先增加高度以同时看到面板和编辑区。
- 不支持跨刷新保存或自动写入 Notion。

## 文档与后续方向

本次于 2026-10-25 查阅官方文档并结合安装版本的类型声明与源码验证 API：

- [MathLive API](https://mathlive.io/mathfield/api/)
- [MathLive 虚拟键盘](https://mathlive.io/mathlive/guides/virtual-keyboard/)
- [MathLive 编辑命令](https://mathlive.io/mathfield/guides/commands/)
- [Vite 静态资源](https://vite.dev/guide/assets)
- [Notion HTML blocks 官方说明](https://developers.notion.com/reference/block#html-blocks)

后续优先完成 Notion 桌面版验收，再按实际结果补充浏览器兼容测试、矩阵维数编辑和更多高数模板。源码中已经将模板、编辑与输出逻辑分开，可独立扩展。

第三方许可证见 `THIRD-PARTY-NOTICES.txt`，其内容也内嵌于最终 HTML。
