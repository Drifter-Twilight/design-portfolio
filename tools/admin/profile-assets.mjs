/**
 * 头像 / 简历图的统一处理。
 *
 * 管理界面的「替换图片」与命令行
 *   node tools/admin/profile-assets.mjs resume <图片路径>
 * 走的是同一条路径：长边约束 → WebP q88 → 写 public/profile → 记录宽高与内容指纹。
 *
 * 为什么必须记宽高：页面靠它给图片一个确定的占位比例。比例对不上，
 * 图片加载完的瞬间容器会跳一下，看起来就是「闪」。
 *
 * 为什么要留 v（内容指纹）：文件名是固定的 `resume.webp`，换图后
 * 浏览器和 GitHub Pages 的缓存都可能还拿旧图。URL 带指纹才能一变就重新拉，
 * 也不会出现同一次访问里新旧混用。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const PROFILE_DIR = path.join(ROOT, 'public', 'profile');
export const MEDIA_JSON = path.join(ROOT, 'src', 'data', 'profile-media.json');

/**
 * 两个槽位。
 * 简历要能看清正文，长边给 1600；照片在关于页与首屏都是小图，
 * 1600 已经远超实际显示尺寸（2× 屏约 800 就够），再大只是白占体积。
 */
export const SLOTS = {
  photo: { file: 'portrait.webp', maxEdge: 1600, label: '个人照片' },
  resume: { file: 'resume.webp', maxEdge: 1600, label: '简历' },
};

export function readMedia() {
  try {
    return JSON.parse(fs.readFileSync(MEDIA_JSON, 'utf8'));
  } catch {
    return {};
  }
}

/** 接一张图，压好、落盘、记一笔，返回这条记录 */
export async function storeImage(slot, buffer) {
  const cfg = SLOTS[slot];
  if (!cfg) throw new Error(`未知的槽位：${slot}`);

  const probe = await sharp(buffer).metadata();
  if (!probe.width || !probe.height) throw new Error('读不出图片尺寸，文件可能已损坏');

  const dest = path.join(PROFILE_DIR, cfg.file);
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  // 长边约束必须同时给 width 与 height，只给 width 的话竖图不会被缩
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: cfg.maxEdge, height: cfg.maxEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, effort: 5 })
    .toFile(dest);

  const hash = crypto.createHash('md5').update(fs.readFileSync(dest)).digest('hex').slice(0, 8);
  const media = readMedia();
  media[slot] = {
    src: `/profile/${cfg.file}`,
    w: out.width,
    h: out.height,
    v: hash,
    bytes: out.size,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(MEDIA_JSON), { recursive: true });
  fs.writeFileSync(MEDIA_JSON, `${JSON.stringify(media, null, 2)}\n`, 'utf8');
  return media[slot];
}

/** 给界面用的状态：文件在不在、多大、多少像素、指纹是什么 */
export function listSlots() {
  const media = readMedia();
  return Object.entries(SLOTS).map(([slot, cfg]) => {
    const file = path.join(PROFILE_DIR, cfg.file);
    const exists = fs.existsSync(file);
    const item = media[slot] ?? null;
    return {
      slot,
      label: cfg.label,
      file: cfg.file,
      maxEdge: cfg.maxEdge,
      exists,
      bytes: exists ? fs.statSync(file).size : 0,
      w: item?.w ?? null,
      h: item?.h ?? null,
      v: item?.v ?? null,
      updatedAt: item?.updatedAt ?? null,
    };
  });
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('profile-assets.mjs');
if (invokedDirectly) {
  const [, , slot, src] = process.argv;
  if (!SLOTS[slot] || !src) {
    console.error('用法：node tools/admin/profile-assets.mjs <photo|resume> <图片路径>');
    process.exit(1);
  }
  const record = await storeImage(slot, fs.readFileSync(src));
  console.log(
    `✓ ${SLOTS[slot].label} 已更新：${record.w}×${record.h} / ${(record.bytes / 1024).toFixed(0)} KB / v=${record.v}`,
  );
}
