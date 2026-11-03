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

console.log(`→ ${files.length} 张待处理（最长边 ${MAX_EDGE}px / WebP q${QUALITY}）`);

for (const file of files) {
  const rel = path.relative(SRC, file);
  const dest = path.join(OUT, rel.replace(/\.(png|jpe?g|webp)$/i, '.webp'));
  before += fs.statSync(file).size;

  // sync:assets 每次都会重写 raw/works（mtime 全变），所以不看时间戳：
  // 产物存在即视为已压过。换了某张图的内容时用 --force 全量重压。
  const fresh = !FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0;

  if (fresh) {
    after += fs.statSync(dest).size;
    skipped += 1;
    continue;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const meta = await sharp(file).metadata();
  await sharp(file)
    .resize({ width: Math.min(meta.width ?? MAX_EDGE, MAX_EDGE), withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(dest);

  after += fs.statSync(dest).size;
  done += 1;
  if (done % 20 === 0) console.log(`  ${done} 张已转换…`);
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
