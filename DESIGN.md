# DESIGN.md

> 让人放心的工厂，一眼可信。浅色、克制、网格分明 —— 像一份排版精良的产品目录，
> 而不是一个深色科技仪表盘。

## 1. Visual Theme & Atmosphere

**Style**: Warm Professional × Swiss Grid（温暖商务为底，瑞士网格的版面纪律）
**Keywords**: 可信、克制、工业感、网格、留白、秩序、温暖、专业
**Tone**: 一家让人放心的工厂 —— NOT 深色科技 / 炫技 / 花哨
**Feel**: 像一本排版精良的产品目录在屏幕上展开，而不是一块发光的控制台

**Interaction Tier**: L2（流畅交互）
**Dependencies**: 纯 CSS + 原生 IntersectionObserver（无 GSAP / 无 Lenis）

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg:            #FAFAF8;   /* 页面背景：暖白 */
  --surface:       #FFFFFF;   /* 卡片 / 容器 */
  --surface-alt:   #F4F1EC;   /* 交替 section：暖米 */
  --surface-hover: #FBFAF7;   /* 悬停表面 */

  /* Borders */
  --border:        #E6E2DA;   /* 默认边框：暖灰 */
  --border-strong: #D3CCC0;   /* 强边框 / 分隔线 */

  /* Text */
  --text:          #1B2420;   /* 主文字：近黑微绿 */
  --text-secondary:#57625C;  /* 正文 / 描述 */
  --text-tertiary: #8B948E;  /* 标签 / 辅助 */

  /* Brand（品牌主色：深工业绿） */
  --brand:         #0C3B33;
  --brand-strong:  #082C26;
  --brand-soft:    #E8F0ED;
  --brand-rgb:     12, 59, 51;

  /* Accent（强调色：暖橙，仅用于 CTA / 关键点缀） */
  --accent:        #E4570F;
  --accent-strong: #BC4309;
  --accent-soft:   #FCE9DC;
  --accent-rgb:    228, 87, 15;

  /* Semantic */
  --success:       #1F7A4D;
  --error:         #C0392B;
  --warning:       #B7791F;
}
```

**Color Rules:**
- 所有颜色通过 CSS 变量引用，禁止硬编码 hex
- 一个 section 内只用一个强调色（橙），绿色只用于标题 / 品牌 / 结构
- 深色（brand）面积占比 < 25%，主体永远是浅色
- 橙色只出现在 CTA、关键数字、极少量点缀，不做背景铺色

## 3. Typography Rules

**Font Stack:**
```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1 | Archivo | 3.25–4.25rem | 800 | 1.05 | -0.03em |
| Section H2 | Archivo | 1.9–2.4rem | 800 | 1.15 | -0.025em |
| H3 | Archivo | 1.25–1.5rem | 700 | 1.25 | -0.015em |
| Body | Inter | 1–1.0625rem | 400–500 | 1.65 | 0 |
| Label / Eyebrow | Inter | 0.6875rem | 700 | 1.4 | 0.14em (uppercase) |
| Spec number | Inter | 1.5–2.5rem | 700 | 1.1 | -0.01em |

**Typography Rules:**
- Heading weight ≥ 700，全部用 Archivo
- 标题 letter-spacing 为负（-0.02 ~ -0.03em），制造紧凑工业感
- **NEVER use**: 衬线体（Playfair/Noto Serif）、等宽体做正文、Comic Sans、系统默认 Times
- 正文行高 ≥ 1.6，段距 1.25em

**Text Decoration（按 text-decoration-rules.md 决策表）:**
- Hero H1：无渐变、无投影（克制风格，白底）
- Section H2：无渐变、无投影；用下方 2px 品牌色短横线做结构
- 正文 p：无任何装饰
- Eyeebrow 标签：2px 品牌色下划线或背景高亮，不加 text-shadow

## 4. Component Stylings

### Buttons
```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  font: 600 0.9375rem/1 Inter, sans-serif;
  padding: .8rem 1.6rem; border-radius: 10px;
  background: var(--accent); color: #fff;
  transition: background-color .18s ease, transform .18s ease, box-shadow .18s ease;
}
.btn:hover  { background: var(--accent-strong); transform: translateY(-1px); box-shadow: 0 6px 16px -8px rgba(228,87,15,.5); }
.btn:active { transform: translateY(0); }
.btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.btn:disabled { opacity: .55; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-ghost { background: transparent; color: var(--brand); border: 1px solid var(--border-strong); }
.btn-ghost:hover { background: var(--surface); border-color: var(--brand); box-shadow: none; }
```

### Cards
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.card:hover { border-color: var(--border-strong); box-shadow: 0 10px 30px -18px rgba(27,36,32,.25); }
```

### Navigation
- sticky top-0，z-50
- 默认：透明背景 + 底部 1px border
- 滚动后：`background: color-mix(in srgb, var(--bg) 88%, transparent)` + `backdrop-filter: blur(10px)` + 阴影
- 链接 hover：品牌色 + 下划线动画

### Links
```css
a { color: inherit; }
.link { color: var(--brand); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: transparent; transition: color .15s, text-decoration-color .15s; }
.link:hover { color: var(--accent); text-decoration-color: currentColor; }
```

### Tags / Badges
```css
.tag {
  display: inline-flex; align-items: center; gap: .35rem;
  font: 600 .6875rem/1 Inter, sans-serif; letter-spacing: .08em; text-transform: uppercase;
  padding: .35rem .7rem; border-radius: 999px;
  background: var(--brand-soft); color: var(--brand);
}
.tag-accent { background: var(--accent-soft); color: var(--accent-strong); }
```

### Section header（H2 + 短横线）
```css
.section-head { margin-bottom: 2.5rem; }
.section-head .eyebrow { display:block; margin-bottom: .75rem; }
.section-head h2 { margin: 0; }
.section-head .rule { width: 44px; height: 3px; background: var(--brand); border-radius: 2px; margin-top: 1rem; }
```

## 5. Layout Principles

**Container:**
- Max width: 1200px，居中
- Padding: 24px（桌面）/ 16px（移动）
- 窄容器（文章正文）：760px

**Spacing Scale:**
- Section padding: 96px（桌面）/ 56px（移动）
- Component gap: 24px
- Card internal padding: 24px
- 标题与内容间距: 2.5rem

**Grid:**
```css
.grid { display: grid; gap: 24px; }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 900px) { .grid-3 { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 600px) { .grid-3, .grid-2 { grid-template-columns: 1fr; } }
```

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | 无阴影，1px 边框 | 默认卡片、表格 |
| Subtle | `0 1px 2px rgba(27,36,32,.04)` | 图片容器 |
| Elevated | `0 12px 32px -20px rgba(27,36,32,.28)` | 下拉菜单、弹窗、悬浮卡 |

## 7. Animation & Interaction

**Motion Philosophy**: 克制优雅，只用 opacity 和 transform；动效服务于「看清结构」，不炫技。
**Tier**: L2

### Entrance Animation
```css
[data-reveal] { opacity: 0; transform: translateY(18px); transition: opacity .6s ease, transform .6s cubic-bezier(.22,.61,.36,1); }
[data-reveal].is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1; transform: none; transition: none; }
}
```

### Scroll Behavior
```js
// IntersectionObserver：进入视口加 .is-visible；rAF 节流
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
```

### Nav scroll state
```js
const header = document.querySelector('[data-site-header]');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
```

### Hover & Focus States
- 按钮：hover 深色 + translateY(-1px) + 阴影；active 复位
- 卡片：hover 边框加深 + 轻阴影
- 链接：hover 变橙 + 下划线滑入
- 所有可交互元素：`:focus-visible` 3px 品牌色 outline

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

## 8. Do's and Don'ts

### Do
- 用大量留白和网格建立秩序，而不是用色块和阴影堆砌
- 标题用 Archivo 紧字距，正文用 Inter，层级靠字重和字号拉开
- 每个 section 有明确的 H2 + 品牌色短横线，结构一眼可辨
- 图片统一圆角 12px，容器统一 1px 暖灰边框
- 移动端优先保证可读性：正文 ≥ 16px，触摸目标 ≥ 44px

### Don't
- ❌ 大面积深色背景铺满整页（深色只用于 footer / 极少量 section）
- ❌ 渐变文字、文字投影、霓虹发光
- ❌ 圆角过大（> 16px）或全直角混搭
- ❌ 一个 section 出现两个强调色
- ❌ 用 emoji 做图标（用内联 SVG）
- ❌ 卡片同时有重阴影 + 重边框 + 大圆角
- ❌ 硬编码 hex 颜色
- ❌ 正文用衬线体或等宽体
- ❌ 为了动效而动效（L2 只做 reveal + hover + 导航滚动态）
- ❌ 图片用纯色块占位

## 9. Responsive Behavior

**Breakpoints:**
| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | > 1024px | 1200px 容器，3 列网格 |
| Tablet | 640–1024px | 2 列网格，section 间距 72px |
| Mobile | < 640px | 单列，section 间距 56px，导航折叠为汉堡 |

**Touch Targets:** 最小 44×44px
**Collapsing Strategy:** 导航在 < 1024px 折叠为汉堡菜单（details/summary，无 JS 依赖）
