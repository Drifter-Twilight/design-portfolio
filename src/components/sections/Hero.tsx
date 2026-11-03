import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GhostFibers from '@/components/reactbits/GhostFibers';
import TechText from '@/components/reactbits/TechText';
import CountUp from '@/components/reactbits/CountUp';
import { profile } from '@/data/profile';
import { works } from '@/data/works';
import { scrollToTarget } from '@/hooks/useSmoothScroll';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useGpuEnabled } from '@/hooks/usePerfTier';

gsap.registerPlugin(ScrollTrigger);

/** 主强调色，与 index.css 的 --color-acid 同步（canvas 不认 CSS 变量） */
const ACCENT = '#c4a7ff';

export function Hero() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';
  const reduce = usePrefersReducedMotion();
  const gpu = useGpuEnabled();
  const sectionRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 年份实时计算
  const year = new Date().getFullYear();

  const stats = [
    { value: works.counts.viSets, label: t('about.stats.vi') },
    { value: works.counts.poster, label: t('about.stats.poster') },
    { value: works.counts.productSets, label: t('about.stats.product') },
    { value: works.counts.total, label: t('about.stats.total') },
  ];

  // 内容随滚动轻微上浮淡出，保留原有的第一层视差
  useEffect(() => {
    if (reduce) return undefined;
    const ctx = gsap.context(() => {
      gsap.to(bodyRef.current, {
        yPercent: -10,
        opacity: 0.15,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-labelledby="hero-title"
      className="relative flex flex-col overflow-hidden pt-[var(--header-h)]"
      style={{
        // 与当前屏幕可视安全区域等高，并让底部内容避开 iOS 安全区
        minHeight: '100svh',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* ---------- 背景：CSS 氛围层常驻 + Ghost Fibers 叠加 ---------- */}
      <div
        aria-hidden="true"
        data-depth-bg
        className="fx-veil fx-veil-bottom pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* 底层始终存在：WebGL2 不可用时也不会出现纯黑 */}
        <div className="tech-grid absolute inset-0 opacity-55" />
        <div className="glow-cold absolute inset-0" />
        <div className="glow-acid absolute inset-0" />

        {!reduce && gpu && (
          <div className="absolute inset-0">
            {/* 默认配置；仅对纯黑背景做一次亮度补偿，否则纤维会暗到看不见 */}
            <GhostFibers className="h-full w-full" brightness={1.45} glow={1.1} />
          </div>
        )}

        <div className="noise-layer absolute inset-0" />
        {/* 上下边缘压暗，给导航与底部信息留出干净底 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8,6,15,0.58) 0%, rgba(8,6,15,0.06) 30%, rgba(8,6,15,0.1) 62%, rgba(8,6,15,0.9) 100%)',
          }}
        />
      </div>

      {/* ---------- 主体 ---------- */}
      <div className="shell relative flex flex-1 flex-col justify-center py-[clamp(20px,4.5vh,60px)]">
        {/* 内容区柔光暗化：只压暗文字所在的中段，四周仍能看见纤维流动 */}
        <div aria-hidden="true" className="hero-scrim pointer-events-none absolute inset-0" />

        <div ref={bodyRef} className="relative">
          {/* eyebrow：实时年份 */}
          <div className="border-b border-line pb-3">
            <p className="eyebrow !text-dim text-[clamp(0.6875rem,0.45vw_+_0.5rem,1rem)]">
              {t('hero.eyebrow', { since: profile.since, year })}
            </p>
          </div>

          {/* 欢迎语 */}
          <p className="mt-[clamp(16px,3.2vh,38px)] text-[clamp(0.875rem,0.55vw_+_0.55rem,1.375rem)] tracking-[0.28em] text-acid/90">
            {profile.hero.welcome[locale]}
          </p>

          {/* 主标题：TechText 画布字，指针经过处转为矢量轮廓 */}
          <h1 id="hero-title" className="sr-only">
            {profile.hero.title[locale]}
          </h1>
          <div
            aria-hidden="true"
            className="relative mt-[clamp(4px,1.2vh,14px)] h-[clamp(62px,11vh,110px)] w-full sm:h-[clamp(102px,20vh,224px)]"
          >
            <TechText
              text={profile.hero.title[locale]}
              fontWeight={locale === 'zh' ? 700 : 500}
              fontSize={150}
              reveal="letter"
              dashLength={4}
              dashGap={2}
              specks={6}
              intro="metrics"
              introDuration={2.8}
              clickKick
              guides
              letterSpacing={locale === 'zh' ? -0.005 : -0.03}
              lineStyle="solid"
              strokeWidth={1.25}
              bounce={0.75}
              color="#f2f0f7"
              accentColor={ACCENT}
              align="center"
            />
          </div>

          {/* 副标题 */}
          <p className="mt-[clamp(8px,1.8vh,20px)] text-center text-[clamp(0.75rem,0.75vw_+_0.5rem,1.5rem)] tracking-[0.26em] text-fg/85 uppercase">
            {profile.hero.subtitle}
          </p>
        </div>
      </div>

      {/* ---------- 滚动提示：画面中间偏下，水平居中 ---------- */}
      <div className="shell relative flex justify-center pb-[clamp(6px,1.2vh,14px)]">
        <button
          type="button"
          onClick={() => scrollToTarget('#about')}
          className="group flex flex-col items-center gap-2.5 text-[clamp(0.625rem,0.35vw_+_0.4rem,0.8125rem)] tracking-[0.26em] text-fg/65 uppercase transition-colors hover:text-acid"
        >
          {t('hero.scroll')}
          <span className="flex h-9 w-9 items-center justify-center border border-line-strong transition-colors group-hover:border-acid group-hover:text-acid">
            <svg
              width="13"
              height="15"
              viewBox="0 0 13 15"
              aria-hidden="true"
              fill="none"
              className="motion-safe:animate-[scrollArrow_1.9s_cubic-bezier(.16,1,.3,1)_infinite]"
            >
              <path d="M6.5 1v11M6.5 12L1.8 7.3M6.5 12l4.7-4.7" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </span>
        </button>
      </div>

      {/* ---------- 底部：左统计 / 右技术支持 ---------- */}
      <div className="shell relative border-t border-line">
        <div className="flex items-end justify-between gap-4 py-[clamp(12px,2vh,22px)]">
          {/* 统计：移动端竖向堆叠于左下角（数字右对齐成一列），PC 横向排列于左下角 */}
          <dl className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-x-[clamp(28px,4vw,64px)] sm:gap-y-0">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="grid grid-cols-[3.5rem_1fr] items-baseline gap-x-3 sm:flex sm:flex-col sm:items-start sm:gap-0"
              >
                <dd className="display flex items-baseline justify-end tabular-nums text-[clamp(1.35rem,2.9vw,2.6rem)] leading-none text-fg sm:w-auto sm:justify-start">
                  <CountUp to={stat.value} duration={1.6} easing="expo" trigger="view" pad={2} />
                  <span aria-hidden="true" className="ml-1 text-[0.62em] tracking-[0.12em] text-acid">
                    +
                  </span>
                </dd>
                <dt className="mt-0 text-left text-[clamp(0.625rem,0.3vw_+_0.42rem,0.8125rem)] tracking-[0.14em] text-dim uppercase sm:mt-1.5">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>

          {/* 技术支持：始终固定右下角 */}
          <p className="shrink-0 pb-0.5 text-right text-[clamp(0.625rem,0.3vw_+_0.42rem,0.8125rem)] tracking-[0.18em] text-dim uppercase">
            {t('footer.poweredBy')}
          </p>
        </div>
      </div>
    </section>
  );
}
