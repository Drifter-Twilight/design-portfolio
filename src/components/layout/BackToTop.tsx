import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { scrollToTarget } from '@/hooks/useSmoothScroll';

/**
 * 固定右下角的圆形返回顶部。
 * 滚到「关于」及以下才出现（用 #about 的文档位置判定），回到其上自动隐藏；
 * 隐藏时用 invisible，既不可点也不进 Tab 序列。
 */
export function BackToTop() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;

    const measure = () => {
      raf = 0;
      const about = document.getElementById('about');
      const top = about ? about.getBoundingClientRect().top + window.scrollY : 0;
      setShow(window.scrollY >= top - window.innerHeight * 0.25);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => scrollToTarget('#hero', 0)}
      aria-label={t('outro.backTop')}
      className={clsx(
        'fixed right-4 bottom-4 z-[70] flex size-11 items-center justify-center rounded-full',
        'border border-line-strong/70 bg-[#0b0812]/85 text-dim backdrop-blur-sm',
        'shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-all duration-300',
        'hover:border-acid/60 hover:bg-acid/10 hover:text-acid sm:right-6 sm:bottom-6',
        show ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0',
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-[15px]">
        <path d="M8 13V3M8 3L3 8M8 3l5 5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
}
