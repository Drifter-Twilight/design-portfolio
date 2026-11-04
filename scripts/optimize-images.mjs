/**
 * 把 raw/works 下的原图批量转 WebP，输出到 public/works-opt。
 *
 *   npm run optimize:images             增量转换（产物更新则跳过）
 *   npm run optimize:images -- --force  全量重压
 *   npm run optimize:images -- --apply  转换完直接把 works.json 的路径切到 /works-opt/
 *
 * 参数取舍（实测自 1600×2848 的 PNG 海报）：
 *   q82 → 9.5×，q88 → 7.3×，q92 → 5.9×
 * 拿 800×700 的 100% 裁切做肉眼对比，q88 与原图无从分辨，故定 88。
 *
 * 只生成主图，不额外产 @480/@960 缩略图：前端的网格用固定 aspect-ratio 占位 +
 * 单图懒加载，多一套尺寸只会白占体积与仓库。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'raw', 'works');
const OUT = path.join(ROOT, 'public', 'works-opt');
const MANIFEST = path.join(ROOT, 'src', 'data', 'works.json');

const MAX_EDGE = 1600;
const QUALITY = 88;
const FORCE = process.argv.includes('--force');
const APPLY = process.argv.includes('--apply');

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('✗ 需要先安装 sharp：npm i -D sharp');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

if (!fs.existsSync(SRC)) {
  console.error(`✗ 找不到 ${SRC}，请先运行 npm run sync:assets`);
  process.exit(1);
}

const files = walk(SRC);
let before = 0;
let after = 0;
let skipped = 0;
let done = 0;

/**
 * 内容指纹缓存。
 *
 * 为什么不能只看「产物存在」：换图时通常保持同名（`海报A.jpg` → `海报A.webp`），
 * 产物 `works-opt/海报A.webp` 早就在，于是新图永远被跳过，线上仍是旧图。
 * 为什么不能看 mtime：sync:assets 每次都重建 raw/works，mtime 全部变成当前时间，
 * 会导致每次发布都全量重压（139 张，两分钟起步）。
 * 折中：取 size + 头尾各 128 KB 做散列，换过内容才重压。
 */
const CACHE_FILE = path.join(ROOT, 'raw', '.optimize-cache.json');
let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
} catch {
  cache = {};
}

function fingerprint(file) {
  const size = fs.statSync(file).size;
  const span = 131072;
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(Math.min(span, size));
  fs.readSync(fd, head, 0, head.length, 0);
  let tail = Buffer.alloc(0);
  if (size > head.length) {
    const tailLen = Math.min(span, size - head.length);
    tail = Buffer.alloc(tailLen);
    fs.readSync(fd, tail, 0, tailLen, size - tailLen);
  }
  fs.closeSync(fd);
  return crypto.createHash('md5').update(String(size)).update(head).update(tail).digest('hex');
}

console.log(`→ ${files.length} 张待处理（最长边 ${MAX_EDGE}px / WebP q${QUALITY}）`);

for (const file of files) {
  const rel = path.relative(SRC, file);
  const dest = path.join(OUT, rel.replace(/\.(png|jpe?g|webp)$/i, '.webp'));
  before += fs.statSync(file).size;

  const stamp = fingerprint(file);
  const fresh =
    !FORCE && cache[rel] === stamp && fs.existsSync(dest) && fs.statSync(dest).size > 0;

  if (fresh) {
    after += fs.statSync(dest).size;
    skipped += 1;
    continue;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const meta = await sharp(file).metadata();
  // 长边约束。旧写法只给 width，竖图的高度不受限：实测海报被压成 1600×2866，
  // 单张解码后 ~18 MB 位图，20 张一起进 GPU 纹理就是几百 MB，移动端直接丢层。
  await sharp(file)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(dest);

  cache[rel] = stamp;
  after += fs.statSync(dest).size;
  done += 1;
  if (done % 20 === 0) console.log(`  ${done} 张已转换…`);
}

try {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
} catch {
  console.warn('! 指纹缓存写入失败，下次会全量重压');
}

const mb = (n) => (n / 1048576).toFixed(1);
console.log('');
console.log(`✓ 转换完成：新转 ${done} 张，跳过 ${skipped} 张`);
console.log(`  ${mb(before)} MB → ${mb(after)} MB（${(before / Math.max(after, 1)).toFixed(1)}× 压缩）`);

if (APPLY) {
  const raw = fs.readFileSync(MANIFEST, 'utf8');
  const next = raw
    .replaceAll('"/works/', '"/works-opt/')
    .replace(/(\/works-opt\/[^"]*)\.(png|jpe?g)"/g, '$1.webp"');
  const changed = raw !== next;
  if (changed) fs.writeFileSync(MANIFEST, next, 'utf8');
  console.log(`✓ works.json ${changed ? '已切换到 /works-opt/' : '无需改动'}`);
}
