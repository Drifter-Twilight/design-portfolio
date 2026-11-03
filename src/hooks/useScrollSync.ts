import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * 懒加载图片会不断改写文档高度，ScrollTrigger 的起止位置必须跟着刷新，
 * 否则「元素明明在视口里，触发点却还停在旧坐标」——表现为内容停在 opacity 0。
 *
 * 这里做几道保险：load、字体就绪、以及若干次延迟刷新（图片陆续到位）。
 * 只在挂载时跑一次，开销可以忽略。
 */
export function useScrollTriggerRefresh() {
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (alive) ScrollTrigger.refresh();
    };

    const timers = [400, 1200, 2400].map((delay) => window.setTimeout(refresh, delay));
    window.addEventListener('load', refresh);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(refresh).catch(() => {});
    }

    return () => {
      alive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('load', refresh);
    };
  }, []);
}
