import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let instance: Lenis | null = null;

export const getLenis = () => instance;

/** 统一的滚动跳转：有 Lenis 走 Lenis，没有则退回原生。immediate 用于直达链接 */
export function scrollToTarget(target: string | HTMLElement, offset = -72, immediate = false) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (instance) {
    instance.scrollTo(el ?? 0, { offset, duration: immediate ? 0 : 1.3, immediate });
    return;
  }
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: immediate ? 'auto' : 'smooth' });
}

/**
 * 惯性滚动。仅在用户未要求减少动态时启用；
 * 关闭时保留原生滚动，ScrollTrigger 依然工作。
 */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      instance = null;
      ScrollTrigger.refresh();
      return undefined;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      // 触摸端不接管惯性，交给系统，避免移动端掉帧
      syncTouch: false,
    });
    instance = lenis;

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // 图片陆续加载会改变文档高度，滚动条与触发器需要跟随刷新
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    const timer = window.setTimeout(refresh, 600);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('load', refresh);
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      instance = null;
    };
  }, [enabled]);
}
