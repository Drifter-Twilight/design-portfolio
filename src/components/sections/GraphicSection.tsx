import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedContent from '@/components/reactbits/AnimatedContent';
import { Gallery } from '@/components/work/Gallery';
import { useLightbox } from '@/components/work/LightboxProvider';
import type { LightboxItem } from '@/components/work/Lightbox';
import { SectionHeading, SubHeading } from './SectionHeading';
import { works, type Locale, type ViSeries, type WorkImage } from '@/data/works';
import { profile } from '@/data/profile';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useGpuEnabled } from '@/hooks/usePerfTier';

// 三个组件都基于 WebGL2 + 体积不小，按需加载，首屏不为它们付代价
const Dither = lazy(() => import('@/components/reactbits/Dither'));
const FlexCarousel = lazy(() => import('@/components/reactbits/FlexCarousel'));
const ScrollStack = lazy(() => import('@/components/reactbits/ScrollStack'));

const { graphic, counts } = works;

/** 九宫格：7 张图铺满 3×3，两张跨格（顶部通栏 + 左侧纵向贯通） */
const VI_CELLS = [
  'col-span-2 col-start-1 row-start-1',
  'col-start-3 row-start-1',
  'col-start-1 row-start-2 row-span-2',
  'col-start-2 row-start-2',
  'col-start-3 row-start-2',
  'col-start-2 row-start-3',
  'col-start-3 row-start-3',
];

const toLightboxItems = (images: WorkImage[], locale: Locale): LightboxItem[] =>
  images.map((image) => ({
    src: image.src,
    w: image.w,
    h: image.h,
    alt: image.alt[locale] || image.alt.zh,
  }));

/** 「风格·名称」拆成主副标题，风格做副标题 */
function splitPosterName(raw: string) {
  const at = raw.indexOf('·');
  if (at < 0) return { title: raw, subtitle: undefined as string | undefined };
  return { title: raw.slice(at + 1), subtitle: raw.slice(0, at) };
}

/** 品牌 VI：每套 7 张按九宫格框定，允许跨行跨列，点击看大图 */
function ViGrid({ series, locale }: { series: ViSeries; locale: Locale }) {
  const { t } = useTranslation();
  const openLightbox = useLightbox();
  const items = toLightboxItems(series.images, locale);

  return (
    <div className="grid aspect-[4/3] grid-cols-3 grid-rows-3 gap-[clamp(6px,0.75vw,12px)] lg:aspect-[3/2]">
      {series.images.map((image, index) => {
        const label = image.label[locale] || image.label.zh;
        const alt = image.alt[locale] || image.alt.zh;
        return (
          <button
            key={image.id}
            type="button"
            onClick={() =>
              openLightbox({
                items,
                index,
                title: `${series.title[locale]} — ${t('graphic.vi.title')}`,
              })
            }
            aria-label={`${alt} — ${t('work.view')}`}
            className={`group/cell relative min-h-0 overflow-hidden border border-line bg-[#0c0916] focus-visible:outline-offset-2 ${
              VI_CELLS[index] ?? ''
            }`}
          >
            <img
              src={image.card?.src ?? image.src}
              width={image.card?.w ?? image.w}
              height={image.card?.h ?? image.h}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover/cell:scale-[1.035]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-2 px-2 pb-1.5 pt-6"
              style={{ background: 'linear-gradient(to top, rgba(8,6,15,0.94) 0%, rgba(8,6,15,0.55) 55%, transparent 100%)' }}
            >
              <span className="font-mono text-[8px] tracking-[0.16em] text-acid">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="truncate text-[10px] tracking-[0.02em] text-fg/85">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 图标集合卡片：16:9 完整呈现整张图标表，名称做成角标不占高度 */
function IconCard({
  image,
  locale,
  index,
  items,
  groupTitle,
}: {
  image: WorkImage;
  locale: Locale;
  index: number;
  items: LightboxItem[];
  groupTitle: string;
}) {
  const { t } = useTranslation();
  const openLightbox = useLightbox();
  const alt = image.alt[locale] || image.alt.zh;

  return (
    <button
      type="button"
      onClick={() => openLightbox({ items, index, title: groupTitle })}
      aria-label={`${alt} — ${t('work.view')}`}
      className="group/icon relative mx-auto block w-full origin-top overflow-hidden border border-line bg-[#0c0916] text-left will-change-transform focus-visible:outline-offset-4"
      // 宽度与艺术海报轮播对齐；高度不超出视口，避免叠放时溢出
      style={{ maxWidth: 'min(100%, calc((100svh - 150px) * 1.778))' }}
    >
      <span className="relative block aspect-[16/9] w-full">
        <img
          src={image.card?.src ?? image.src}
          width={image.card?.w ?? image.w}
          height={image.card?.h ?? image.h}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
        />
      </span>
      <span className="pointer-events-none absolute top-2 left-2 bg-ink/78 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.18em] text-acid backdrop-blur-[2px]">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="pointer-events-none absolute right-2 bottom-2 max-w-[calc(100%-4rem)] truncate bg-ink/82 px-2 py-1 text-[11px] tracking-[0.04em] text-fg/85 backdrop-blur-[2px]">
        {image.label[locale]}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black opacity-[var(--scroll-stack-dim,0)]"
      />
    </button>
  );
}

export function GraphicSection() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';
  const isMobile = useIsMobile();
  const reduce = usePrefersReducedMotion();
  const gpuTier = useGpuEnabled();
  const openLightbox = useLightbox();
  const sectionRef = useRef<HTMLElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [webgl2, setWebgl2] = useState(true);
  const [ditherFailed, setDitherFailed] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);
  // 两个 WebGL 组件都不便宜：接近视口才加载，别让首屏替它们付流量与显存
  const [bgReady, setBgReady] = useState(false);
  const [carouselReady, setCarouselReady] = useState(false);

  useEffect(() => {
    try {
      setWebgl2(!!document.createElement('canvas').getContext('webgl2'));
    } catch {
      setWebgl2(false);
    }
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setBgReady(true);
      setCarouselReady(true);
      return undefined;
    }
    const observers: IntersectionObserver[] = [];
    const watch = (node: HTMLElement | null, margin: string, done: () => void) => {
      if (!node) return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            done();
            io.disconnect();
          }
        },
        { rootMargin: margin },
      );
      io.observe(node);
      observers.push(io);
    };
    watch(sectionRef.current, '500px 0px', () => setBgReady(true));
    watch(posterRef.current, '1200px 0px', () => setCarouselReady(true));
    return () => observers.forEach((io) => io.disconnect());
  }, []);

  const posterItems = graphic.poster.map((poster) => {
    const { title, subtitle } = splitPosterName(poster.label[locale]);
    return {
      src: poster.card?.src ?? poster.src,
      alt: poster.alt[locale],
      title,
      subtitle,
    };
  });

  const posterLightboxItems = toLightboxItems(graphic.poster, locale);
  const iconLightboxItems = toLightboxItems(graphic.icon, locale);

  const currentPoster = graphic.poster[Math.min(posterIndex, graphic.poster.length - 1)] ?? graphic.poster[0];
  const currentName = currentPoster ? splitPosterName(currentPoster.label[locale]) : {
    title: '',
    subtitle: undefined as string | undefined,
  };

  // 低配设备不进 GPU：Dither 与海报轮播都退回静态层
  const gpu = webgl2 && gpuTier && !reduce;
  const showDither = gpu && !ditherFailed && bgReady;

  return (
    <section
      id="graphic"
      ref={sectionRef}
      aria-labelledby="graphic-title"
      data-parallax-scope
      className="relative py-[clamp(72px,11vh,150px)]"
    >
      {/* ---------- 背景：Dither 抖动场（视口大小，随页面粘住） ---------- */}
      <div aria-hidden="true" className="fx-veil pointer-events-none absolute inset-0 -z-10 overflow-clip">
        <div data-depth-bg className="sticky top-0 h-[100svh] w-full overflow-hidden">
          {/* 常驻的紫色渐变：Dither 不可用时它就是唯一氛围层 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 70% 22%, rgba(196,167,255,0.10) 0%, transparent 70%)',
            }}
          />
          {showDither && (
            <div className="absolute inset-0 opacity-[0.3]">
              <Suspense fallback={null}>
                <Dither
                  waveColor="#c4a7ff"
                  backgroundColor="transparent"
                  ditherMode="bayer"
                  colorNum={4}
                  pixelSize={3}
                  waveSpeed={0.03}
                  waveFrequency={3}
                  waveAmplitude={0.3}
                  mouseEffect="erase"
                  mouseRadius={0.3}
                  dpr={1.5}
                  onError={() => setDitherFailed(true)}
                />
              </Suspense>
            </div>
          )}
          {/* 上下压暗，保证长文与卡片标签的对比度 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(8,6,15,0.86) 0%, rgba(8,6,15,0.58) 22%, rgba(8,6,15,0.5) 62%, rgba(8,6,15,0.9) 100%)',
            }}
          />
          <div className="noise-layer absolute inset-0" />
        </div>
      </div>

      <div className="shell">
        <SectionHeading
          id="graphic-title"
          index={t('graphic.index')}
          title={t('graphic.title')}
          en={t('graphic.en')}
          desc={t('graphic.desc')}
        />

        {/* ---------- 品牌 VI：九宫格 ---------- */}
        <div className="mt-[clamp(44px,7vh,88px)]">
          <SubHeading
            title={t('graphic.vi.title')}
            meta={t('graphic.vi.meta', { sets: counts.viSets, count: counts.viImages })}
            desc={t('graphic.vi.desc')}
          />

          <div className="mt-8 space-y-[clamp(32px,4.6vh,60px)]">
            {graphic.vi.map((series, seriesIndex) => (
              <div
                key={series.id}
                className="grid gap-5 border-t border-line pt-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10"
              >
                {/* 左栏：套名，桌面端随滚动吸附 */}
                <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-acid">
                      {String(seriesIndex + 1).padStart(2, '0')}
                    </span>
                    <h4 className="display-zh text-[clamp(1.15rem,2vw,1.55rem)] text-fg">
                      {series.title[locale]}
                    </h4>
                  </div>
                  <p className="mt-2 text-[10px] tracking-[0.16em] text-mute uppercase">
                    {series.title[locale === 'zh' ? 'en' : 'zh']}
                  </p>
                  <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-mute">
                    {series.images.length} PLATES
                  </p>
                </div>

                {/* 右栏：整套 7 张铺满九宫格 */}
                <AnimatedContent distance={30} duration={0.8} threshold={0.12} stagger={0.05}>
                  <ViGrid series={series} locale={locale} />
                </AnimatedContent>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- 艺术海报：Flex Carousel ---------- */}
        <div className="mt-[clamp(56px,9vh,110px)]">
          <SubHeading
            title={t('graphic.poster.title')}
            meta={t('graphic.poster.meta', { count: counts.poster })}
            desc={t('graphic.poster.desc')}
          />

          {/* data-lenis-prevent：滚轮在轮播上时不驱动整页滚动 */}
          <div ref={posterRef} className="relative mt-6" data-lenis-prevent>
            {/* 边框把它和背景区分开，同时让玻璃折射有明确的边界。
                高度放大 → 画布更高、海报更大；说明信息放在画布之外，放大时不会被裁切。 */}
            <div className="relative h-[clamp(520px,78svh,860px)] w-full overflow-hidden border-y border-line">
              {!gpu ? (
                // 低配 / 减少动态：静态网格，仍然能看全 20 张
                <Gallery
                  images={graphic.poster}
                  locale={locale}
                  groupTitle={t('graphic.poster.title')}
                  min={150}
                  ratio={0.707}
                />
              ) : carouselReady ? (
                <Suspense fallback={null}>
                  <FlexCarousel
                    items={posterItems}
                    preset="liquid"
                    intro="rise"
                    fit="natural"
                    cardHeight={isMobile ? 0.66 : 0.62}
                    gap={isMobile ? 10 : 16}
                    radius={2}
                    bend={isMobile ? 0.1 : 0.14}
                    squeeze={0.16}
                    focusOnClick
                    focusScaleMax={1.8}
                    captions={false}
                    captureWheel
                    onChange={(index) => setPosterIndex(index)}
                    onSelect={(index) => setPosterIndex(index)}
                    onActivate={(index) =>
                      openLightbox({
                        items: posterLightboxItems,
                        index,
                        title: t('graphic.poster.title'),
                      })
                    }
                  />
                </Suspense>
              ) : webgl2 ? (
                // 还没滚到附近：只放一块静默骨架，不额外请求图片
                <div aria-hidden="true" className="flex h-full items-center justify-center">
                  <span className="font-mono text-[10px] tracking-[0.24em] text-mute uppercase">
                    {t('graphic.poster.title')}
                  </span>
                </div>
              ) : (
                // 无 WebGL2 时的静态兜底：仍然能看全 20 张，只是没有透镜动效
                <Gallery
                  images={graphic.poster}
                  locale={locale}
                  groupTitle={t('graphic.poster.title')}
                  min={150}
                  ratio={0.707}
                />
              )}
            </div>

            {/* 信息条（画布外，永远完整可见） */}
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-3">
              <div className="flex min-w-0 items-baseline gap-3">
                <span className="font-mono text-[11px] tabular-nums tracking-[0.1em] text-acid">
                  {String(posterIndex + 1).padStart(2, '0')}
                  <span className="text-mute">/{String(counts.poster).padStart(2, '0')}</span>
                </span>
                <span className="display-zh truncate text-[clamp(1rem,1.5vw,1.3rem)] text-fg">
                  {currentName.title}
                </span>
                {currentName.subtitle && (
                  <span className="hidden shrink-0 text-[10px] tracking-[0.16em] text-mute uppercase sm:inline">
                    {currentName.subtitle}
                  </span>
                )}
              </div>
              <span className="shrink-0 font-mono text-[9px] tracking-[0.16em] text-mute uppercase">
                {t('graphic.poster.hint')}
              </span>
            </div>
          </div>
        </div>

        {/* ---------- Icon：滚动叠放 ---------- */}
        <div className="mt-[clamp(56px,9vh,110px)]">
          <SubHeading
            title={t('graphic.icon.title')}
            meta={t('graphic.icon.meta', { count: counts.icon })}
            desc={t('graphic.icon.desc')}
          />

          {reduce ? (
            // 减少动态：同一批卡片平铺，不钉住、不缩放
            <div className="mt-8 space-y-6">
              {graphic.icon.map((image, index) => (
                <IconCard
                  key={image.id}
                  image={image}
                  locale={locale}
                  index={index}
                  items={iconLightboxItems}
                  groupTitle={t('graphic.icon.title')}
                />
              ))}
            </div>
          ) : (
            <Suspense fallback={null}>
              <ScrollStack
                className="mt-4"
                innerClassName="px-0"
                useWindowScroll
                smoothScroll={false}
                itemDistance={48}
                itemStackDistance={22}
                holdDistance={140}
                stackPosition="15%"
              >
                {graphic.icon.map((image, index) => (
                  <IconCard
                    key={image.id}
                    image={image}
                    locale={locale}
                    index={index}
                    items={iconLightboxItems}
                    groupTitle={t('graphic.icon.title')}
                  />
                ))}
              </ScrollStack>
            </Suspense>
          )}
        </div>

        {/* 页脚落款：一行纸边信息 */}
        <div className="mt-[clamp(48px,7vh,90px)] flex items-center justify-between border-t border-line pt-4">
          <p className="text-[10px] tracking-[0.2em] text-mute uppercase">
            {t('graphic.en')} · {counts.viImages + counts.poster + counts.icon} pieces
          </p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-mute">{profile.since}—2026</p>
        </div>
      </div>
    </section>
  );
}
