import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ContactIcon } from './ContactIcon';
import { ZoomableImage } from '@/components/work/ZoomableImage';
import { getLenis } from '@/hooks/useSmoothScroll';

interface ResumeDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 简历弹窗：直接呈现实拍简历图（不再解析成结构化文本）。
 * 无障碍：dialog 语义、焦点陷阱、Esc 关闭、锁滚动、关闭后焦点归还触发按钮。
 */
export function ResumeDialog({ open, onClose }: ResumeDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [entered, setEntered] = useState(false);

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

  // Esc 关闭 + Tab 焦点陷阱
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#05040a]/88 backdrop-blur-[6px] transition-opacity duration-300"
        style={{ opacity: entered ? 1 : 0 }}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-title"
        className="relative flex h-[min(92svh,calc(94vw_*_1.414_+_113px))] w-[min(94vw,calc((92svh_-_113px)*0.708_+_28px))] flex-col overflow-hidden border border-line-strong bg-[#0b0812] transition-all duration-300"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.985)',
        }}
      >
        <div className="noise-layer pointer-events-none absolute inset-0" aria-hidden="true" />

        {/* 头部：标题 + 关闭 */}
        <div className="relative flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <ContactIcon kind="resume" />
            <h2 id="resume-title" className="text-[11px] tracking-[0.24em] text-acid uppercase">
              {t('resume.title')}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('resume.close')}
            className="group flex size-8 items-center justify-center border border-line-strong/70 text-dim transition-colors hover:border-acid/60 hover:text-acid"
          >
            <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </div>

        {/* 正文：整张简历图完整呈现（不滚动），滚轮 / 双指可放大 */}
        <div className="relative min-h-0 flex-1 bg-[#07060c] p-2 sm:p-3">
          {/* 绝对定位给百分比高度一个确定基准：flex 项的 auto 高度不会让 h-full 生效 */}
          <div className="absolute inset-2 border border-line/60 sm:inset-3">
            <ZoomableImage
              src="/profile/resume.jpg"
              width={1280}
              height={1810}
              alt={t('resume.imageAlt')}
            />
          </div>
        </div>

        <p className="shrink-0 border-t border-line px-4 py-2 text-center font-mono text-[9px] tracking-[0.2em] text-mute uppercase">
          {t('resume.scrollHint')}
        </p>
      </div>
    </div>,
    document.body,
  );
}
