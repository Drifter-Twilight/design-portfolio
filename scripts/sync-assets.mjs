/**
 * 素材同步流水线
 * 从 E:\作品集 读取全部作品，复制到 public/works 下并生成 ASCII 路径，
 * 同时读取每张图的真实像素宽高，输出 src/data/works.json。
 *
 * 原素材目录只读，不做任何修改。
 * 运行：npm run sync:assets
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = process.env.WORKS_SRC || 'E:\\作品集';
// 原图副本放在 public 之外：它只给 optimize:images 当输入，
// 留在 public 里会被 vite 原样拷进 dist，白白多 300MB。
const OUT_ROOT = path.join(PROJECT_ROOT, 'raw', 'works');
const PREVIEW_ROOT = path.join(PROJECT_ROOT, 'public', 'preview');
const MANIFEST = path.join(PROJECT_ROOT, 'src', 'data', 'works.json');

/* ------------------------------------------------------------------ */
/* 工具                                                               */
/* ------------------------------------------------------------------ */

const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

const isImage = (f) => IMG_EXT.has(path.extname(f).toLowerCase());

/** 自然排序：海报2 < 海报10 */
const naturalCompare = (a, b) =>
  a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' });

/** 从文件名里抽取用于排序的序号 */
function orderOf(filename) {
  const paren = /\((\d+)\)/.exec(filename);
  if (paren) return Number(paren[1]);
  const trailing = /(\d+)\D*$/.exec(filename);
  if (trailing) return Number(trailing[1]);
  const any = /(\d+)/.exec(filename);
  if (any) return Number(any[1]);
  return 0;
}

function listImages(dir, recursive = false) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && recursive) walk(full);
      else if (entry.isFile() && isImage(entry.name)) out.push(full);
    }
  };
  walk(dir);
  return out.sort((a, b) => naturalCompare(path.basename(a), path.basename(b)));
}

/** 极简 PNG / JPEG 尺寸读取，避免为一份清单引入 sharp */
function readImageSize(file) {
  const buf = fs.readFileSync(file);
  // PNG
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // JPEG
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) {
        off += 1;
        continue;
      }
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      // SOF0..SOF15，排除 DHT(C4) DNL(C8) DAC(CC)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) };
      }
      off += 2 + len;
    }
  }
  // WebP
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = buf.toString('ascii', 12, 16);
    if (fmt === 'VP8X') return { w: (buf.readUIntLE(24, 3) & 0xffffff) + 1, h: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (fmt === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (fmt === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return { w: 0, h: 0 };
}

/** 复制 + 记录尺寸，返回可直接用于 <img src> 的路径 */
let copied = 0;
let bytes = 0;
function emit(srcFile, relPath) {
  const dest = path.join(OUT_ROOT, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(srcFile, dest);
  copied += 1;
  bytes += fs.statSync(srcFile).size;
  const { w, h } = readImageSize(srcFile);
  return {
    src: `/works/${relPath.split(path.sep).join('/')}`,
    w,
    h,
  };
}

/**
 * 生成轻量副本：长边压到 maxEdge，webp q82。
 * 海报 20 张要同时进 GPU 当纹理，图标 5 张要铺在整块卡片上，原图直传会吃光显存。
 */
async function emitCard(srcFile, relPath, maxEdge = 1200) {
  const dest = path.join(PREVIEW_ROOT, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const meta = await sharp(srcFile).metadata();
  const scale = Math.min(1, maxEdge / Math.max(meta.width || 1, meta.height || 1));
  const w = Math.max(1, Math.round((meta.width || 1) * scale));
  const h = Math.max(1, Math.round((meta.height || 1) * scale));
  await sharp(srcFile).rotate().resize(w, h, { fit: 'fill' }).webp({ quality: 82 }).toFile(dest);
  return { src: `/preview/${relPath.split(path.sep).join('/')}`, w, h };
}

/* ------------------------------------------------------------------ */
/* 命名映射                                                            */
/* ------------------------------------------------------------------ */

/** 排序权重：数字越小越靠前，保证 Logo 先行、规范随后、应用落地 */
const VI_ORDER = [
  'logo',
  'logo释义',
  '色彩与字体规范总览',
  '色彩与字体规范',
  '辅助图形纹样',
  '色彩与辅助图形',
  '包装设计',
  '包装盒设计',
  '袋装设计',
  '礼盒包装设计',
  '礼盒包装',
  '产品全家福设计',
  '单品设计',
  '名片设计',
  '名片与办公文具',
  '网页设计',
  '营销封面设计',
  '营销海报',
];

const VI_SERIES = {
  山岚茶事: { slug: 'shanlan-tea', zh: '山岚茶事', en: 'Shanlan Tea' },
  栖屿: { slug: 'qiyu', zh: '栖屿', en: 'Qiyu' },
  麦野晨光: { slug: 'maiye-dawn', zh: '麦野晨光', en: 'Wheatfield Dawn' },
};

/** VI 三套的展示顺序 */
const VI_SEQUENCE = ['山岚茶事', '栖屿', '麦野晨光'];

const viRank = (base) => {
  const idx = VI_ORDER.indexOf(base);
  return idx === -1 ? VI_ORDER.length : idx;
};

const VI_IMAGE_LABELS = {
  logo: { zh: 'Logo', en: 'Logo' },
  logo释义: { zh: 'Logo 释义', en: 'Logo Rationale' },
  包装设计: { zh: '包装设计', en: 'Packaging' },
  名片设计: { zh: '名片设计', en: 'Business Card' },
  网页设计: { zh: '网页设计', en: 'Web Design' },
  色彩与字体规范: { zh: '色彩与字体规范', en: 'Color & Type Spec' },
  袋装设计: { zh: '袋装设计', en: 'Pouch Design' },
  产品全家福设计: { zh: '产品全家福', en: 'Product Family' },
  单品设计: { zh: '单品设计', en: 'Single Product' },
  礼盒包装设计: { zh: '礼盒包装', en: 'Gift Box' },
  色彩与辅助图形: { zh: '色彩与辅助图形', en: 'Color & Aux Graphics' },
  营销封面设计: { zh: '营销封面', en: 'Campaign Cover' },
  营销海报: { zh: '营销海报', en: 'Campaign Poster' },
  包装盒设计: { zh: '包装盒设计', en: 'Box Packaging' },
  名片与办公文具: { zh: '名片与办公文具', en: 'Stationery' },
  礼盒包装: { zh: '礼盒包装', en: 'Gift Box' },
  色彩与字体规范总览: { zh: '色彩与字体总览', en: 'Color & Type Overview' },
  辅助图形纹样: { zh: '辅助图形纹样', en: 'Aux Pattern' },
};

const PRODUCT_SERIES = {
  双面提花羊绒盖毯: { slug: 'cashmere-throw', zh: '双面提花羊绒盖毯', en: 'Jacquard Cashmere Throw' },
  手作窑变陶瓷茶具: { slug: 'kiln-tea-set', zh: '手作窑变陶瓷茶具', en: 'Kiln-glazed Tea Set' },
  晨雾手冲咖啡礼盒: { slug: 'coffee-gift-set', zh: '晨雾手冲咖啡礼盒', en: 'Morning Mist Coffee Set' },
  白麝香香氛蜡烛: { slug: 'musk-candle', zh: '白麝香香氛蜡烛', en: 'White Musk Candle' },
  磁吸三合一无线充电站: { slug: 'magsafe-charger', zh: '磁吸三合一无线充电站', en: '3-in-1 Magnetic Charger' },
};

const SHOT_LABELS = [
  ['首图', { zh: '首图', en: 'Hero Shot' }],
  ['白底图', { zh: '白底图', en: 'White Background' }],
  ['场景卖点图', { zh: '场景卖点', en: 'Lifestyle' }],
  ['细节材质图', { zh: '细节材质', en: 'Detail & Material' }],
  ['尺寸规格图', { zh: '尺寸规格', en: 'Spec & Size' }],
  ['礼盒信任图', { zh: '礼盒信任', en: 'Gift & Trust' }],
  ['香调规格图', { zh: '香调规格', en: 'Scent & Spec' }],
];

/** 部分套图文件名是英文提示词原文，按关键词兜底识别 */
const SHOT_KEYWORDS = [
  [['white background', 'pure white rgb'], { zh: '白底图', en: 'White Background' }],
  [['lifestyle', 'bedside'], { zh: '场景卖点', en: 'Lifestyle' }],
  [['detail', 'macro'], { zh: '细节材质', en: 'Detail & Material' }],
  [['dimension', 'top-down', 'side-view'], { zh: '尺寸规格', en: 'Spec & Size' }],
  [['gift', 'trust'], { zh: '礼盒信任', en: 'Gift & Trust' }],
];

/** 套图的展示顺序：首图先行，其余按信息层级递进 */
const SHOT_ORDER = ['首图', '场景卖点', '细节材质', '尺寸规格', '香调规格', '礼盒信任', '白底图', '套图'];

const COMPOSITE_SERIES = {
  '日化护肤-1': { slug: 'skincare-02', zh: '日化护肤 Ⅱ', en: 'Skincare II' },
  日化护肤: { slug: 'skincare-01', zh: '日化护肤', en: 'Skincare' },
  粽子: { slug: 'zongzi', zh: '粽子', en: 'Zongzi' },
  蓝牙耳机: { slug: 'earbuds', zh: '蓝牙耳机', en: 'Earbuds' },
  香薰蜡烛: { slug: 'aroma-candle', zh: '香薰蜡烛', en: 'Aroma Candle' },
};

const CAMPAIGN_GROUPS = {
  日化类: { slug: 'beauty', zh: '日化', en: 'Skincare' },
  服饰类: { slug: 'apparel', zh: '服饰', en: 'Apparel' },
  食品类: { slug: 'food', zh: '食品', en: 'Food' },
};

const pad = (n) => String(n).padStart(2, '0');
const alt = (parts) => ({
  zh: parts.filter(Boolean).join(' · '),
  en: parts.filter(Boolean).join(' · '),
});

/* ------------------------------------------------------------------ */
/* 采集                                                               */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(SRC_ROOT)) {
  console.error(`✗ 找不到素材目录：${SRC_ROOT}`);
  process.exit(1);
}
// 先清空输出目录，避免旧文件残留（例如海报从 .png 换成 .jpg）。
// 某些受管环境会拦截批量删除，删除失败时继续执行：copyFile 会覆盖同名文件。
if (fs.existsSync(OUT_ROOT)) {
  try {
    fs.rmSync(OUT_ROOT, { recursive: true, force: true });
  } catch (error) {
    console.warn(`! 输出目录未能清空（${error?.code ?? 'ERROR'}），继续覆盖写入`);
  }
}
fs.mkdirSync(OUT_ROOT, { recursive: true });

const data = {
  generatedAt: new Date().toISOString(),
  source: SRC_ROOT,
  graphic: { vi: [], poster: [], icon: [] },
  commerce: { product: [], campaign: [], composite: [], banner: [] },
};

/* --- 平面设计 / VI --- */
const viRoot = path.join(SRC_ROOT, '平面设计', 'VI设计');
const viDirNames = fs
  .readdirSync(viRoot)
  .filter((n) => fs.statSync(path.join(viRoot, n)).isDirectory())
  .sort((a, b) => {
    const ia = VI_SEQUENCE.indexOf(a);
    const ib = VI_SEQUENCE.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

for (const setName of viDirNames) {
  const dir = path.join(viRoot, setName);
  const meta = VI_SERIES[setName] || { slug: `vi-${data.graphic.vi.length + 1}`, zh: setName, en: setName };
  const files = listImages(dir).sort((a, b) => {
    const ra = viRank(path.basename(a, path.extname(a)));
    const rb = viRank(path.basename(b, path.extname(b)));
    if (ra !== rb) return ra - rb;
    return naturalCompare(path.basename(a), path.basename(b));
  });
  const images = files.map((file, i) => {
    const base = path.basename(file, path.extname(file));
    const label = VI_IMAGE_LABELS[base] || { zh: base, en: `Plate ${pad(i + 1)}` };
    const shot = emit(file, path.join('graphic', 'vi', meta.slug, `${meta.slug}-${pad(i + 1)}${path.extname(file).toLowerCase()}`));
    return { ...shot, id: `${meta.slug}-${pad(i + 1)}`, label, alt: alt([meta.zh, label.zh]) };
  });
  data.graphic.vi.push({ id: meta.slug, title: { zh: meta.zh, en: meta.en }, images });
}

/* --- 平面设计 / 艺术海报 --- */

/**
 * 展示顺序 = 素材改名前的顺序（按文件字节大小离线核对，与旧副本一一对应）。
 * 新增海报追加到数组末尾即可；不在数组里的文件会按文件名自然排序补在后面。
 */
const POSTER_SEQUENCE = [
  '粗野主义·广州塔.jpg',
  '粗野主义·马赛公寓.jpg',
  'Y2K·金属梦境.png',
  'Y2K·数码花园.png',
  '半色调·声音颗粒.png',
  '复古拼贴·未归档.png',
  '巴洛克·过剩光影.png',
  '侘寂风·寂处有声.png',
  '禅意风·听雨留白.png',
  '新中式·秋谷归航.png',
  '故障艺术·流动夜.png',
  '故障艺术·数据意识.png',
  '先锋主义·日破苍山.png',
  '先锋主义+Halftone技法·中国结.png',
  '柔感Halftone·桃花.png',
  '超现实拼贴·理性睡着.png',
  '波普风·砰然炸裂.png',
  '波普风·塑料花园.png',
  '穆夏风·春之信使.png',
  '新艺术·星月湖.png',
];

const posterRoot = path.join(SRC_ROOT, '平面设计', '艺术设计海报');
const posterFiles = listImages(posterRoot).sort((a, b) => {
  const ia = POSTER_SEQUENCE.indexOf(path.basename(a));
  const ib = POSTER_SEQUENCE.indexOf(path.basename(b));
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  return naturalCompare(path.basename(a), path.basename(b));
});

for (const [i, file] of posterFiles.entries()) {
  const n = pad(i + 1);
  const name = path.basename(file, path.extname(file));
  const shot = emit(file, path.join('graphic', 'poster', `poster-${n}${path.extname(file).toLowerCase()}`));
  const card = await emitCard(file, path.join('poster', `poster-${n}.webp`), 1200);
  const label = { zh: name, en: name };
  data.graphic.poster.push({ ...shot, card, id: `poster-${n}`, label, alt: alt(['艺术海报', label.zh]) });
}

/* --- 平面设计 / Icon --- */

/**
 * 顺序 = 源目录从左到右（与页面既有 01–05 一一对应，改名后用文件字节大小核对过）。
 * 新增图标追加到数组末尾即可。
 */
const ICON_SEQUENCE = [
  '3D果冻·马卡龙UI.png',
  '现代3D·商务办公.png',
  '奶油风·气球膨胀.png',
  '体素风·像素游戏.png',
  '3D国潮·新春贺岁.png',
];

const iconRoot = path.join(SRC_ROOT, '平面设计', 'Icon图标');
const iconFiles = listImages(iconRoot).sort((a, b) => {
  const ia = ICON_SEQUENCE.indexOf(path.basename(a));
  const ib = ICON_SEQUENCE.indexOf(path.basename(b));
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  return naturalCompare(path.basename(a), path.basename(b));
});

for (const [i, file] of iconFiles.entries()) {
  const n = pad(i + 1);
  const name = path.basename(file, path.extname(file));
  const shot = emit(file, path.join('graphic', 'icon', `icon-set-${n}${path.extname(file).toLowerCase()}`));
  const card = await emitCard(file, path.join('icon', `icon-set-${n}.webp`), 1600);
  const label = { zh: name, en: name };
  data.graphic.icon.push({ ...shot, card, id: `icon-${n}`, label, alt: alt(['Icon 图标', label.zh]) });
}

/* --- 电商设计 / 商品套图 + 详情页 --- */
const productRoot = path.join(SRC_ROOT, '电商设计', '商品套图+详情页');
for (const setName of fs.readdirSync(productRoot).sort(naturalCompare)) {
  const dir = path.join(productRoot, setName);
  if (!fs.statSync(dir).isDirectory()) continue;
  const meta = PRODUCT_SERIES[setName] || { slug: `product-${data.commerce.product.length + 1}`, zh: setName, en: setName };

  const shotsDir = path.join(dir, '商品套图');
  const shotEntries = listImages(shotsDir)
    .sort((a, b) => orderOf(path.basename(a)) - orderOf(path.basename(b)))
    .map((file) => {
      const base = path.basename(file, path.extname(file));
      const lower = base.toLowerCase();
      let label = SHOT_LABELS.find(([key]) => base.includes(key))?.[1];
      if (!label) label = SHOT_KEYWORDS.find(([keys]) => keys.some((k) => lower.includes(k)))?.[1];
      return { file, label };
    });

  // 通篇英文提示词命名的套图没有“首图”字样时，把第一张未识别的升格为首图
  if (!shotEntries.some((e) => e.label?.zh === '首图')) {
    const first = shotEntries.findIndex((e) => !e.label);
    if (first >= 0) shotEntries[first].label = { zh: '首图', en: 'Hero Shot' };
  }

  shotEntries.sort((a, b) => {
    const ra = a.label ? SHOT_ORDER.indexOf(a.label.zh) : 99;
    const rb = b.label ? SHOT_ORDER.indexOf(b.label.zh) : 99;
    return ra - rb;
  });

  const shots = shotEntries.map(({ file, label: matched }, i) => {
    const n = pad(i + 1);
    const label = matched ?? { zh: `套图 ${n}`, en: `Shot ${n}` };
    const out = emit(file, path.join('commerce', 'product', meta.slug, 'shots', `${meta.slug}-shot-${n}${path.extname(file).toLowerCase()}`));
    return { ...out, id: `${meta.slug}-shot-${n}`, label, alt: alt([meta.zh, label.zh]) };
  });

  const detailDir = path.join(dir, '详情页');
  const detailFiles = listImages(detailDir).sort((a, b) => orderOf(path.basename(a)) - orderOf(path.basename(b)));
  const details = detailFiles.map((file, i) => {
    const n = pad(i + 1);
    const out = emit(file, path.join('commerce', 'product', meta.slug, 'detail', `${meta.slug}-detail-${n}${path.extname(file).toLowerCase()}`));
    const label = { zh: `详情页 ${n}`, en: `Detail ${n}` };
    return { ...out, id: `${meta.slug}-detail-${n}`, label, alt: alt([meta.zh, '详情页', n]) };
  });

  data.commerce.product.push({
    id: meta.slug,
    title: { zh: meta.zh, en: meta.en },
    cover: shots[0] ?? details[0],
    shots,
    details,
  });
}

/* --- 电商设计 / 营销海报 --- */
const campaignRoot = path.join(SRC_ROOT, '电商设计', '营销海报');
for (const groupName of fs.readdirSync(campaignRoot).sort(naturalCompare)) {
  const dir = path.join(campaignRoot, groupName);
  if (!fs.statSync(dir).isDirectory()) continue;
  const meta = CAMPAIGN_GROUPS[groupName] || { slug: `group-${data.commerce.campaign.length + 1}`, zh: groupName, en: groupName };
  const images = listImages(dir).map((file, i) => {
    const base = path.basename(file, path.extname(file));
    const n = pad(i + 1);
    const rawTitle = base.includes('-') ? base.split('-').slice(1).join('-') : base;
    const label = { zh: rawTitle, en: `${meta.en} · ${n}` };
    const out = emit(file, path.join('commerce', 'campaign', meta.slug, `${meta.slug}-${n}${path.extname(file).toLowerCase()}`));
    return { ...out, id: `${meta.slug}-${n}`, label, alt: alt(['营销海报', meta.zh, rawTitle]) };
  });
  data.commerce.campaign.push({ id: meta.slug, title: { zh: meta.zh, en: meta.en }, images });
}

/* --- 电商设计 / 产品溶图 --- */
const compositeRoot = path.join(SRC_ROOT, '电商设计', '产品溶图');
for (const setName of fs.readdirSync(compositeRoot).sort(naturalCompare)) {
  const dir = path.join(compositeRoot, setName);
  if (!fs.statSync(dir).isDirectory()) continue;
  const meta = COMPOSITE_SERIES[setName] || { slug: `composite-${data.commerce.composite.length + 1}`, zh: setName, en: setName };
  const files = listImages(dir);
  const pick = (keyword) => files.find((f) => path.basename(f).includes(keyword));
  const sceneFile = pick('场景');
  const blendFile = pick('溶图');
  const build = (file, kind, label) => {
    if (!file) return null;
    const ext = path.extname(file).toLowerCase();
    const out = emit(file, path.join('commerce', 'composite', meta.slug, `${meta.slug}-${kind}${ext}`));
    return { ...out, id: `${meta.slug}-${kind}`, label, alt: alt([meta.zh, label.zh]) };
  };
  const scene = build(sceneFile, 'scene', { zh: '场景图', en: 'Scene' });
  const blend = build(blendFile, 'blend', { zh: '融合图', en: 'Composite' });
  data.commerce.composite.push({ id: meta.slug, title: { zh: meta.zh, en: meta.en }, scene, blend });
}

/* --- 电商设计 / Banner --- */
for (const [i, file] of listImages(path.join(SRC_ROOT, '电商设计', 'Banner')).entries()) {
  const n = pad(i + 1);
  const out = emit(file, path.join('commerce', 'banner', `banner-${n}${path.extname(file).toLowerCase()}`));
  // Depth Carousel 一次会挂 10 张横幅，原图单张 5.8 MB，必须给轻量副本
  const card = await emitCard(file, path.join('commerce', 'banner', `banner-${n}.webp`), 1400);
  const label = { zh: `Banner ${n}`, en: `Banner ${n}` };
  data.commerce.banner.push({ ...out, card, id: `banner-${n}`, label, alt: alt(['电商 Banner', label.zh]) });
}

/* ------------------------------------------------------------------ */
/* 汇总                                                               */
/* ------------------------------------------------------------------ */

const sum = (arr, key) => arr.reduce((acc, s) => acc + (key ? s[key].length : 1), 0);
data.counts = {
  viSets: data.graphic.vi.length,
  viImages: sum(data.graphic.vi, 'images'),
  poster: data.graphic.poster.length,
  icon: data.graphic.icon.length,
  productSets: data.commerce.product.length,
  productShots: sum(data.commerce.product, 'shots'),
  productDetails: sum(data.commerce.product, 'details'),
  campaign: data.commerce.campaign.reduce((a, g) => a + g.images.length, 0),
  composite: data.commerce.composite.length,
  banner: data.commerce.banner.length,
};
data.counts.total =
  data.counts.viImages +
  data.counts.poster +
  data.counts.icon +
  data.counts.productShots +
  data.counts.productDetails +
  data.counts.campaign +
  data.counts.composite * 2 +
  data.counts.banner;

fs.writeFileSync(MANIFEST, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log('✓ 素材同步完成');
console.log(`  源目录  ${SRC_ROOT}`);
console.log(`  复制    ${copied} 个文件 / ${(bytes / 1048576).toFixed(1)} MB`);
console.log(`  清单    src/data/works.json`);
console.table(data.counts);
