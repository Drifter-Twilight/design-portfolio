import { useEffect, useState } from 'react';

/** 订阅一个媒体查询，SSR 与首帧安全 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** 用户是否要求减少动态效果 */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** 是否触屏 / 无 hover 设备（用于关掉指针类动效） */
export const useCoarsePointer = () => useMediaQuery('(hover: none), (pointer: coarse)');

/** 移动端断点：动效复杂度在此之下整体降级 */
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
