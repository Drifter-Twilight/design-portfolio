import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { LanguageToggle } from './LanguageToggle';
import { profile } from '@/data/profile';
import { scrollToTarget } from '@/hooks/useSmoothScroll';

/** 顶部导航只保留两类作品入口，序号按导航自身连续编号 */
const SECTIONS = [
  { id: 'graphic', index: '01', key: 'nav.graphic' },
  { id: 'commerce', index: '02', key: 'nav.commerce' },
] as const;

export function Header() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>('');
  const rafRef = useRef(0);

  const locale = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';

  // 滚动状态：只在跨过阈值时 setState，避免每帧渲染
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setScrolled(window.scrollY > 40);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 当前区块高亮
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.6] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // 菜单打开时锁滚动 + Esc 关闭
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const go = (id: string) => {
    setMenuOpen(false);
    // 等菜单收起后再滚动，避免锁定状态下的位移错乱
    window.setTimeout(() => scrollToTarget(`#${id}`), menuOpen ? 180 : 0);
  };

  return (
    <>
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-[100] transition-[background-color,border-color,backdrop-filter] duration-500',
          scrolled
            ? 'border-b border-line bg-ink/82 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="shell flex h-[var(--header-h)] items-center justify-between gap-6">
          {/* 标识 */}
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget('#hero', 0);
            }}
            className="group flex items-baseline gap-2.5"
            aria-label={`${profile.name[locale]} — ${t('nav.home')}`}
          >
            <span className="display text-[19px] leading-none tracking-[-0.02em] text-fg">
              {profile.name[locale]}
            </span>
            <span
              aria-hidden="true"
              className="hidden text-[9px] tracking-[0.24em] text-mute uppercase sm:inline"
            >
              Portfolio
            </span>
          </a>

          {/* 桌面导航 */}
          <nav aria-label={t('nav.index')} className="hidden items-center gap-7 md:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(section.id);
                }}
                aria-current={activeId === section.id ? 'true' : undefined}
                className={clsx(
                  'group flex items-baseline gap-1.5 text-[12px] tracking-[0.06em] transition-colors duration-200',
                  activeId === section.id ? 'text-fg' : 'text-mute hover:text-dim',
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    'font-mono text-[9px] tracking-[0.1em] transition-colors',
                    activeId === section.id ? 'text-acid' : 'text-mute/60',
                  )}
                >
                  {section.index}
                </span>
                {t(section.key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* 移动端把语言开关收进菜单里，顶栏只留菜单按钮 */}
            <div className="hidden md:block">
              <LanguageToggle />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t('nav.close') : t('nav.menu')}
              className="flex size-9 flex-col items-center justify-center gap-[5px] border border-line transition-colors hover:border-line-strong md:hidden"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'block h-px w-4 bg-fg transition-transform duration-300',
                  menuOpen && 'translate-y-[3px] rotate-45',
                )}
              />
              <span
                aria-hidden="true"
                className={clsx(
                  'block h-px w-4 bg-fg transition-transform duration-300',
                  menuOpen && '-translate-y-[3px] -rotate-45',
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* 移动端全屏菜单：只剩两个入口 + 语言开关，全部水平居中 */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className={clsx(
          'fixed inset-0 z-[99] flex flex-col items-center justify-center bg-ink px-[var(--gutter)] transition-opacity duration-300 md:hidden',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <nav aria-label={t('nav.index')} className="flex w-full max-w-[20rem] flex-col">
          {SECTIONS.map((section, i) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => {
                e.preventDefault();
                go(section.id);
              }}
              className="group flex items-baseline justify-center gap-4 border-b border-line py-5"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <span aria-hidden="true" className="font-mono text-[10px] tracking-[0.16em] text-acid">
                {section.index}
              </span>
              <span className="display text-[clamp(2rem,9vw,3.25rem)] leading-none text-fg">
                {t(section.key)}
              </span>
            </a>
          ))}
        </nav>

        {/* 无障碍语言开关：移动到导航链接下方并居中 */}
        <LanguageToggle className="mx-auto mt-9 w-fit" />
      </div>
    </>
  );
}
