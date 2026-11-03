import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { getLenis } from '@/hooks/useSmoothScroll';
import { ZoomableImage } from './ZoomableImage';

export interface LightboxItem {
  src: string;
  w: number;
  h: number;
  alt: string;
}

interface LightboxProps {
  items: LightboxItem[];
  index: number | null;
  title?: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * 全屏作品预览。
 * 无障碍要点：dialog 语义、焦点陷阱、Esc 关闭、方向键翻页、关闭后焦点归还触发元素。
 */
export function Lightbox({ items, index, title, onClose, onNavigate }: LightboxProps) {
  const { t } = useTranslation();
  const open = index !== null && items.length > 0;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [entered, setEntered] = useState(false);

  const current = open ? items[index] : null;
  const total = items.length;
  const currentIndex = index ?? 0;

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      const next = (currentIndex + delta + total) % total;
      onNavigate(next);
    },
    [currentIndex, total, onNavigate],
  );

  // 打开时记录来源焦点、锁滚动；关闭时还原
  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const lenis = getLenis();
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      setEntered(true);
      closeRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      setEntered(false);
      lenis?.start();
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  // 键盘：Esc / ← → / Tab 焦点陷阱
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
        return;
      }
      if (event.key !== 'Tab') return;

      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, go, onClose]);

  const counter = useMemo(
    () => t('lightbox.counter', { current: currentIndex + 1, total }),
    [t, currentIndex, total],
  );

  if (!open || !current) return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-[120] flex flex-col bg-ink/97 backdrop-blur-[6px] transition-opacity duration-300',
        entered ? 'opacity-100' : 'opacity-0',
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('lightbox.label')}
        className="flex h-full w-full flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶栏：标题 + 计数 + 关闭 */}
        <header className="flex shrink-0 items-center justify-between gap-4 px-[var(--gutter)] py-4">
          <div className="min-w-0">
            {title && (
              <p className="truncate text-[11px] font-medium tracking-[0.22em] text-mute uppercase">{title}</p>
            )}
            <p className="mt-1 font-mono text-[12px] tabular-nums text-dim" aria-live="polite">
              {counter}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('lightbox.close')}
            className="group flex items-center gap-2 border border-line px-4 py-2 text-[11px] tracking-[0.2em] text-dim uppercase transition-colors hover:border-line-strong hover:text-fg"
          >
            <span className="hidden sm:inline">ESC</span>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className="sr-only">{t('lightbox.close')}</span>
          </button>
        </header>

        {/* 主图 */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-[var(--gutter)] pb-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t('lightbox.prev')}
            className="absolute left-2 z-10 flex size-11 items-center justify-center border border-line text-dim transition-colors hover:border-acid hover:text-acid md:left-6"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
              <path d="M10 2L4 8l6 6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          {/* 滚轮 / 双指缩放，放大后可拖动，双击还原 */}
          <ZoomableImage
            key={current.src}
            src={current.src}
            width={current.w || undefined}
            height={current.h || undefined}
            alt={current.alt}
            className="px-14 md:px-20"
          />

          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t('lightbox.next')}
            className="absolute right-2 z-10 flex size-11 items-center justify-center border border-line text-dim transition-colors hover:border-acid hover:text-acid md:right-6"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
              <path d="M6 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <footer className="shrink-0 px-[var(--gutter)] pb-4">
          <p className="text-center text-[10px] tracking-[0.22em] text-mute uppercase">{t('lightbox.hint')}</p>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
