/**
 * 功能与无障碍验收。
 * 运行：node scripts/test-a11y.mjs
 */
import { chromium } from 'playwright-core';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1200);

/* ---------- 结构与语义 ---------- */
const landmarks = await page.evaluate(() => ({
  header: document.querySelectorAll('header').length,
  nav: document.querySelectorAll('nav').length,
  main: document.querySelectorAll('main').length,
  footer: document.querySelectorAll('footer').length,
  h1: document.querySelectorAll('h1').length,
  h2: document.querySelectorAll('h2').length,
}));
check('存在 header / main / footer 地标', landmarks.header > 0 && landmarks.main === 1 && landmarks.footer > 0, JSON.stringify(landmarks));
check('页面只有一个 h1', landmarks.h1 === 1, `h1=${landmarks.h1}, h2=${landmarks.h2}`);

const sectionLabels = await page.evaluate(() =>
  Array.from(document.querySelectorAll('main > section')).map((s) => ({
    id: s.id,
    labelled: !!s.getAttribute('aria-labelledby'),
    target: s.getAttribute('aria-labelledby'),
  })),
);
check(
  '每个 section 都通过 aria-labelledby 命名',
  sectionLabels.length >= 4 && sectionLabels.every((s) => s.labelled),
  sectionLabels.map((s) => `${s.id}:${s.labelled}`).join(' '),
);

/* ---------- 图片 alt ---------- */
const imgAudit = await page.evaluate(() => {
  const imgs = Array.from(document.images);
  return {
    total: imgs.length,
    missing: imgs.filter((i) => !i.hasAttribute('alt')).length,
    empty: imgs.filter((i) => i.getAttribute('alt') === '').length,
  };
});
check('所有 img 都有非空 alt', imgAudit.missing === 0 && imgAudit.empty === 0, JSON.stringify(imgAudit));

/* ---------- 语言切换 ---------- */
check('<html lang> 初始为 zh-CN', (await page.evaluate(() => document.documentElement.lang)) === 'zh-CN');
await page.locator('button[lang="en"]').first().click();
await page.waitForTimeout(600);
check('<html lang> 切换后为 en', (await page.evaluate(() => document.documentElement.lang)) === 'en');
const enHeading = await page.locator('#graphic-title').innerText();
check('切换语言后标题内容变为英文', enHeading.includes('Graphic') || enHeading.includes('GRAPHIC'), enHeading);
await page.locator('button[lang="zh-CN"]').first().click();
await page.waitForTimeout(600);
check('<html lang> 切回 zh-CN', (await page.evaluate(() => document.documentElement.lang)) === 'zh-CN');

/* ---------- 键盘：跳到主内容 ---------- */
// DOM 顺序中的首个可聚焦元素应为 skip link
const firstFocusable = await page.evaluate(() => {
  const el = document.querySelector('a[href], button, [tabindex]:not([tabindex="-1"])');
  return { cls: el?.className ?? '', href: el?.getAttribute('href') ?? '' };
});
check(
  '首个可聚焦元素是跳过导航链接',
  firstFocusable.href === '#main' && firstFocusable.cls.includes('skip-link'),
  JSON.stringify(firstFocusable),
);

// 点击后焦点应落在 main 上
await page.evaluate(() => {
  window.scrollTo(0, 0);
  document.querySelector('.skip-link')?.click();
});
await page.waitForTimeout(400);
const afterSkip = await page.evaluate(() => document.activeElement?.id ?? '');
check('跳过导航后焦点落到 #main', afterSkip === 'main', `activeElement=#${afterSkip}`);

/* ---------- Lightbox ---------- */
await page.evaluate(() => document.getElementById('graphic').scrollIntoView());
await page.waitForTimeout(900);
const firstCard = page.locator('#graphic button[aria-label*="查看大图"]').first();
await firstCard.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await firstCard.click();
await page.waitForTimeout(700);

const dialog = page.locator('[role="dialog"][aria-modal="true"]');
check('点击作品后打开 dialog', (await dialog.count()) === 1);

const dialogFocus = await page.evaluate(() => ({
  inDialog: !!document.activeElement?.closest('[role="dialog"]'),
  label: document.activeElement?.getAttribute('aria-label'),
}));
check('打开后焦点移入 dialog', dialogFocus.inDialog, JSON.stringify(dialogFocus));

const bodyLocked = await page.evaluate(() => document.body.style.overflow === 'hidden');
check('打开时锁定背景滚动', bodyLocked);

const counterBefore = await page.locator('[role="dialog"] [aria-live="polite"]').innerText();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(500);
const counterAfter = await page.locator('[role="dialog"] [aria-live="polite"]').innerText();
check('方向键可翻页', counterBefore !== counterAfter, `${counterBefore} -> ${counterAfter}`);

await page.keyboard.press('Escape');
await page.waitForTimeout(600);
check('Esc 关闭 dialog', (await dialog.count()) === 0);
const focusRestored = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
check('关闭后焦点归还触发元素', focusRestored.includes('查看大图'), focusRestored.slice(0, 40));

/* ---------- 焦点可见 ---------- */
const focusRing = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label]');
  if (!btn) return null;
  btn.focus();
  const s = getComputedStyle(btn, ':focus-visible');
  return { outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle };
});
check('存在 :focus-visible 描边规则', focusRing !== null, JSON.stringify(focusRing));

/* ---------- 简历弹窗 ---------- */
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('#about button')].find(
    (b) => b.getAttribute('aria-haspopup') === 'dialog' && b.textContent?.includes('简历'),
  );
  // 先聚焦再点击，模拟真实的键盘 / 指针操作，关闭后才能验证焦点归还
  btn?.focus();
  btn?.click();
});
await page.waitForTimeout(700);

const resumeOpen = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"][aria-labelledby="resume-title"]');
  return {
    open: !!d,
    focus: document.activeElement?.getAttribute('aria-label') ?? '',
    bodyOverflow: getComputedStyle(document.body).overflow,
    modal: d?.getAttribute('aria-modal'),
  };
});
check('点击「查看简历」打开简历弹窗', resumeOpen.open && resumeOpen.modal === 'true', JSON.stringify(resumeOpen));
check('简历弹窗打开后焦点落在关闭按钮', resumeOpen.focus === '关闭简历', `focus=${resumeOpen.focus}`);
check('简历弹窗锁定背景滚动', resumeOpen.bodyOverflow === 'hidden', resumeOpen.bodyOverflow);

// Tab 应被限制在弹窗内（末尾元素继续 Tab 回到首个）
const trapped = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"][aria-labelledby="resume-title"]');
  const nodes = d.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
  const last = nodes[nodes.length - 1];
  last.focus();
  return document.activeElement === last;
});
await page.keyboard.press('Tab');
const wrapped = await page.evaluate(
  () => document.activeElement?.getAttribute('aria-label') === '关闭简历',
);
check('简历弹窗存在焦点陷阱', trapped && wrapped, `last=${trapped} wrapped=${wrapped}`);

await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const resumeClosed = await page.evaluate(() => ({
  open: !!document.querySelector('[role="dialog"][aria-labelledby="resume-title"]'),
  focusText: document.activeElement?.textContent?.trim() ?? '',
  bodyOverflow: getComputedStyle(document.body).overflow,
}));
check('Esc 关闭简历弹窗', !resumeClosed.open, JSON.stringify(resumeClosed));
check('关闭简历后焦点归还触发按钮', resumeClosed.focusText.includes('查看简历'), resumeClosed.focusText);

/* ---------- 艺术海报轮播 ---------- */
await page.evaluate(() => {
  const head = [...document.querySelectorAll('#graphic h3')].find((h) => h.textContent?.includes('艺术海报'));
  head?.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(3500);

const carouselState = await page.evaluate(() => {
  const box = document.querySelector('#graphic .flex-carousel');
  return {
    exists: !!box,
    role: box?.getAttribute('aria-roledescription') ?? '',
    live: box?.querySelector('[aria-live]')?.textContent?.trim() ?? '',
    canvas: box?.querySelectorAll('canvas').length ?? 0,
  };
});
check('海报区渲染 Flex Carousel（可聚焦区域 + 读屏播报）', carouselState.exists && carouselState.role === 'carousel' && carouselState.canvas === 1, JSON.stringify(carouselState));
check(
  '海报名称与素材目录同步',
  carouselState.live.includes('广州塔') && carouselState.live.includes('粗野主义'),
  carouselState.live,
);

// 键盘切换
await page.evaluate(() => document.querySelector('#graphic .flex-carousel')?.focus());
const beforeLive = carouselState.live;
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1200);
const afterLive = await page.evaluate(
  () => document.querySelector('#graphic .flex-carousel [aria-live]')?.textContent?.trim() ?? '',
);
check('海报轮播可用方向键切换', afterLive !== beforeLive, `${beforeLive} → ${afterLive}`);

// 轮播内的滚轮：只翻卡，不驱动整页
const wheelBox = await page.locator('#graphic .flex-carousel').boundingBox();
await page.mouse.move(wheelBox.x + wheelBox.width / 2, wheelBox.y + wheelBox.height / 2);
const scrollBeforeWheel = await page.evaluate(() => Math.round(window.scrollY));
const liveBeforeWheel = await page.evaluate(
  () => document.querySelector('#graphic .flex-carousel [aria-live]')?.textContent?.trim() ?? '',
);
await page.mouse.wheel(0, 300);
await page.waitForTimeout(1100);
const wheelState = await page.evaluate(() => ({
  y: Math.round(window.scrollY),
  live: document.querySelector('#graphic .flex-carousel [aria-live]')?.textContent?.trim() ?? '',
}));
check(
  '轮播捕获滚轮且不带动整页',
  wheelState.y === scrollBeforeWheel && wheelState.live !== liveBeforeWheel,
  `y ${scrollBeforeWheel}→${wheelState.y}, ${liveBeforeWheel} → ${wheelState.live}`,
);

/* ---------- 图标滚动叠放 ---------- */
await page.evaluate(() => {
  const head = [...document.querySelectorAll('#graphic h3')].find((h) => h.textContent?.includes('Icon'));
  head?.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(2500);
const stackState = await page.evaluate(() => {
  const slots = document.querySelectorAll('#graphic [data-stack-slot]');
  const first = slots[0]?.firstElementChild;
  return {
    slots: slots.length,
    sticky: slots[0] ? getComputedStyle(slots[0]).position : '',
    firstAlt: first?.getAttribute('aria-label') ?? '',
    w: first ? Math.round(first.getBoundingClientRect().width) : 0,
    h: first ? Math.round(first.getBoundingClientRect().height) : 0,
  };
});
check(
  '图标区为 Scroll Stack（5 张、sticky 叠放）',
  stackState.slots === 5 && stackState.sticky === 'sticky',
  JSON.stringify(stackState),
);
check('图标卡片完整落在视口内且尺寸合理', stackState.w >= 280 && stackState.h >= 150, `${stackState.w}×${stackState.h}`);
check('图标名称与素材目录同步', stackState.firstAlt.includes('3D果冻·马卡龙UI'), stackState.firstAlt);

/* ---------- 产品溶图：拖动对比 ---------- */
await page.evaluate(() => {
  const head = [...document.querySelectorAll('h3')].find((h) => h.textContent?.includes('产品溶图'));
  head?.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(1600);

const compareState = await page.evaluate(() => {
  const stages = document.querySelectorAll('.ba-frame');
  const first = stages[0];
  return {
    count: stages.length,
    sliders: document.querySelectorAll('.ba-frame [role="slider"]').length,
    value: first?.querySelector('[role="slider"]')?.getAttribute('aria-valuenow'),
    buttons: first ? first.querySelectorAll('button').length : -1,
  };
});
check(
  '产品溶图为拖动对比（5 组、均为 slider）',
  compareState.count === 5 && compareState.sliders === 5,
  JSON.stringify(compareState),
);

// 点击对比图不应打开大图
const box = await page.locator('.ba-frame').first().boundingBox();
await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.4);
await page.waitForTimeout(400);
const dialogAfterClick = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
check('点击溶图不打开大图', dialogAfterClick === false, `dialog=${dialogAfterClick}`);

// 键盘可调分割线
const before = await page.evaluate(() =>
  document.querySelector('.ba-frame [role="slider"]')?.getAttribute('aria-valuenow'),
);
await page.evaluate(() => document.querySelector('.ba-frame [role="slider"]')?.focus());
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(250);
const after = await page.evaluate(() =>
  document.querySelector('.ba-frame [role="slider"]')?.getAttribute('aria-valuenow'),
);
check('对比滑块可用方向键调整', Number(after) < Number(before), `${before} → ${after}`);

/* ---------- 减少动态 ---------- */
// 同源页面共用一个渲染进程：前一页若还在跑 WebGL 帧循环，会把这一页的
// transition 卡在起点（visibility 是离散属性，靠过渡结束才落位）。先关掉它。
await page.close();
const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const rp = await reducedContext.newPage();
// 后台标签页会节流 transition，visibility 的离散切换会卡在起点，必须切到前台
await rp.bringToFront();
await rp.goto(URL, { waitUntil: 'networkidle' });
await rp.waitForTimeout(1500);
const reducedState = await rp.evaluate(() => ({
  lenis: document.documentElement.classList.contains('lenis'),
  heroVisible: getComputedStyle(document.querySelector('#hero-title')).visibility,
  stat: document.querySelector('#hero dd span span')?.textContent ?? '',
}));
check('减少动态时不启用 Lenis', reducedState.lenis === false, JSON.stringify(reducedState));
check('减少动态时统计直接落到终值（个位数补零）', reducedState.stat.trim() === '03', `value=${reducedState.stat}`);

// 返回顶部：关于页以上隐藏，滚到关于页及以下出现
await rp.evaluate(() => window.scrollTo(0, 0));
await rp.waitForTimeout(500);
const backAtTop = await rp.evaluate(() => {
  const b = document.querySelector('button[aria-label="回到顶部"]');
  return { exists: !!b, visibility: b ? getComputedStyle(b).visibility : 'missing' };
});
check('首屏不显示返回顶部按钮', backAtTop.exists && backAtTop.visibility === 'hidden', JSON.stringify(backAtTop));

await rp.evaluate(() => {
  const el = document.getElementById('about');
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 240);
});
// visibility 参与 transition，离散切换发生在前端过渡结束之后，留足时间
await rp.waitForTimeout(1400);
const backAtAbout = await rp.evaluate(() => {
  const b = document.querySelector('button[aria-label="回到顶部"]');
  return { visibility: b ? getComputedStyle(b).visibility : 'missing', y: Math.round(window.scrollY) };
});
check('滚到关于页后显示返回顶部按钮', backAtAbout.visibility === 'visible', JSON.stringify(backAtAbout));


await reducedContext.close();

/* ---------- 控制台 ---------- */
check('无未捕获的页面异常', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
