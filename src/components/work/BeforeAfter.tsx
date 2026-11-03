import { useCallback, useEffect, useRef, useState } from 'react';
import { LazyImage } from './LazyImage';

export interface BeforeAfterSide {
  src: string;
  w: number;
  h: number;
  alt: string;
  label: string;
}

interface BeforeAfterProps {
  before: BeforeAfterSide;
  after: BeforeAfterSide;
  /** 展示比例，两侧素材同比例时对齐最准 */
  ratio?: number;
  sizes?: string;
  /** 无障碍名称，例如「蓝牙耳机 场景与融合对比」 */
  label: string;
  /** 初始分割位置（百分比） */
  initial?: number;
}

/**
 * Before / After 拖动对比。
 *
 * - 两层图片绝对叠放，上层用 clip-path 按分割位置裁切
 * - 指针按住任意位置即可拖动（触屏用 touch-action: pan-y，纵向滚动仍交给页面）
 * - 手柄是 role="slider"，支持 ← → / Home / End，键盘可用
 * - 图片纯展示，不可点击放大大图
 */
export function BeforeAfter({ before, after, ratio = 3 / 4, sizes, label, initial = 50 }: BeforeAfterProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const node = stageRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      updateFromClientX(event.clientX);
    };
    const stop = () => setDragging(false);

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [dragging, updateFromClientX]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    stageRef.current?.setPointerCapture?.(event.pointerId);
    setHinted(true);
    setDragging(true);
    updateFromClientX(event.clientX);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = pos - step;
    else if (event.key === 'ArrowRight') next = pos + step;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 100;
    if (next === null) return;
    event.preventDefault();
    setHinted(true);
    setPos(Math.min(100, Math.max(0, next)));
  };

  const rounded = Math.round(pos);

  return (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      className="ba-frame frame relative w-full cursor-ew-resize select-none !border-0"
      style={{ aspectRatio: String(ratio), touchAction: 'pan-y' }}
    >
      {/* 底层：融合图（完整可见） */}
      <LazyImage
        src={after.src}
        width={after.w}
        height={after.h}
        alt={after.alt}
        ratio={ratio}
        sizes={sizes}
        className="absolute inset-0 !border-0"
        imgClassName="!object-cover"
        placeholder="AFTER"
      />

      {/* 上层：场景图，按分割位置裁切 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <LazyImage
          src={before.src}
          width={before.w}
          height={before.h}
          alt={before.alt}
          ratio={ratio}
          sizes={sizes}
          className="absolute inset-0 !border-0"
          imgClassName="!object-cover"
          placeholder="BEFORE"
        />
      </div>

      {/* 角标 */}
      <span
        aria-hidden="true"
        className="absolute top-2 left-2 z-[2] border border-line-strong bg-ink/80 px-1.5 py-0.5 font-mono text-[8px] tracking-[0.18em] text-fg/70 uppercase"
        style={{ opacity: pos > 14 ? 1 : 0, transition: 'opacity 200ms' }}
      >
        {before.label}
      </span>
      <span
        aria-hidden="true"
        className="absolute top-2 right-2 z-[2] border border-acid/50 bg-ink/80 px-1.5 py-0.5 font-mono text-[8px] tracking-[0.18em] text-acid uppercase"
        style={{ opacity: pos < 86 ? 1 : 0, transition: 'opacity 200ms' }}
      >
        {after.label}
      </span>

      {/* 分割线与手柄 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-[3] w-px bg-fg/70"
        style={{ left: `${pos}%` }}
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded}%`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        className="absolute top-1/2 z-[4] flex size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-fg/40 bg-ink/85 text-fg shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-[border-color,color] duration-300 hover:border-acid hover:text-acid focus-visible:border-acid focus-visible:text-acid"
        style={{ left: `${pos}%`, touchAction: 'none' }}
      >
        <svg viewBox="0 0 20 12" aria-hidden="true" fill="none" className="size-[18px]">
          <path d="M6.5 2 2.5 6l4 4M13.5 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </div>

      {/* 首次提示：拖动后消失 */}
      {!hinted && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-1/2 z-[4] -translate-x-1/2 border border-line-strong bg-ink/85 px-2 py-1 font-mono text-[8px] tracking-[0.16em] text-dim uppercase"
        >
          drag
        </span>
      )}
    </div>
  );
}
