/**
 * 视觉验收脚本：用系统 Edge 打开各区块截图，并收集控制台错误。
 * 运行：node scripts/shot.mjs [--mobile]
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.resolve('_shot');
fs.mkdirSync(OUT, { recursive: true });

const MOBILE = process.argv.includes('--mobile');
const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';

const viewport = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  isMobile: MOBILE,
  hasTouch: MOBILE,
  reducedMotion: 'reduce', // 截静态完成态，便于核对版式
});

const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1200);

const suffix = MOBILE ? '-m' : '';

/** 整页高度 */
const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`page height: ${fullHeight}px`);

// 分屏截图：每屏滚动一屏，最多 12 屏
const step = viewport.height;
const shots = Math.min(16, Math.ceil(fullHeight / step));

for (let i = 0; i < shots; i++) {
  const y = i * step;
  // 先滚到上一屏预热，再落到目标位，让懒加载有机会排队
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), Math.max(0, y - step));
  await page.waitForTimeout(600);
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(2400);
  const file = path.join(OUT, `auto${suffix}-${String(i).padStart(2, '0')}.png`);
  await page.screenshot({ path: file });
  console.log(`shot ${String(i).padStart(2, '0')} -> y=${y}`);
}

// 语言切换验证
const zhTitle = await page.evaluate(() => document.documentElement.lang);
console.log(`html lang (initial): ${zhTitle}`);

await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
const enBtn = page.locator('button[lang="en"]').first();
if (await enBtn.count()) {
  await enBtn.click();
  await page.waitForTimeout(700);
  const langAfter = await page.evaluate(() => document.documentElement.lang);
  console.log(`html lang (after EN): ${langAfter}`);
  await page.screenshot({ path: path.join(OUT, `lang-en${suffix}.png`) });
  await page.locator('button[lang="zh-CN"]').first().click();
  await page.waitForTimeout(500);
  console.log(`html lang (back to ZH): ${await page.evaluate(() => document.documentElement.lang)}`);
}

// 图片加载统计
const imgStats = await page.evaluate(() => {
  const imgs = Array.from(document.images);
  return {
    total: imgs.length,
    loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
  };
});
console.log(`images: ${JSON.stringify(imgStats)}`);

if (errors.length) {
  console.log('\n--- console errors ---');
  errors.slice(0, 20).forEach((e) => console.log(e));
} else {
  console.log('\nno console errors');
}

await browser.close();
