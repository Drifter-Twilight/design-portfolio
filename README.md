# 视觉设计作品集 — Dark-Tech × Editorial

个人设计作品集单页长滚动视差站点。主风格为 **Dark-Tech × Editorial**（暗色科技 × 编辑式大字），  
遵循 Motion First，动效以 React Bits 组件为骨架，全站中英双语、可键盘操作、尊重系统「减少动态」偏好。

---

## 快速开始

```bash
cd E:\design-portfolio

npm install                        # 首次
npm run sync:assets                # 从 E://作品集 复制素材并生成清单
npm run optimize:images -- --apply # 转 WebP 并把清单切到 /works-opt/
npm run dev                        # 开发，默认 http://127.0.0.1:5173
npm run build        # 类型检查 + 生产构建
npm run preview      # 预览构建产物
```

要求 Node 20.19+ 或 22.12+（项目在 Node 22.22 上验证）。  
`sync:assets` 与 `optimize:images` 是 `build` 的前提：前者生成 `src/data/works.json`，  
后者把原图压成线上用的 WebP，缺一步页面会没有图。平时不用记这两条——  
**双击 `deploy.bat` 会按顺序跑完**（详见 `docs/deploy-github-pages.md`）。

---

## 发布上线

线上托管在 GitHub Pages，仓库名必须是 `<你的GitHub用户名>.github.io`，这样 `base` 就是 `/`。  
完整步骤见 **[docs/deploy-github-pages.md](docs/deploy-github-pages.md)**，这里只列结论：

| 场景   | 操作                                                   | 耗时      |
| ---- | ---------------------------------------------------- | ------- |
| 首次上线 | 建仓库 → `git push` → Settings → Pages 选 GitHub Actions | 约 10 分钟 |
| 日常更新 | 双击 `deploy.bat`（同步 → 压图 → 构建 → 推送）                   | 约 2 分钟  |
| 只改文字 | 改 `src/i18n/*.ts` 或 `profile.ts` 后双击 `deploy.bat`    | 同上      |
| 回退   | `git reset --hard <提交号> && git push -f`              | 30 秒    |

`.github/workflows/deploy.yml` 会自动跑 `typecheck` + `build` 再部署，  
构建失败不会把坏版本推上线。

## 内容录入工具

双击项目根目录的 **`admin.bat`**，浏览器会自动打开 `http://127.0.0.1:5180`。

它不是后台管理系统：没有数据库、没有登录、没有服务器。数据源始终是  
`E://作品集`（素材）与仓库里的 JSON（内容），工具只改 `src/data/overrides.json` 这一层；「个人资料」面板会额外写 `public/profile/` 与 `src/data/profile-media.json`。

| 能做什么    | 怎么操作             | 写到哪里                               |
| ------- | ---------------- | ---------------------------------- |
| 看全部作品   | 左侧按分类浏览，缩略图 + 张数 | 只读 `works.json`                    |
| 改中英标题   | 直接改输入框，自动保存      | `overrides.json` 的 `titles`（只存改过的） |
| 调顺序     | 卡片下方 ↑ ↓         | `overrides.json` 的 `order`         |
| 隐藏 / 显示 | 卡片下方「隐藏」         | `overrides.json` 的 `hidden`        |
| 换头像 / 简历 | 左侧「个人资料」→ 选图或拖进去 | `public/profile/*.webp` + `profile-media.json` |
| 发布      | 右上角「发布」          | 跑 sync → 压图 → 构建 → commit → push   |

### 个人资料（头像 / 简历）

左侧导航最底部的「个人资料」有两个槽位，点「替换图片」或把图片拖到卡片上即可。

- 上传后自动按长边 1600 压成 WebP q88，宽高与内容指纹写进 `src/data/profile-media.json`；
- 页面用这份宽高做占位，所以换一张长宽比不同的简历也不会让弹窗跳动或裁切；
- URL 带 `?v=<指纹>`，换图后一定拿到新图，不会和缓存里的旧图混用；
- 命令行同样可用：`node tools/admin/profile-assets.mjs resume <图片路径>`；
- 换完仍需点右上角「发布」才会到线上。

**增 / 删作品**仍然是操作素材目录：

- 增：把新图放进 `E://作品集` 对应分类，点「发布」，工具会自动扫描并生成清单
- 删：从 `E://作品集` 移除，或先在工具里「隐藏」——隐藏不动原文件，随时可恢复

`overrides.json` 里只有你改过的差异，所以重新同步素材不会把手改的内容冲掉；  
想全部还原，把它清成 `{"hidden":[],"titles":{},"order":{}}` 即可。

发布日志会实时显示在右下角，任何一步失败都会中止且不推送。

---

## 技术栈

| 层         | 选型                                                      | 版本      |
| --------- | ------------------------------------------------------- | ------- |
| 构建        | Vite                                                    | 8.3     |
| 框架        | React                                                   | 19.3    |
| 语言        | TypeScript                                              | 5.9     |
| 样式        | Tailwind CSS（v4，`@theme` 内联 token）                      | 4.3     |
| 动效        | React Bits（源码落地）+ GSAP 3.15 / ScrollTrigger / SplitText | —       |
| 惯性滚动      | Lenis                                                   | 1.3     |
| 手势与数值动画   | Motion（原 framer-motion）                                 | 14.9    |
| 3D / 着色器  | Three.js（关于页 Color Bends 背景，按需加载）                       | 0.180   |
| WebGL 工具库 | ogl（艺术海报 Flex Carousel）                                 | 1.x     |
| 素材处理      | sharp（海报生成 1200px 轮播副本，仅 devDependency）                 | 0.34    |
| 品牌图标数据    | simple-icons（仅取 5 个矢量 path）                             | 16.x    |
| 国际化       | i18next + react-i18next                                 | 26 / 17 |
| 字体        | Anton / Space Grotesk / Instrument Serif（自托管，latin 子集）  | —       |

### 关于 React Bits

React Bits 不是 npm 包，组件以源码形式落入仓库（`src/components/reactbits/`）。  
本项目落地了 16 个官方组件：

- `GhostFibers` — 首屏背景：原生 WebGL2 纤维丝带 + 尘埃 + 5 级 Bloom，指针聚焦 / 点击脉冲
- `ColorBends` — 关于页背景：Three.js 流动色带，指针扰动 + 视差
- `RippleGrid` — 尾页背景：原生 WebGL2 涟漪网格，白色线条；关掉指针跟随，只保留点击强涟漪与中心自动涟漪
- `Dither` — 平面设计区背景：WebGL2 抖动场（bayer 4 阶 + fbm 波动），视口大小、随滚动粘住
- `FlexCarousel` — 艺术海报：ogl 驱动的玻璃透镜轮播，拖动 / 方向键 / 点击放大；放大状态下再点一次触发大图
- `FoldText` — 关于页全部文案：逐字翻折展开，指针邻近可折角
- `StrokeText` — 尾页文字：SVG 描边逐字绘制 + 填充擦除，带主色投影，悬停重绘
- `TechText` — 首屏主标题：画布字，指针经过处转为矢量虚线轮廓，可按度量线入场
- `ScrollReveal` — 段落随滚动逐词显影
- `AnimatedContent` — 区块与卡片的滚动入场
- `SpotlightCard` — 商品套系卡的指针聚光
- `CountUp` — 数字统计滚动
- `ScrollVelocity` — 电商区收尾的两行跑马灯（中英固定文案，不参与语言切换）
- `LineWaves` — 电商区背景：WebGL2 线波，1 个片段着色器 + 全屏三角，颜色与光带走主色紫
- `CircularGallery` — 营销海报：弧形画廊 + 玻璃卡片，滚动 / 拖拽 / 方向键切换，点击就地放大
- `DepthCarousel` — 电商 Banner：GSAP 驱动的 3D 卡片纵深栈，自动轮播、悬浮暂停、圆点跳转

> `SplitText` 曾用于旧版首屏，现保留源码（`src/components/reactbits/SplitText.tsx`）但首屏已改用 `TechText`。

> 说明：`CountUp` 仅保留官方的 count 渲染路径（移除未使用的 roll 翻牌分支），>   
> 并把触发改为原生 IntersectionObserver + 1.2s 兜底，避免观察器异常时数字停在 0。>   
> `RippleGrid` 移除了卸载时的 `WEBGL_lose_context` 调用 —— React StrictMode 会先卸载再重挂，>   
> 拿回的是已丢弃的上下文，重挂后着色器编译一律失败（表现为背景直接消失）。>   
> 其余组件与官方源码逻辑一致。

---

## 目录结构

```
E://design-portfolio
├─ raw/
│  └─ works/                  # 原图副本（约 277 MB，不入库，sync 每次重建）
├─ public/
│  ├─ works-opt/              # 压缩后的 WebP（约 32 MB，入库，线上用这个）
│  ├─ preview/                # 卡片小图（WebP）
│  └─ profile/                # 头像与原图简历
├─ scripts/
│  ├─ sync-assets.mjs         # 素材同步 + 生成清单（含真实像素宽高）
│  ├─ optimize-images.mjs     # 转 WebP（--apply 切清单，--force 全量重压）
│  └─ shot.mjs                # 视觉验收：分屏截图 + 控制台错误收集
├─ .github/workflows/
│  └─ deploy.yml              # 推 main 自动构建并发布到 GitHub Pages
├─ deploy.bat                 # 双击发布：同步 → 压图 → 构建 → 推送
├─ src/
│  ├─ components/
│  │  ├─ reactbits/           # React Bits 组件源码
│  │  ├─ layout/              # Header、语言切换
│  │  ├─ sections/            # Hero / About / Graphic / Commerce / Outro
│  │  └─ work/                # LazyImage、Gallery、WorkCard、Lightbox
│  ├─ data/
│  │  ├─ profile.ts           # ★ 个人信息，全站只改这里
│  │  └─ works.json           # 脚本生成的素材清单，勿手改
│  ├─ hooks/                  # Lenis、视差、媒体查询、性能分档
│  ├─ i18n/                   # zh.ts / en.ts（en 受 zh 的类型约束，缺键会报错）
│  └─ index.css               # 设计 token 与基础样式
└─ index.html
```

---

## 改个人信息

只改 `src/data/profile.ts`：姓名、抬头、城市、邮箱、社交链接、Hero 主标题拆行、起始年份。  
其余文案在 `src/i18n/zh.ts` 与 `src/i18n/en.ts`，两份键名必须一致（`en.ts` 用 `Dict` 类型强制校验）。

---

## 首屏（Hero）构成

| 层    | 实现                                                                              |
| ---- | ------------------------------------------------------------------------------- |
| 背景   | `GhostFibers`（原生 WebGL2，零依赖）。底层常驻 CSS 网格 + 紫色辉光，WebGL2 不可用时自动退回该层，不会出现纯黑        |
| 主标题  | `TechText` 画布字，`intro="metrics"` 按基线 / x-height / cap height 分区填入，指针经过处实体字转矢量轮廓 |
| 高度   | `min-height: 100svh` + `env(safe-area-inset-bottom)`，内容在可视安全区内自适应               |
| 文案   | 「欢迎来到」+「Witt He的个人设计作品集」+ 副标题 `Graphic & E-commerce Design`                     |
| 年份   | `视觉设计作品集 · {{since}} — {{year}}`，`year` 由 `new Date().getFullYear()` 实时计算       |
| 滚动提示 | 画面中间偏下、水平居中，带下箭头图标与上下浮动动画                                                       |
| 配色   | 高端紫：主强调 `#c4a7ff`，次级 `#7c5cff`；底色带冷紫调 `#08060f`                                 |

> 首屏在 `prefers-reduced-motion` 下不挂载 GhostFibers，只保留静态氛围层。>   
> 背景从 WebGPU 版 AeroShards 换成 WebGL2 版 GhostFibers，原因是 WebGPU 在部分 Edge / 显卡组合下静默失败（探测通过但不出图），WebGL2 覆盖面更广。

## 关于页（About）构成

| 层    | 实现                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 背景   | `ColorBends`（Three.js，紫色色带）。`React.lazy` 按需加载，接近视口才挂载，Three 独立分包约 121 KB gzip                                                                                                  |
| 文案   | 全部使用 `FoldText`：Hello / 我是 何宥纬 / Witt He / 电商美工 … / 曾经也是 … / 核心能力 / 生活特质                                                                                                       |
| 姓名描边 | `.name-outline` 用 `-webkit-text-stroke: 0.032em`，填充透明，描边取主色；英文名 `Witt He` 为实心主色大字                                                                                              |
| 布局   | PC：文本在左、照片与联系方式在右；移动端：照片与联系方式在上、文本在下（`order-1 / lg:order-2`）                                                                                                                   |
| 照片   | `public/profile/portrait.webp`（1199×1600，125 KB），3:4 裁切容器，压饱和 + 冷调以融入暗紫体系。地址与宽高由 `src/data/profile-media.json` 提供，在录入工具「个人资料」里替换 |
| 联系方式 | 邮箱 / 微信号 / 简历三行固定在照片下方，每行前置一个与文字同色同尺寸的圆角图标（`ContactIcon`）                                                                                                                      |
| 简历弹窗 | 「查看简历」打开 `ResumeDialog`：焦点陷阱、Esc 关闭、锁滚动、关闭后焦点归还；整幅 `public/profile/resume.webp`（1131×1600，213 KB）**一屏完整呈现、不需要滚动**，滚轮 / 双指可放大到 4×，双击还原。弹窗宽高按图片比例收紧（`min(94vw, 92svh 折算宽)`），比例取自 `profile-media.json`，换不同长宽比的简历不会裁切或留边 |
| 技能图标 | 10 个白色单色圆角徽标（Ps / Ai / Lr / Lv / WB + HTML5 / CSS3 / JS / Vue / React）。安全区放得下就静态一行，放不下（窄屏）自动切换为横向循环播放                                                                          |

> React Bits 的 `FoldText` 按字拆分时默认给词级容器加 `whitespace-nowrap`，中文整段没有空格会导致无法折行并撑破容器 —— 本项目在 `splitBy="char"` 时取消了该限制。

## 作品区（Graphic / Commerce）要点

| 项         | 实现                                                                                                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 产品溶图      | 5 组 Before/After 拖动对比（`src/components/work/BeforeAfter.tsx`）：两层绝对叠放，上层用 `clip-path` 裁切；`role="slider"` + ← → / Home / End 键盘可调；触屏 `touch-action: pan-y`，纵向滚动不受影响；图片纯展示，不接 lightbox                                               |
| 海报轮播      | `FlexCarousel`：20 张海报，画布 `h-[clamp(520px,78svh,860px)]`，`fit="natural"` 不裁切；桌面 `cardHeight 0.62 / bend 0.14`，移动端 `0.66 / 0.1`；关闭内置 caption，名称 / 类别 / 序号改成画布**外**的信息条，放大时不会被裁；点击当前卡放大，放大后再点一次调 `Lightbox` 看原图（两种状态光标都是 `zoom-in`） |
| 抖动背景      | `Dither` 放在 `sticky top-0 h-[100svh]` 的容器里：整段平面设计区共用一张视口大小的画布，不为几屏高的 section 开超大纹理                                                                                                                                               |
| 品牌 VI     | 每套 7 张按**九宫格**框定（`ViGrid`）：3×3 网格、`aspect-[4/3] lg:aspect-[3/2]`，首图通栏 2 列、第三张纵向贯通 2 行，正好填满 9 格；图片 `object-cover` 裁切，序号与素材原名称压在角标上，整格可点开 `Lightbox`                                                                               |
| 图标叠放      | `ScrollStack` 叠放 5 套图标表；卡片宽度与海报轮播对齐（`min(100%, (100svh - 150px) * 1.778)`），内层 `px-0`；`itemDistance 48 / itemStackDistance 22 / holdDistance 140` 收紧滚动行程；整卡是 button，可点开 `Lightbox`                                                |
| 电商背景      | `LineWaves` 铺满整个电商区（`sticky top-0 h-[100svh]`，容器用 `overflow-clip` 而非 `overflow-hidden`，否则 sticky 不生效）。常驻渐变 + 网格兜底，`prefers-reduced-motion` 时整层不挂                                                                                 |
| 营销海报      | `CircularGallery`：15 张合成一条流水，**不再按服饰 / 日化 / 食品分组**，也不显示卡片名称（`showTitles={false}`）；`itemAspect 0.58` 贴合 9:16，`bend 3 / autoScroll 0.4`；滚轮由画廊接管（外层 `data-lenis-prevent`，否则 Lenis 会抢走纵向滚轮）；点一次就地放大，**再点一次进 `Lightbox` 看原图**         |
| 电商 Banner | `DepthCarousel`：10 张 3.2:1 横图，`680×213 / depth 180 / spread 120 / tilt 24 / visibleCards 3`；`autoplay` 3.4s，**鼠标悬停或键盘聚焦**暂停（指针点击不再关掉自动轮播）；点当前那张进 `Lightbox`；走 `/preview/commerce/banner/*.webp`（长边 1400）而不是 5.8 MB 的原图           |
| 网格        | `Gallery` 用 `minmax(min(px), 窄屏百分比)` 收敛列宽，商品套图 / 详情页仍走自适应网格                                                                                                                                                                      |
| 图片        | 统一 `LazyImage`：IO 预取 + 全局队列限流 + 固定比例占位；作品完整呈现用 `object-fit: contain`，不裁切                                                                                                                                                         |
| 大图缩放      | `ZoomableImage`（`src/components/work/ZoomableImage.tsx`）：滚轮以光标为锚点缩放 1–4×、放大后拖动、双指捏合、双击还原；`Lightbox` 与简历弹窗共用同一套行为                                                                                                                 |
| 背景衔接      | 每个区块的动效背景包一层 `.fx-veil`（`mask-image` 上下各淡出 `clamp(80px,13vh,180px)`），相邻区块之间不再出现硬切线；首屏用 `.fx-veil-bottom` 只淡底部                                                                                                                    |
| 其余作品      | 海报 / 套图 / 详情页均可点开 `Lightbox`（焦点陷阱、方向键、Esc、焦点归还）                                                                                                                                                                                  |
| 详情页索引     | 详情页与套图共用一个大图组，`Gallery` 传 `indexOffset={shots.length}`，`WorkCard` 用 `lightboxIndex` 定位 —— 否则点详情页会打开套图里同序号的那张                                                                                                                     |

## 尾页（Outro）构成

| 层    | 实现                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------- |
| 背景   | `RippleGrid`（原生 WebGL2，零依赖）。底层常驻 CSS 网格 + 辉光，WebGL2 不可用或初始化失败时自动退回该层                           |
| 章节标头 | 左上角小文本「结束」（英文 `The End`）替代原来的 04 序号                                                            |
| 描边装饰 | `StrokeText` 渲染 `Let's create something amazing!`，描边取主色 `#c4a7ff`、投影取次级紫 `#7c5cff`，填充留 14% 透明度 |
| 主文本  | `StrokeText` 渲染「感谢浏览」，实心 + 描边绘制，字号 178（英文 138），整体水平居中                                          |
| 副文本  | 合作意向说明，纯 HTML（长段落用画布字反而不易读）                                                                    |
| 联系方式 | 邮箱与微信号两个描边胶囊，图标同上                                                                              |
| 返回顶部 | `BackToTop`：圆形按钮固定在右下角，滚到「关于」及以下才出现，回到其上自动 `invisible`                                         |
| 页脚   | 只保留左下角一行版权                                                                                     |

> 尾页高度为 `calc(100svh - 64px)`（扣掉页脚），否则滚到文档末尾时章节标头会被固定导航盖住。

## 素材流水线

作品素材位于 `E:\作品集`（只读，脚本不会修改原目录）：

```bash
npm run sync:assets
npm run optimize:images -- --apply     # 生成线上用的 WebP 并切换清单
```

`sync:assets` 会：

1. 按「平面设计 / 电商设计」两级分类遍历全部图片；
2. 复制到 `raw/works/` 并重命名为 ASCII 路径（避免中文 URL 编码问题）；     
   —— 放在 `public` 之外，否则 vite 会把这 277 MB 原样拷进 `dist`；
3. 读取每张图的真实像素宽高写入 `src/data/works.json`，页面据此预留 `aspect-ratio`，杜绝布局跳动；     
   同时给海报 / 图标 / Banner 生成 `card` 轻量副本（webp，长边 1200–1600），供 GPU 纹理与大图位使用；
4. 按语义重排 VI 图序（Logo → 释义 → 规范 → 应用落地）与商品套图顺序     
   （首图 → 场景卖点 → 细节材质 → 尺寸规格 → 礼盒信任 → 白底图）。

新增作品时，只要按既有目录规范放进 `E:\作品集` 再跑一次即可。

### 关于图片体积

**线上走压缩版**：149 张原图（298.9 MB）转 WebP 后 32.0 MB（q88 / 最长边 1600），  
9.0× 压缩，`dist` 从 309 MB 降到 42 MB。拿 800×700 的 100% 裁切做肉眼对比，与原图无从分辨；  
原图副本保留在 `raw/works`（不入库），随时可以切回去。


即便如此仍保留三层兜底：

- `IntersectionObserver` 进入 300px 预取范围才挂 `src`；
- 全局队列把并发解码压到 6 张（`src/lib/imageQueue.ts`）；
- 固定 `aspect-ratio` 占位，图片到达前后无位移。

> 两个必须记住的队列约束（都已修复，改这块时不要回退）：
> 1. **名额必须只归还一次**，且排队期间组件卸载也要归还 —— StrictMode 先卸载再重挂，
>    `acquireSlot` 的回调若在卸载后执行，会把名额永久占掉，队列卡死、后续图片再也不加载。
> 2. **不要在已由 IO 控制时机后再叠一层 `loading="lazy"`** —— 元素被滚出预取区时浏览器会取消请求，
>    既不触发 `load` 也不触发 `error`，同样会把名额占死。这里统一用 `loading="eager"`。

想调压缩参数就改 `scripts/optimize-images.mjs` 顶部的 `MAX_EDGE` / `QUALITY`：

```bash
npm run optimize:images -- --force --apply   # 全量重压并切换清单
```

---

## 需求口径 vs 实际素材

| 项目 | 需求描述 | 实际素材 | 页面呈现 |
|---|---|---|---|
| 品牌 VI | 3 套 × 6 张 | 3 套 × 7 张（21 张） | 全部 7 张，瀑布流按原始比例 |
| 艺术海报 | 20 张 | 20 张 | 20 张，9:16 |
| Icon | 5 套 | 5 张（16:9） | 5 张 |
| 商品套图 + 详情页 | 3 套，每套 5–6 + 6 | **5 套**，套图 28 张、详情页 30 张 | 5 套全展 |
| 营销海报 | 15 张 | 15 张（日化/服饰/食品 各 5） | 15 张，9:16 |
| 产品溶图 | 5 套（场景 + 融合） | 5 套 × 2 | 5 套拖动对比（Before / After） |
| 艺术海报命名 | — | 风格·名称（如「Y2K·金属梦境」） | 同步为素材名：`风格` 作副标题、`名称` 作主标题 |
| 电商 Banner | 10 张 | 10 张（3584×1120） | 10 张，3.2:1 |

按你的选择「以实际素材为准全量展示」，上表为差异留痕。

---

## 无障碍实现

- 语义结构：`header / nav / main / section / figure / footer`，每个 section 由 `aria-labelledby` 指向自身标题；
- 语言：`<html lang>` 随切换实时更新为 `zh-CN` / `en`，正文容器同步 `body[data-lang]` 以调整中英字距；
- 键盘：全站可 Tab 到达，`:focus-visible` 为 2px 酸性色描边 + 3px 偏移；跳过导航链接直达 `#main`；
- Lightbox：`role="dialog"` + `aria-modal`，焦点陷阱、Esc 关闭、← → 翻页、关闭后焦点归还触发元素、背景滚动锁定；
- 图片：每张都有中英双语 `alt`（由套名 + 作品名组合而成），纯装饰图层统一 `aria-hidden`；
- 对比度：正文 `#9a9aa2` 于 `#07070a` 上约 7:1；仅装饰性小字使用更低的 `--color-mute`；
- 动效：`prefers-reduced-motion: reduce` 下进入 lite 档，关闭 Lenis、两层视差、GPU 背景、逐字动画与跑马灯，`SplitText` / `AnimatedContent` / `CountUp` 均内置静态降级；
- 无 JS：`<noscript>` 给出中英双语提示。

---

## 动效机制

### 可重复触发

所有「滚动进入播放」的动效都按 **进入播放 / 离开归零 / 再进入重播** 工作，不再是只播一次：

| 组件 | 实现 |
|---|---|
| `AnimatedContent` | 默认 `once={false}`；ScrollTrigger 的 `onToggle` 里 `restart()` / `pause(0)`，已经播完的不因一次 refresh 重播 |
| `FoldText` | `trigger="scroll"` 时按 `onToggle` 重放整套翻折 timeline |
| `StrokeText` | 同上，重新进入视口时从 0 重描 |
| `CountUp` | IntersectionObserver 常驻，重新进入时先把值复位再数一遍（离开不清零，避免边界抖动误判） |
| `Hero` 视差 | 本来就是 scrub 绑定，天然可循环 |

### 区块视差（`useSectionDepth`）

- `[data-depth-bg]`：区块背景层，贴边时放大到 1.09、居中时还原 —— 背景像退到更远的一层；
- `[data-depth]`：内容层，整段通过视口时纵向漂移 ±4% 视口高度，比页面滚动略快；
- 位移量全部按 `innerHeight` 换算并在 resize 时重算，超宽屏 / 小屏 / 横屏表现一致；
- Hero 的标题另有独立视差，`Graphic` 因内部有 sticky 列表只做背景层。

## 性能策略

### 设备分档（`src/hooks/usePerfTier.ts`）

| 信号 | 结果 |
|---|---|
| `?perf=lite` / `?perf=full` | 强制分档（便于验收与分享低配链接） |
| `prefers-reduced-motion: reduce` | lite |
| `connection.saveData` | lite |
| 拿不到 WebGL2 / 跑在软件渲染（SwiftShader、llvmpipe）| lite |
| `deviceMemory <= 1` 或 `hardwareConcurrency <= 1` | lite |

> 判定收口在 `src/lib/capability.ts`，主判据是「这台设备到底能不能画」。
> **刻意不按核心数判**：Android WebView 常低报（实测 vivo 报 2 核，实际 8 核 + Mali-G1-Ultra），
> 按核心数判会把整批中端机误杀，动效全没。
> 也不按网络状态判：动效是本地 GPU 计算，不吃流量。`?diag=1` 可看当前判定与理由。

`lite` 下的降级清单：

- 不挂任何 WebGL：GhostFibers / ColorBends / Dither / LineWaves / RippleGrid / CircularGallery 全部退到 CSS 网格 + 辉光兜底；
- 海报轮播退化成 `Gallery` 静态网格（20 张全在），营销海报退化成 15 张 9:16 网格（仍可点开大图）；
- 关闭 Lenis 平滑滚动与两层视差，交回原生滚动；
- 跑马灯退回静态两行，`DepthCarousel` 关闭自动轮播；
- `AnimatedContent` / `FoldText` 等仍保留（纯 transform，开销低），`prefers-reduced-motion` 时它们也内置静态降级。

### 其它

- 移动端（≤768px）关闭装饰性 `data-parallax` 视差、取消 hover 缩放；
- 触屏设备关闭 `SpotlightCard` 的指针邻近感应，只保留焦点态；
- WebGL 组件统一 `React.lazy` + 接近视口才挂载，离开视口停帧；
- 仅动 `transform` / `opacity`，不触发重排；
- 懒加载图片不断改写文档高度，`useScrollTriggerRefresh()` 在 load / 字体就绪 / 若干延迟点重算触发点；
- 构建产物按 gsap / motion / i18n / lenis / 各 WebGL 组件分包，首屏 JS（gzip）约 132 KB 主包 + 按需块；
- 字体只取 latin 子集，中文走系统黑体栈，避免数 MB 的 webfont。

### 合成层约束（闪屏三次复发后定下的红线）

页面以前在手机上有过三轮「整片闪烁」，成因都是**合成层被反复重建**，不是帧率问题。
新增动效前先对照这几条：

1. 滚动循环里**只写 `transform` / `opacity`**。`filter`（哪怕只是 `brightness`）、`zIndex`、
   `clip-path`、`mask`、`background` 逐帧写都会重建合成层。
2. `[data-depth-bg]` **不能同时是 sticky 元素**——transform 会改 sticky 的包含块，
   粘性位置每帧重算。结构固定为「sticky 外壳 + 内部 `absolute inset-0` 视差层」。
3. `preserve-3d` 舞台里不放 `backdrop-filter`（会把父级强行 flatten 并每帧重采样背景）。
4. 全屏层不用 `mix-blend-mode`（整层与下方绑成合成组，滚动时每帧重新混合）。
5. 移动端（≤900px）关掉整屏 `mask-image`、噪点层、顶栏毛玻璃，`will-change` 交还浏览器；
   区块级视差只在非移动端跑。
6. 3D 卡组把视野外的卡片 `visibility: hidden`，减少同时存活的图层数。

---

## 验收脚本

```bash
node scripts/shot.mjs            # 桌面 1440×900，逐屏截图到 _shot/
node scripts/shot.mjs --mobile   # 移动端 390×844
```

会输出页面高度、图片加载统计（total / loaded / broken）、`<html lang>` 切换结果与控制台错误。
截图默认带 `reducedMotion: 'reduce'`，便于核对静态版式；需要看动效请直接开浏览器。
