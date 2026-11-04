'use client';

import { useEffect, useState } from 'react';
import { detectCapability } from '@/lib/capability';

export type PerfTier = 'full' | 'lite';

/**
 * 设备能力分档。
 *
 * 只看首帧就能同步拿到的信号，不做运行时帧率采样 —— 采样本身要在低端机上跑动画，
 * 反而更容易误判，还会造成「先炫后崩」的闪烁。
 *
 * 判定顺序（见 src/lib/capability.ts）：
 * 1. URL `?perf=lite|full` 强制覆盖（便于验收与分享低配版本）；
 * 2. `prefers-reduced-motion: reduce` / `saveData` / 2G-3G；
 * 3. **拿不到 WebGL2，或跑在 SwiftShader 软件渲染上**；
 * 4. 极端硬件（内存 ≤1GB 或 1 核）兜底。
 *
 * 刻意不按 `hardwareConcurrency` 判：Android WebView 常低报核心数。
 * `lite` 下的降级清单见 README「性能与降级」。
 */
function detectTier(): PerfTier {
  if (typeof window === 'undefined') return 'full';

  const forced = new URLSearchParams(window.location.search).get('perf');
  if (forced === 'lite' || forced === 'low') return 'lite';
  if (forced === 'full' || forced === 'high') return 'full';

  // 判定收口到 capability：以「能不能真的拿到 WebGL2、是不是软件渲染」为主判据。
  // 之前按 hardwareConcurrency <= 4 判，Android WebView 低报核心数会把中端机整批误杀。
  return detectCapability().tier;
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
