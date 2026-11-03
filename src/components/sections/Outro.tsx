import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RippleGrid from '@/components/reactbits/RippleGrid';
import StrokeText from '@/components/reactbits/StrokeText';
import { ContactIcon } from './ContactIcon';
import { profile } from '@/data/profile';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useGpuEnabled } from '@/hooks/usePerfTier';

/** 主色与次级紫，StrokeText 的描边 / 阴影统一取这两支 */
const ACCENT = '#c4a7ff';
const ACCENT_DEEP = '#7c5cff';

/** 中英混排时的字体栈：西文走 Anton，中文回落到系统黑体 */
const DISPLAY_STACK = "'Anton', 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif";

export function Outro() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';
  const reduce = usePrefersReducedMotion();
  const gpu = useGpuEnabled();
  const [gridFailed, setGridFailed] = useState(false);

  // WebGL2 不可用或初始化失败时退回 CSS 网格，不会出现空白天窗
  const showGrid = !reduce && gpu && !gridFailed;

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="relative flex min-h-[calc(100svh-64px)] flex-col overflow-hidden pt-[clamp(76px,9vh,104px)]"
    >
      {/* ---------- 背景：Ripple Grid ---------- */}
      <div aria-hidden="true" data-depth-bg className="fx-veil pointer-events-none absolute inset-0 -z-10">
        {/* 常驻的氛围层，兜住任何 GPU 失败 */}
        <div className="tech-grid absolute inset-0 opacity-45" />
        <div className="glow-cold absolute inset-0" />
        {showGrid && (
          <div className="absolute inset-0 opacity-95">
            {/* 关掉指针跟随（mouseInteraction），保留点击涟漪（clickRipple 默认 true） */}
            <RippleGrid color="#ffffff" mouseInteraction={false} onError={() => setGridFailed(true)} />
          </div>
        )}
        {/* 中部柔光暗化，保证致谢文案与联系方式的对比度 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 62% 54% at 50% 48%, rgba(8,6,15,0.56) 0%, rgba(8,6,15,0.3) 46%, rgba(8,6,15,0.08) 72%, transparent 88%)',
          }}
        />
        <div className="noise-layer absolute inset-0" />
      </div>

      <div className="shell relative flex flex-1 flex-col" data-depth>
        {/* 章节标头：序号位置改为「结束」 */}
        <div className="flex items-baseline justify-between gap-6 border-t border-line pt-5">
          <span className="font-mono text-[10.5px] tracking-[0.24em] text-acid">{t('outro.index')}</span>
          <span className="text-[10px] tracking-[0.26em] text-mute uppercase">{t('outro.label')}</span>
        </div>

        {/* 居中主体 */}
        <div className="flex flex-1 flex-col items-center justify-center py-[clamp(24px,5vh,56px)] text-center">
          {/* 描边装饰文本（在主文本上方） */}
          <div className="w-full max-w-[720px]" aria-hidden="true">
            <StrokeText
              text={t('outro.decor')}
              fontSize={54}
              fontWeight={500}
              fontFamily="'Space Grotesk', sans-serif"
              letterSpacing={-1.2}
              strokeColor={ACCENT}
              strokeWidth={1.2}
              fillColor="rgba(196,167,255,0.14)"
              shadow
              shadowColor={ACCENT_DEEP}
              trigger="scroll"
              drawDuration={1.5}
              stagger={0.012}
              hoverRedraw
            />
          </div>

          {/* 主文本：感谢浏览 */}
          <h2 id="contact-title" className="sr-only">
            {t('outro.title')}
          </h2>
          <div className="mt-[clamp(6px,1.4vh,16px)] w-full max-w-[820px]" aria-hidden="true">
            <StrokeText
              text={t('outro.title')}
              fontSize={locale === 'zh' ? 156 : 122}
              fontWeight={locale === 'zh' ? 700 : 800}
              fontFamily={DISPLAY_STACK}
              letterSpacing={locale === 'zh' ? 2 : -4}
              strokeColor={ACCENT}
              strokeWidth={1.3}
              fillColor="#f2f0f7"
              shadow
              shadowColor={ACCENT_DEEP}
              trigger="scroll"
              drawDuration={1.3}
              stagger={0.06}
              hoverRedraw
            />
          </div>

          {/* 副文本 */}
          <p className="mt-[clamp(18px,3vh,30px)] max-w-[46ch] text-[clamp(0.8125rem,0.45vw + 0.55rem,1rem)] leading-[1.85] text-dim">
            {t('outro.desc')}
          </p>

          {/* 联系方式 */}
          <div className="mt-[clamp(22px,3.6vh,36px)] flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="group flex w-full max-w-[300px] items-center justify-center gap-2.5 border border-line-strong/70 px-4 py-2.5 text-[12.5px] text-dim transition-colors hover:border-acid/60 hover:bg-acid/5 hover:text-acid sm:w-auto"
            >
              <ContactIcon kind="email" />
              {profile.email}
            </a>
            <span className="flex w-full max-w-[300px] items-center justify-center gap-2.5 border border-line-strong/70 px-4 py-2.5 text-[12.5px] text-dim sm:w-auto">
              <ContactIcon kind="wechat" />
              {profile.wechat}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 页脚只保留左下角一行版权，其余入口由固定圆形返回顶部承担 */
export function SiteFooter() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="shell py-6">
        <p className="text-[10px] tracking-[0.14em] text-mute">
          © {year} {profile.name[locale]} · {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
