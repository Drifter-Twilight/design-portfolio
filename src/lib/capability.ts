/**
 * 设备能力探测 —— 集中一处，供动效降级与诊断面板共用。
 *
 * 移动端「动效全失效」有两个完全不同的成因，必须区分：
 * 1. 被判成 lite（硬件参数阈值）；
 * 2. 浏览器根本拿不到 webgl2 上下文（硬件加速关闭 / 内核过旧 / 上下文数超限）。
 * 两者的修复方式完全不同，所以这里把判定理由一起返回。
 */

export interface Capability {
  cores: number | null;
  memory: number | null;
  reducedMotion: boolean;
  saveData: boolean;
  webgl1: boolean;
  webgl2: boolean;
  /** WebGL 驱动名，能看出是硬件还是 SwiftShader 软件渲染 */
  renderer: string;
  tier: 'full' | 'lite';
  /** 判定成 lite 的具体理由，full 时为 'ok' */
  reason: string;
}

type Nav = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/** 探测一次就释放上下文，避免自己把移动端稀缺的 WebGL 名额占掉 */
function probeContext(kind: 'webgl' | 'webgl2'): { ok: boolean; renderer: string } {
  if (typeof document === 'undefined') return { ok: false, renderer: '' };
  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext(kind) as WebGLRenderingContext | WebGL2RenderingContext | null;
  } catch {
    return { ok: false, renderer: '' };
  }
  if (!gl) return { ok: false, renderer: '' };

  let renderer = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
  } catch {
    /* 部分浏览器禁用了这个扩展 */
  }

  // 立刻归还，别让一次探测占死一个上下文名额
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    /* ignore */
  }
  return { ok: true, renderer };
}

export function detectCapability(): Capability {
  if (typeof window === 'undefined') {
    return {
      cores: null,
      memory: null,
      reducedMotion: false,
      saveData: false,
      webgl1: false,
      webgl2: false,
      renderer: '',
      tier: 'full',
      reason: 'ssr',
    };
  }

  const nav = navigator as Nav;
  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!nav.connection?.saveData;
  const twoG = /(^|-)2g$/.test(nav.connection?.effectiveType ?? '');

  const g2 = probeContext('webgl2');
  const g1 = g2.ok ? { ok: true, renderer: g2.renderer } : probeContext('webgl');

  let reason = 'ok';
  if (reducedMotion) reason = 'reduced-motion';
  else if (saveData) reason = 'save-data';
  else if (twoG) reason = '2g';
  else if (memory !== null && memory > 0 && memory <= 2) reason = 'memory<=2';
  else if (cores !== null && cores > 0 && cores <= 2) reason = 'cores<=2';

  return {
    cores,
    memory,
    reducedMotion,
    saveData,
    webgl1: g1.ok,
    webgl2: g2.ok,
    renderer: g2.renderer || g1.renderer,
    tier: reason === 'ok' ? 'full' : 'lite',
    reason,
  };
}

/** 浏览器报了 WebGL 但没有硬件加速时，驱动名通常是这些软件实现 */
export function isSoftwareRenderer(renderer: string): boolean {
  return /swiftshader|software|llvmpipe|mesa offscreen/i.test(renderer);
}
