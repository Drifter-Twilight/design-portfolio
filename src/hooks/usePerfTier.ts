'use client';

import { useEffect, useState } from 'react';

export type PerfTier = 'full' | 'lite';

/**
 * 设备能力分档。
 *
 * 只看首帧就能同步拿到的信号，不做运行时帧率采样 —— 采样本身要在低端机上跑动画，
 * 反而更容易误判，还会造成「先炫后崩」的闪烁。判定顺序：
 *
 * 1. URL `?perf=lite|full` 强制覆盖（便于验收与分享低配版本）；
 * 2. `prefers-reduced-motion: reduce`；
 * 3. `navigator.connection.saveData` / 2G 网络；
 * 4. `deviceMemory <= 4`（Chrome 系）或 `hardwareConcurrency <= 4`。
 *
 * `lite` 下的降级清单见 README「性能与降级」。
 */
function detectTier(): PerfTier {
  if (typeof window === 'undefined') return 'full';

  const forced = new URLSearchParams(window.location.search).get('perf');
  if (forced === 'lite' || forced === 'low') return 'lite';
  if (forced === 'full' || forced === 'high') return 'full';

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'lite';

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  if (nav.connection?.saveData) return 'lite';
  if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) return 'lite';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 4) return 'lite';
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) {
    return 'lite';
  }

  return 'full';
}

export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>(detectTier);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media?.addEventListener) return undefined;
    const onChange = () => setTier(detectTier());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return tier;
}

/** 是否允许跑 GPU 背景 / WebGL 动效 */
export function useGpuEnabled(): boolean {
  const tier = usePerfTier();
  return tier === 'full';
}
