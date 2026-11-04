import { Suspense, lazy, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { BackToTop } from '@/components/layout/BackToTop';
import { Hero } from '@/components/sections/Hero';
import { About } from '@/components/sections/About';
import { GraphicSection } from '@/components/sections/GraphicSection';
import { CommerceSection } from '@/components/sections/CommerceSection';
import { Outro, SiteFooter } from '@/components/sections/Outro';
import { LightboxProvider } from '@/components/work/LightboxProvider';
import { scrollToTarget, useSmoothScroll } from '@/hooks/useSmoothScroll';
import { useParallax, useSectionDepth } from '@/hooks/useParallax';
import { usePerfTier } from '@/hooks/usePerfTier';
import { useScrollTriggerRefresh } from '@/hooks/useScrollSync';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/** 只在 ?diag=1 时加载，正常访问不为它付任何体积 */
const Diagnostics = lazy(() => import('@/components/dev/Diagnostics').then((m) => ({ default: m.Diagnostics })));

export default function App() {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const tier = usePerfTier();
  const motionOk = !reduce && tier === 'full';
  const showDiag = useMemo(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('diag'),
    [],
  );

  // 减少动态 / 低配设备：关掉平滑滚动，交给原生滚动（更省，也更跟手）
  useSmoothScroll(motionOk);
  // 移动端不跑装饰性视差，避免滚动帧率与耗电问题
  useParallax(motionOk && !isMobile);
  // 区块级视差：背景与内容分层，量值按视口高度换算，任何屏幕尺寸下一致
  useSectionDepth(motionOk);
  // 懒加载图片改变文档高度后，重新计算 ScrollTrigger 的触发点
  useScrollTriggerRefresh();

  // 支持 #about / #graphic 这类直达链接（分享与外部跳转）
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id) return undefined;
    const timer = window.setTimeout(() => scrollToTarget(`#${id}`, -72, true), 420);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <LightboxProvider>
      <a className="skip-link" href="#main">
        {t('meta.skip')}
      </a>

      <Header />

      {/* tabIndex=-1 让 skip link 跳转后焦点真正落到主内容 */}
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <About />
        <GraphicSection />
        <CommerceSection />
        <Outro />
      </main>

      <SiteFooter />
      <BackToTop />

      {showDiag && (
        <Suspense fallback={null}>
          <Diagnostics />
        </Suspense>
      )}
    </LightboxProvider>
  );
}
