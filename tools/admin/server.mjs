/**
 * 本地录入工具（`npm run admin`）。
 *
 * 只用 Node 内置模块：起一个 127.0.0.1 的小服务，页面在浏览器里，
 * 「发布」按钮会依次跑 sync → optimize → build → commit → push，日志实时回传。
 *
 * 它不是 CMS：没有数据库、没有登录、没有服务器。数据源始终是
 * `E:\作品集` 与仓库里的 JSON，工具只改 `src/data/overrides.json` 这一层。
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOTS, listSlots, storeImage } from './profile-assets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.env.ADMIN_PORT) || 5180;
const OVERRIDES = path.join(ROOT, 'src/data/overrides.json');
const WORKS = path.join(ROOT, 'src/data/works.json');
const STATIC_DIRS = ['public', 'src/data'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const send = (res, code, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  // Buffer 必须原样写出，否则会被 JSON.stringify 成 {"type":"Buffer",...}
  if (Buffer.isBuffer(body) || typeof body === 'string') return res.end(body);
  return res.end(JSON.stringify(body));
};

/** 把 works.json 摊平成「分组 + 条目」，供界面直接渲染 */
function buildState() {
  const works = readJson(WORKS, null);
  const overrides = readJson(OVERRIDES, { hidden: [], titles: {}, order: {} });
  if (!works) return { groups: [], overrides, error: 'works.json 不存在，先跑一次 npm run sync:assets' };

  const hidden = new Set(overrides.hidden ?? []);
  const order = overrides.order ?? {};

  const sortBy = (group, list) => {
    const seq = order[group];
    if (!Array.isArray(seq) || !seq.length) return list;
    const rank = new Map(seq.map((id, i) => [id, i]));
    return [...list].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : 9999;
      const rb = rank.has(b.id) ? rank.get(b.id) : 9999;
      return ra - rb;
    });
  };

  const toItem = (group) => (entry) => ({
    id: entry.id,
    group,
    // original 用来判断「这一项到底有没有被改过」，只把差异写进 overrides
    original: entry.title ?? entry.label ?? { zh: '', en: '' },
    title: overrides.titles?.[entry.id] ?? entry.title ?? entry.label ?? { zh: '', en: '' },
    thumb: entry.card?.src ?? entry.cover?.card?.src ?? entry.cover?.src ?? entry.images?.[0]?.card?.src ?? entry.images?.[0]?.src ?? entry.shots?.[0]?.card?.src ?? entry.shots?.[0]?.src ?? entry.src ?? entry.scene?.card?.src ?? entry.blend?.card?.src ?? '',
    count:
      entry.images?.length ??
      entry.shots?.length ??
      entry.details?.length ??
      (entry.scene || entry.blend ? 2 : 1),
    hidden: hidden.has(entry.id),
  });

  const groups = [
    { key: 'vi', name: '品牌 VI', items: sortBy('vi', works.graphic.vi).map(toItem('vi')) },
    { key: 'poster', name: '艺术海报', items: sortBy('poster', works.graphic.poster).map(toItem('poster')) },
    { key: 'icon', name: 'Icon 图标', items: sortBy('icon', works.graphic.icon).map(toItem('icon')) },
    { key: 'product', name: '商品套图', items: sortBy('product', works.commerce.product).map(toItem('product')) },
    { key: 'campaign', name: '营销海报', items: sortBy('campaign', works.commerce.campaign).map(toItem('campaign')) },
    { key: 'composite', name: '产品溶图', items: sortBy('composite', works.commerce.composite).map(toItem('composite')) },
    { key: 'banner', name: '电商 Banner', items: sortBy('banner', works.commerce.banner).map(toItem('banner')) },
  ];

  return { groups, overrides, counts: works.counts, generatedAt: works.generatedAt };
}

/** 依次执行一条命令，把每行输出交给 onLine */
function run(cmd, args, onLine) {
  return new Promise((resolve) => {
    // 清掉外部注入的 NODE_OPTIONS：某些环境会挂 require hook（比如删除保护），
    // 会让 vite 清空 dist 时失败。发布流程要在干净的 node 环境里跑。
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    const child = spawn(cmd, args, { cwd: ROOT, shell: true, env });
    child.stdout.on('data', (buf) => String(buf).split(/\r?\n/).filter(Boolean).forEach(onLine));
    child.stderr.on('data', (buf) => String(buf).split(/\r?\n/).filter(Boolean).forEach(onLine));
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', (err) => {
      onLine(`无法启动 ${cmd}: ${err.message}`);
      resolve(1);
    });
  });
}

const PIPELINE = [
  { label: '同步素材清单', cmd: 'npm', args: ['run', 'sync:assets'] },
  { label: '生成 WebP', cmd: 'npm', args: ['run', 'optimize:images', '--', '--apply'] },
  { label: '构建', cmd: 'npm', args: ['run', 'build'] },
];

async function publish(sendLine) {
  for (const step of PIPELINE) {
    sendLine(`▸ ${step.label}`);
    const code = await run(step.cmd, step.args, (line) => sendLine(`  ${line}`));
    if (code !== 0) {
      sendLine(`✗ ${step.label} 失败（退出码 ${code}），已中止，未推送`);
      return { ok: false, stage: step.label };
    }
  }

  sendLine('▸ 提交并推送');
  const git = fs.existsSync('D:\\Tools\\Git\\cmd\\git.exe') ? 'D:\\Tools\\Git\\cmd\\git.exe' : 'git';
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

  if ((await run(`"${git}"`, ['add', '-A'], (l) => sendLine(`  ${l}`))) !== 0) {
    sendLine('✗ git add 失败');
    return { ok: false, stage: 'git add' };
  }

  // 没有改动时 commit 会返回非 0，这里单独判断，避免误报失败
  const dirty = await new Promise((resolve) => {
    const child = spawn(`"${git}"`, ['diff', '--cached', '--quiet'], { cwd: ROOT, shell: true });
    child.on('close', (code) => resolve(code !== 0));
  });
  if (!dirty) {
    sendLine('  没有内容变化，无需提交');
  } else {
    // shell: true 会重新按空格拆参，消息必须自己带引号，否则被拆成多个 pathspec
    const msg = `"content: 后台更新 ${stamp}"`;
    if ((await run(`"${git}"`, ['commit', '-m', msg], (l) => sendLine(`  ${l}`))) !== 0) {
      sendLine('✗ git commit 失败');
      return { ok: false, stage: 'git commit' };
    }
  }

  const pushCode = await run(`"${git}"`, ['push', 'origin', 'main'], (l) => sendLine(`  ${l}`));
  if (pushCode !== 0) {
    sendLine('✗ 推送失败（网络问题），本地产物已更新，稍后重试推送即可');
    return { ok: false, stage: 'git push' };
  }
  sendLine('✓ 已推送，GitHub Actions 正在部署，约 1-2 分钟生效');
  return { ok: true };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/' || pathname === '/index.html') {
    return send(res, 200, fs.readFileSync(path.join(ROOT, 'tools/admin/ui.html'), 'utf8'), MIME['.html']);
  }

  if (pathname === '/api/state') return send(res, 200, { ...buildState(), profile: listSlots() });

  // 替换头像 / 简历：body 直接是图片二进制，服务端负责压缩与记账
  if (pathname === '/api/profile/upload' && req.method === 'POST') {
    const slot = url.searchParams.get('slot') ?? '';
    if (!SLOTS[slot]) return send(res, 400, { ok: false, error: '未知的槽位' });

    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 24 * 1024 * 1024) {
        tooLarge = true;
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', async () => {
      if (tooLarge) return;
      try {
        const record = await storeImage(slot, Buffer.concat(chunks));
        send(res, 200, { ok: true, record, profile: listSlots() });
      } catch (err) {
        send(res, 400, { ok: false, error: String(err?.message ?? err) });
      }
    });

    req.on('error', () => {
      /* 客户端中断，忽略 */
    });
    return undefined;
  }

  if (pathname === '/api/overrides' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 2e6) req.destroy();
    });
    req.on('end', () => {
      try {
        const next = JSON.parse(body);
        fs.writeFileSync(OVERRIDES, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
        send(res, 200, { ok: true, state: buildState() });
      } catch (err) {
        send(res, 400, { ok: false, error: String(err) });
      }
    });
    return undefined;
  }

  if (pathname === '/api/publish' && req.method === 'POST') {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    const sendLine = (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`);
    const result = await publish(sendLine);
    res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
    res.end();
    return undefined;
  }

  if (pathname.startsWith('/asset/')) {
    const rel = pathname.slice('/asset/'.length);
    for (const dir of STATIC_DIRS) {
      const file = path.join(ROOT, dir, rel);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
      }
    }
    return send(res, 404, 'not found', 'text/plain');
  }

  return send(res, 404, 'not found', 'text/plain');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  作品集录入工具  →  http://127.0.0.1:${PORT}\n`);
  console.log('  改完点右上角「发布」，会自动同步素材、压图、构建并推送。');
  console.log('  关闭这个窗口即停止服务。\n');
});
