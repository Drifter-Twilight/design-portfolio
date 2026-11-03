import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedContent from '@/components/reactbits/AnimatedContent';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import ScrollVelocity from '@/components/reactbits/ScrollVelocity';
import { Gallery } from '@/components/work/Gallery';
import { useLightbox } from '@/components/work/LightboxProvider';
import type { LightboxItem } from '@/components/work/Lightbox';
import { BeforeAfter } from '@/components/work/BeforeAfter';
import { SectionHeading, SubHeading } from './SectionHeading';
import { works } from '@/data/works';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useGpuEnabled } from '@/hooks/usePerfTier';

// 三个都是体积不小的动效组件，按需加载，首屏主包不为它们付代价
const LineWaves = lazy(() => import('@/components/reactbits/LineWaves'));
const CircularGallery = lazy(() => import('@/components/reactbits/CircularGallery'));
const DepthCarousel = lazy(() => import('@/components/reactbits/DepthCarousel'));

const { commerce, counts } = works;

/**
 * 尾随跑马灯：中英两行固定文案，不参与语言切换（两行的 ✳ 分隔符保持一致）。
 */
const MARQUEE_TEXTS = ['平面设计 ✳ 电商设计 ✳ AIGC设计 ✳', 'GRAPHIC DESIGN ✳ E-COMMERCE DESIGN ✳ AIGC DESIGN ✳'];

/** 圆环画廊的标题字体：与全站 UI 字保持一致，不额外拉 Google Fonts */
const GALLERY_FONT = '600 30px "Space Grotesk", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

export function CommerceSection() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';
  const reduce = usePrefersReducedMotion();
  const gpuTier = useGpuEnabled();
  // 低配 / 减少动态：线波、圆环画廊、自动轮播全部退到静态层
  const gpu = gpuTier && !reduce;
  const openLightbox = useLightbox();
  const sectionRef = useRef<HTMLElement>(null);
  const campaignRef = useRef<HTMLDivElement>(null);
  // 两个都是 WebGL 重组件：接近视口才建上下文，首屏不为它们付代价（也让移动端上下文数不爆）
  const [waveReady, setWaveReady] = useState(false);
  const [galleryReady, setGalleryReady] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setWaveReady(true);
      setGalleryReady(true);
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
    watch(sectionRef.current, '700px 0px', () => setWaveReady(true));
    watch(campaignRef.current, '800px 0px', () => setGalleryReady(true));
    return () => observers.forEach((io) => io.disconnect());
  }, []);

  // 营销海报：15 张合成一条流水（不再按服饰 / 日化 / 食品分组）
  const campaignItems = useMemo(
    () =>
      commerce.campaign.flatMap((group) =>
        group.images.map((image) => ({
          image: image.card?.src ?? image.src,
          text: image.label[locale] || image.label.zh,
          alt: image.alt[locale] || image.alt.zh,
        })),
      ),
    [locale],
  );

  // 营销海报 / Banner 的大图组（二次点击进入）
  const campaignLightbox = useMemo<LightboxItem[]>(
    () =>
      commerce.campaign.flatMap((group) =>
        group.images.map((image) => ({
          src: image.src,
          w: image.w,
          h: image.h,
          alt: image.alt[locale] || image.alt.zh,
        })),
      ),
    [locale],
  );

  const bannerLightbox = useMemo<LightboxItem[]>(
    () =>
      commerce.banner.map((image) => ({
        src: image.src,
        w: image.w,
        h: image.h,
        alt: image.alt[locale] || image.alt.zh,
      })),
    [locale],
  );

  // Banner 用长边 1400 的 webp 副本，原图单张 5.8 MB
  const bannerItems = useMemo(
    () =>
      commerce.banner.map((image) => ({
        image: image.card?.src ?? image.src,
        alt: image.alt[locale] || image.alt.zh,
      })),
    [locale],
  );

  return (
    <section
      id="commerce"
      ref={sectionRef}
      aria-labelledby="commerce-title"
      data-parallax-scope
      className="relative py-[clamp(72px,11vh,150px)]"
    >
      {/* ---------- 背景：LineWaves 线波，铺满整个电商设计区 ---------- */}
      <div aria-hidden="true" className="fx-veil pointer-events-none absolute inset-0 -z-10 overflow-clip">
        <div data-depth-bg className="sticky top-0 h-[100svh] w-full overflow-hidden">
          {/* 常驻氛围层：WebGL2 不可用 / 关闭动效时的唯一背景 */}
          <div className="tech-grid absolute inset-0 opacity-35" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 62% 48% at 22% 26%, rgba(124,92,255,0.10) 0%, transparent 70%)',
            }}
          />
          {gpu && waveReady && (
            <div className="absolute inset-0 opacity-90">
              <Suspense fallback={null}>
                <LineWaves
                  color1="#e6dbff"
                  color2="#bda4f0"
                  color3="#7f68c0"
                  speed={0.24}
                  lineCount={130}
                  lineWidth={0.9}
                  glow={0.5}
                  brightness={1.25}
                  highlight={0.72}
                  highlightWidth={1.5}
                  warpIntensity={1}
                  warpScale={1.1}
                  rotation={-33}
                  edgeFade={0.42}
                  enableMouseInteraction
                  mouseInfluence={1.6}
                  clickRipple={false}
                  opacity={0.62}
                  maxDevicePixelRatio={1.75}
                />
              </Suspense>
            </div>
          )}
          {/* 上下压暗，保证长文与卡片标签的对比度 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(8,6,15,0.88) 0%, rgba(8,6,15,0.44) 14%, rgba(8,6,15,0.36) 68%, rgba(8,6,15,0.9) 100%)',
            }}
          />
          <div className="noise-layer absolute inset-0" />
        </div>
      </div>

      <div className="shell" data-depth>
        <SectionHeading
          id="commerce-title"
          index={t('commerce.index')}
          title={t('commerce.title')}
          en={t('commerce.en')}
          desc={t('commerce.desc')}
        />

        {/* ---------- 商品套图 + 详情页 ---------- */}
        <div className="mt-[clamp(44px,7vh,88px)]">
          <SubHeading
            title={t('commerce.product.title')}
            meta={t('commerce.product.meta', {
              sets: counts.productSets,
              shots: counts.productShots,
              details: counts.productDetails,
            })}
            desc={t('commerce.product.desc')}
          />

          <div className="mt-8 space-y-[clamp(24px,3.5vh,44px)]">
            {commerce.product.map((series, seriesIndex) => {
              const all = [...series.shots, ...series.details];
              return (
                <AnimatedContent key={series.id} distance={34} duration={0.85} threshold={0.08}>
                  <SpotlightCard
                    theme="dark"
                    className="!rounded-none !bg-transparent !p-0 !shadow-none"
                    spotlightColor="rgba(196,167,255,0.55)"
                    intensity={0.06}
                    spotlightSize={520}
                    borderGlow={0.22}
                    proximity={120}
                  >
                    <div className="border border-line p-[clamp(16px,2.4vw,32px)]">
                      {/* 套系头部 */}
                      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
                        <div className="flex items-baseline gap-3">
                          <span className="font-mono text-[10px] tracking-[0.2em] text-acid">
                            {String(seriesIndex + 1).padStart(2, '0')}
                          </span>
                          <h4 className="display-zh text-[clamp(1.1rem,2vw,1.5rem)] text-fg">
                            {series.title[locale]}
                          </h4>
                          <span className="hidden text-[10px] tracking-[0.14em] text-mute uppercase sm:inline">
                            {series.title[locale === 'zh' ? 'en' : 'zh']}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] tracking-[0.14em] text-mute">
                          {series.shots.length} + {series.details.length}
                        </p>
                      </div>

                      {/* 商品套图 */}
                      <div className="mt-5">
                        <p className="mb-3 flex items-baseline gap-2">
                          <span className="text-[10px] tracking-[0.2em] text-dim uppercase">
                            {t('commerce.product.shots')}
                          </span>
                          <span className="font-mono text-[9px] text-mute">
                            {String(series.shots.length).padStart(2, '0')}
                          </span>
                        </p>
                        <Gallery
                          images={series.shots}
                          locale={locale}
                          lightboxItems={all}
                          groupTitle={`${series.title[locale]} · ${t('commerce.product.shots')}`}
                          min={150}
                          ratio={1}
                        />
                      </div>

                      {/* 详情页：切片更窄，横向铺开；大图组从套图之后接续，索引要偏移 */}
                      <div className="mt-7">
                        <p className="mb-3 flex items-baseline gap-2">
                          <span className="text-[10px] tracking-[0.2em] text-dim uppercase">
                            {t('commerce.product.details')}
                          </span>
                          <span className="font-mono text-[9px] text-mute">
                            {String(series.details.length).padStart(2, '0')}
                          </span>
                        </p>
                        <Gallery
                          images={series.details}
                          locale={locale}
                          lightboxItems={all}
                          indexOffset={series.shots.length}
                          groupTitle={`${series.title[locale]} · ${t('commerce.product.details')}`}
                          min={108}
                          ratio={1}
                        />
                      </div>
                    </div>
                  </SpotlightCard>
                </AnimatedContent>
              );
            })}
          </div>
        </div>

        {/* ---------- 营销海报：Circular Gallery（不分品类，一条流水） ---------- */}
        <div className="mt-[clamp(56px,9vh,110px)]">
          <SubHeading
            title={t('commerce.campaign.title')}
            meta={t('commerce.campaign.meta', { count: counts.campaign })}
            desc={t('commerce.campaign.desc')}
          />

          <div
            ref={campaignRef}
            className={gpu ? 'relative mt-6 h-[clamp(420px,58svh,600px)] w-full' : 'relative mt-6 w-full'}
            data-lenis-prevent={gpu || undefined}
          >
            {!gpu && (
              // 静态兜底：网格铺开 15 张，不再有弧形与滚轮接管
              <Gallery
                images={commerce.campaign.flatMap((group) => group.images)}
                locale={locale}
                groupTitle={t('commerce.campaign.title')}
                min={128}
                ratio={9 / 16}
              />
            )}
            {gpu && galleryReady && (
              <Suspense fallback={null}>
              <CircularGallery
                items={campaignItems}
                bend={3}
                itemSize={1.2}
                itemAspect={0.58}
                gap={0.18}
                borderRadius={0.02}
                textColor="#f2f0f7"
                font={GALLERY_FONT}
                scrollSpeed={2}
                scrollEase={0.06}
                fadeEdges={0.17}
                shadow={0.32}
                autoScroll={0.4}
                snap
                showTitles={false}
                ariaLabel={t('commerce.campaign.title')}
                onActivate={(_, index) =>
                  openLightbox({ items: campaignLightbox, index, title: t('commerce.campaign.title') })
                }
              />
              </Suspense>
            )}
          </div>

          <p className="mt-3 font-mono text-[9px] tracking-[0.16em] text-mute uppercase">
            {t('commerce.campaign.hint')}
          </p>
        </div>

        {/* ---------- 产品溶图：拖动对比 ---------- */}
        <div className="mt-[clamp(56px,9vh,110px)]">
          <SubHeading
            title={t('commerce.composite.title')}
            meta={t('commerce.composite.meta', { count: counts.composite })}
            desc={t('commerce.composite.desc')}
          />

          <div className="mt-8 grid gap-[clamp(24px,3vw,40px)] sm:grid-cols-2 xl:grid-cols-3">
            {commerce.composite.map((series, i) => {
              if (!series.scene || !series.blend) return null;
              const before = series.scene;
              const after = series.blend;
              return (
                <AnimatedContent key={series.id} distance={28} duration={0.8} threshold={0.12} delay={i * 0.05}>
                  <figure className="border border-line">
                    <figcaption className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
                      <span className="display-zh text-[13px] text-fg">{series.title[locale]}</span>
                      <span className="font-mono text-[9px] tracking-[0.14em] text-mute">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </figcaption>

                    {/* 纯展示：不接 lightbox，图片本身不可点击 */}
                    <BeforeAfter
                      label={`${series.title[locale]} — ${t('commerce.composite.before')} / ${t('commerce.composite.after')}`}
                      before={{
                        src: before.src,
                        w: before.w,
                        h: before.h,
                        alt: before.alt[locale],
                        label: t('commerce.composite.before'),
                      }}
                      after={{
                        src: after.src,
                        w: after.w,
                        h: after.h,
                        alt: after.alt[locale],
                        label: t('commerce.composite.after'),
                      }}
                      ratio={3 / 4}
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  </figure>
                </AnimatedContent>
              );
            })}
          </div>
        </div>

        {/* ---------- Banner：Depth Carousel ---------- */}
        <div className="mt-[clamp(56px,9vh,110px)]">
          <SubHeading
            title={t('commerce.banner.title')}
            meta={t('commerce.banner.meta', { count: counts.banner })}
            desc={t('commerce.banner.desc')}
          />

          <div className="mt-8 h-[clamp(340px,46svh,460px)] w-full overflow-x-clip">
            <Suspense fallback={null}>
            <DepthCarousel
                items={bannerItems}
                cardWidth={680}
                cardHeight={213}
                radius={2}
                tint="#05060a"
                depth={180}
                spread={120}
                tilt={24}
                tiltDirection="right"
                perspective={1500}
                visibleCards={3}
                falloff={0.12}
                blur={4}
                autoplay={!reduce && gpuTier}
                autoplayDelay={3400}
                loop
                showControls
                showIndicators
                ariaLabel={t('commerce.banner.title')}
                onActivate={(index) =>
                  openLightbox({ items: bannerLightbox, index, title: t('commerce.banner.title') })
                }
            />
            </Suspense>
          </div>

          <p className="mt-3 font-mono text-[9px] tracking-[0.16em] text-mute uppercase">
            {t('commerce.banner.hint')}
          </p>
        </div>

        <div className="mt-[clamp(48px,7vh,90px)] flex items-center justify-between border-t border-line pt-4">
          <p className="text-[10px] tracking-[0.2em] text-mute uppercase">
            {t('commerce.en')} ·{' '}
            {counts.productShots + counts.productDetails + counts.campaign + counts.composite * 2 + counts.banner}{' '}
            pieces
          </p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-mute">2026</p>
        </div>
      </div>

      {/* 区块收尾：两行大字跑马灯，直接接住页尾 */}
      <div data-marquee className="relative mt-[clamp(48px,8vh,96px)] select-none overflow-hidden" aria-hidden="true">
        {!gpu ? (
          <div className="space-y-1 overflow-hidden px-[var(--gutter)] py-1">
            {MARQUEE_TEXTS.map((text) => (
              <p
                key={text}
                className="display text-[clamp(1.5rem,5vw,3.6rem)] leading-[1] whitespace-nowrap text-fg/12"
              >
                {text}
              </p>
            ))}
          </div>
        ) : (
          <ScrollVelocity
            texts={MARQUEE_TEXTS}
            velocity={54}
            numCopies={4}
            gap={28}
            fadeEdges
            outlineAlternate
            fontSize="clamp(3rem, 11.5vw, 8.7rem)"
            className="display font-normal tracking-[-0.03em] text-fg/85"
          />
        )}
      </div>
    </section>
  );
}
