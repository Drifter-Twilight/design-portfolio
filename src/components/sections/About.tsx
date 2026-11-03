import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FoldText from '@/components/reactbits/FoldText';
import { SkillRow } from './SkillRow';
import { ContactIcon } from './ContactIcon';
import { ResumeDialog } from './ResumeDialog';
import { profile } from '@/data/profile';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useGpuEnabled } from '@/hooks/usePerfTier';

// Three.js 体积大，按需加载，避免把 600KB 打进首屏主包
const ColorBends = lazy(() => import('@/components/reactbits/ColorBends'));

/** 与主色调一致的紫色色带 */
const BENDS_COLORS = ['#c4a7ff', '#9b6dff', '#6d3fbf', '#2a1850'];

export function About() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const gpu = useGpuEnabled();
  const [bendsReady, setBendsReady] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);

  // Three.js 体积较大，接近视口时才挂载背景
  useEffect(() => {
    // 减少动态 / 低配设备：整段不挂 Three.js，常驻网格与辉光顶上
    if (reduce || !gpu) return undefined;
    const el = sectionRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setBendsReady(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setBendsReady(true);
          io.disconnect();
        }
      },
      { rootMargin: '800px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce, gpu]);

  /** 长段落统一参数：滚动到视口才展开，逐字节奏更密 */
  const paragraphProps = {
    splitBy: 'char' as const,
    trigger: 'scroll' as const,
    duration: 0.42,
    stagger: 0.0045,
    fontSize: 'clamp(0.9rem, 1.05vw + 0.2rem, 1.0625rem)',
    fontWeight: 400,
    style: { lineHeight: 1.92, letterSpacing: '0.01em' },
    className: '',
  };

  return (
    <section
      id="about"
      ref={sectionRef}
      aria-labelledby="about-title"
      data-parallax-scope
      className="relative overflow-hidden py-[clamp(72px,11vh,150px)]"
    >
      {/* ---------- 背景：Color Bends ---------- */}
      <div aria-hidden="true" data-depth-bg className="fx-veil pointer-events-none absolute inset-0 -z-10">
        {bendsReady ? (
          <div className="absolute inset-0 opacity-85">
            <Suspense fallback={null}>
              <ColorBends colors={BENDS_COLORS} transparent />
            </Suspense>
          </div>
        ) : (
          <>
            <div className="tech-grid absolute inset-0 opacity-40" />
            <div className="glow-cold absolute inset-0" />
          </>
        )}
        {/* 压暗，保证长文可读 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8,6,15,0.62) 0%, rgba(8,6,15,0.34) 32%, rgba(8,6,15,0.5) 68%, rgba(8,6,15,0.9) 100%)',
          }}
        />
        <div className="noise-layer absolute inset-0" />
      </div>

      <div className="shell relative" data-depth>
        {/* 章节标头 */}
        <div className="flex items-baseline justify-between gap-6 border-t border-line pt-5">
          <span className="font-mono text-[11px] tracking-[0.24em] text-acid">{t('about.index')}</span>
          <span className="text-[10px] tracking-[0.26em] text-mute uppercase">About</span>
        </div>

        <h2 id="about-title" className="sr-only">
          {t('about.hello')} — {profile.nameEn}
        </h2>

        {/* 左右布局：PC 文本在左、照片在右；移动端照片在上、文本在下 */}
        <div className="mt-[clamp(28px,4.5vh,56px)] grid gap-[clamp(32px,5vw,72px)] lg:grid-cols-[minmax(0,1fr)_clamp(250px,26vw,340px)]">
          {/* ---------- 照片 + 联系方式（移动端排在前） ---------- */}
          <aside className="order-1 lg:order-2">
            <figure className="relative m-0 aspect-[3/4] overflow-hidden border border-line bg-ink-3">
              <img
                src={profile.photo}
                width={2292}
                height={3060}
                alt={t('about.portraitAlt')}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                style={{ filter: 'saturate(0.78) contrast(1.08) brightness(0.86)' }}
              />
              {/* 图片上的一层极淡渐变，让照片与暗底衔接 */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(8,6,15,0.62) 0%, rgba(8,6,15,0.12) 46%, transparent 72%), radial-gradient(ellipse 90% 60% at 50% 0%, rgba(124,92,255,0.22) 0%, transparent 62%)',
                }}
              />
            </figure>

            {/* 联系方式：始终在照片下方 */}
            <dl className="mt-5 space-y-0">
              <div className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                <dt className="flex shrink-0 items-center gap-2.5">
                  <ContactIcon kind="email" />
                  <span className="text-[10px] tracking-[0.18em] text-mute uppercase">
                    {t('about.emailLabel')}
                  </span>
                </dt>
                <dd className="min-w-0">
                  <a
                    href={`mailto:${profile.email}`}
                    className="link-underline block truncate text-[12.5px] text-dim transition-colors hover:text-acid"
                  >
                    {profile.email}
                  </a>
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                <dt className="flex shrink-0 items-center gap-2.5">
                  <ContactIcon kind="wechat" />
                  <span className="text-[10px] tracking-[0.18em] text-mute uppercase">
                    {t('about.wechatLabel')}
                  </span>
                </dt>
                <dd className="min-w-0">
                  <span className="block truncate font-mono text-[12.5px] text-dim">{profile.wechat}</span>
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                <dt className="flex shrink-0 items-center gap-2.5">
                  <ContactIcon kind="resume" />
                  <span className="text-[10px] tracking-[0.18em] text-mute uppercase">
                    {t('about.resumeLabel')}
                  </span>
                </dt>
                <dd className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setResumeOpen(true)}
                    aria-haspopup="dialog"
                    className="group inline-flex items-center gap-1.5 border border-line-strong/70 px-3 py-1.5 text-[11.5px] tracking-[0.06em] whitespace-nowrap text-dim transition-colors hover:border-acid/60 hover:bg-acid/5 hover:text-acid"
                  >
                    {t('about.viewResume')}
                    <svg
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                      fill="none"
                      className="size-[10px] transition-transform duration-300 group-hover:translate-x-0.5"
                    >
                      <path d="M1.5 6h9M6.5 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  </button>
                </dd>
              </div>
            </dl>
          </aside>

          {/* ---------- 三段文本（全部 FoldText） ---------- */}
          <div className="order-2 lg:order-1">
            {/* 一、视觉与核心定位 */}
            <div>
              <FoldText
                text={t('about.hello')}
                splitBy="char"
                trigger="scroll"
                duration={0.5}
                stagger={0.05}
                fontSize="clamp(0.875rem,0.5vw + 0.55rem,1.125rem)"
                fontWeight={500}
                className="tracking-[0.16em] text-acid"
              />

              <div className="mt-[clamp(10px,1.6vh,18px)] flex flex-wrap items-baseline gap-x-[clamp(10px,1.6vw,20px)] gap-y-2">
                <span className="shrink-0">
                  <FoldText
                    text={t('about.im')}
                  splitBy="char"
                  trigger="scroll"
                  duration={0.5}
                  stagger={0.05}
                  fontSize="clamp(1rem,1vw + 0.55rem,1.6rem)"
                  fontWeight={500}
                    className="text-fg/80"
                  />
                </span>
                <span className="name-outline shrink-0">
                  <FoldText
                    text={profile.nameZh}
                    splitBy="char"
                    trigger="scroll"
                    duration={0.62}
                    stagger={0.07}
                    fontSize="clamp(2.1rem,4.4vw + 0.6rem,4.2rem)"
                    fontWeight={900}
                    color="transparent"
                    hoverRefold
                    refoldRadius={160}
                    refoldAngle={38}
                    className="text-left"
                  />
                </span>
              </div>

              {/* 英文名：主要文本，实心主色 */}
              <div className="mt-[clamp(2px,0.8vh,8px)]">
                <FoldText
                  text={profile.nameEn}
                  splitBy="char"
                  trigger="scroll"
                  duration={0.7}
                  stagger={0.06}
                  fontSize="clamp(2.4rem,6vw + 0.5rem,5.4rem)"
                  fontWeight={700}
                  color="#c4a7ff"
                  hoverRefold
                  refoldRadius={180}
                  refoldAngle={42}
                />
              </div>

              <div className="mt-[clamp(16px,2.6vh,26px)] flex flex-col gap-2">
                <FoldText
                  text={t('about.title')}
                  splitBy="char"
                  trigger="scroll"
                  duration={0.5}
                  stagger={0.012}
                  fontSize="clamp(0.9375rem,0.75vw + 0.5rem,1.375rem)"
                  fontWeight={500}
                  className="tracking-[0.06em] text-fg/90"
                />
                <FoldText
                  text={t('about.past')}
                  splitBy="char"
                  trigger="scroll"
                  duration={0.45}
                  stagger={0.01}
                  fontSize="clamp(0.8125rem,0.55vw + 0.45rem,1.0625rem)"
                  fontWeight={400}
                  className="text-dim"
                />
              </div>
            </div>

            {/* 二、核心能力与经历 */}
            <div className="mt-[clamp(32px,5vh,56px)] border-t border-line pt-[clamp(20px,3vh,32px)]">
              <FoldText text={t('about.ability')} {...paragraphProps} className="text-dim" />
            </div>

            {/* 三、生活特质 */}
            <div className="mt-[clamp(20px,3vh,32px)]">
              <FoldText text={t('about.life')} {...paragraphProps} className="text-dim" />
            </div>
          </div>
        </div>

        {/* ---------- 底部：技能图标 ---------- */}
        <div className="mt-[clamp(40px,6vh,72px)] border-t border-line pt-[clamp(18px,2.6vh,28px)]">
          <p className="eyebrow mb-4 !text-mute">{t('about.skills')}</p>
          <SkillRow />
        </div>
      </div>

      <ResumeDialog open={resumeOpen} onClose={() => setResumeOpen(false)} />
    </section>
  );
}
