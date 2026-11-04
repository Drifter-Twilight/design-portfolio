import { useEffect, useMemo, useState } from 'react';
import { detectCapability, isSoftwareRenderer, type Capability } from '@/lib/capability';

/**
 * 设备诊断面板。只在 URL 带 `?diag=1` 时挂载，正常访问不会打包进流程。
 *
 * 用途：手机端「动效不见了」有两种完全不同的成因，靠这个面板一次看清——
 * 是被判成 lite（硬件参数），还是浏览器根本给不出 webgl2（硬件加速关闭）。
 */
export function Diagnostics() {
  const [cap, setCap] = useState<Capability | null>(null);
  const [canvas, setCanvas] = useState({ total: 0, webgl: 0 });
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCap(detectCapability());
    // 等首屏组件挂完再数 canvas
    const timer = window.setTimeout(() => {
      const list = [...document.querySelectorAll('canvas')];
      const webgl = list.filter((el) => {
        try {
          return !!(el.getContext('webgl2') || el.getContext('webgl'));
        } catch {
          return false;
        }
      }).length;
      setCanvas({ total: list.length, webgl });
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = useMemo(() => {
    if (!cap) return [];
    return [
      ['UA', navigator.userAgent.slice(0, 60)],
      ['cores', String(cap.cores ?? '未上报')],
      ['deviceMemory', cap.memory === null ? '未上报' : `${cap.memory} GB`],
      ['reduced-motion', cap.reducedMotion ? '开启（会被降级）' : '关闭'],
      ['saveData', cap.saveData ? '开启（会被降级）' : '关闭'],
      ['WebGL 1', cap.webgl1 ? '可用' : '不可用'],
      ['WebGL 2', cap.webgl2 ? '可用' : '不可用'],
      ['GPU', cap.renderer || '未暴露'],
      ['软件渲染', isSoftwareRenderer(cap.renderer) ? '是（没有硬件加速）' : '否'],
      ['判定档位', cap.tier],
      ['降级理由', cap.reason],
      ['页面 canvas', `${canvas.total} 个（WebGL ${canvas.webgl} 个）`],
    ];
  }, [cap, canvas]);

  const report = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 bottom-3 z-[999] rounded-full border border-line-strong bg-ink px-3 py-2 font-mono text-[11px] text-acid"
      >
        diag
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[999] max-h-[60vh] overflow-auto rounded-xl border border-line-strong bg-[#0b0812]/97 p-3 shadow-2xl backdrop-blur-md md:inset-x-auto md:right-4 md:bottom-4 md:w-[360px]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.16em] text-acid uppercase">设备诊断</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(report);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              } catch {
                setCopied(false);
              }
            }}
            className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-fg/80"
          >
            {copied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-fg/80"
          >
            关闭
          </button>
        </div>
      </div>

      <dl className="space-y-1 font-mono text-[11px] leading-[1.5]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-[92px] shrink-0 text-mute">{k}</dt>
            <dd className="break-all text-fg/85">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-2 border-t border-line/60 pt-2 text-[10px] leading-[1.6] text-mute">
        判定为 lite 或 WebGL 不可用时，背景与组件动效会整体关闭，页面内容仍完整。
      </p>
    </div>
  );
}
