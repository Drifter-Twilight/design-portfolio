import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 声明式视差：给任意元素加 data-parallax="0.2"，
 * 它就会随滚动产生 ±20% 的纵向位移。作用域由最近的 [data-parallax-scope] 决定。
 * 移动端与减少动态时整体跳过。
 */
export function useParallax(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const speed = Number.parseFloat(el.dataset.parallax || '0.15') || 0.15;
        const scope = el.closest<HTMLElement>('[data-parallax-scope]') ?? el;

        gsap.fromTo(
          el,
          { yPercent: -speed * 100 },
          {
            yPercent: speed * 100,
            ease: 'none',
            scrollTrigger: {
              trigger: scope,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    });

    return () => ctx.revert();
  }, [enabled]);
}

/**
 * 区块级视差（页面之间的层次感）。
 *
 * - `[data-depth-bg]`：区块背景层。整段滚动过程中「贴边时略微放大、居中时还原」，
 *   让背景像退到更远的一层，与内容的位移形成速度差。
 * - `[data-depth]`：内容层。整段通过视口时纵向漂移 ±DEPTH，比页面滚动略快。
 *
 * 位移量全部按视口高度换算（vh），并在 resize 时由 ScrollTrigger 重新计算，
 * 所以在超宽屏 / 小屏 / 手机横屏下表现一致。
 */
const DEPTH_RATIO = 0.04;
const BG_SCALE = 1.09;

export function useSectionDepth(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-depth-bg]').forEach((el) => {
        const scope = el.closest<HTMLElement>('[data-parallax-scope]') ?? el;
        gsap
          .timeline({
            scrollTrigger: {
              trigger: scope,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(el, { scale: BG_SCALE }, { scale: 1, ease: 'none', duration: 1 })
          .to(el, { scale: BG_SCALE, ease: 'none', duration: 1 });
      });

      gsap.utils.toArray<HTMLElement>('[data-depth]').forEach((el) => {
        const scope = el.closest<HTMLElement>('[data-parallax-scope]') ?? el;
        const distance = Number.parseFloat(el.dataset.depth || '') || DEPTH_RATIO;
        gsap.fromTo(
          el,
          { y: () => window.innerHeight * distance },
          {
            y: () => -window.innerHeight * distance,
            ease: 'none',
            scrollTrigger: {
              trigger: scope,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    });

    return () => ctx.revert();
  }, [enabled]);
}
