'use client';

/**
 * 可缩放的图片查看器：滚轮 / 双指捏合缩放、放大后拖动、双击还原。
 * 全站「查看大图」（Lightbox）与简历弹窗共用同一个组件，行为保持一致。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface ZoomableImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** 缩放区间，默认 1–4 倍 */
  min?: number;
  max?: number;
  className?: string;
}

export function ZoomableImage({ src, alt, width, height, min = 1, max = 4, className }: ZoomableImageProps) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const pinch = useRef<{ dist: number; scale: number; mx: number; my: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);

  const commit = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const v = view.current;
    el.style.transform = `translate3d(${v.x.toFixed(2)}px, ${v.y.toFixed(2)}px, 0) scale(${v.scale.toFixed(4)})`;
    const rounded = Math.round(v.scale * 100) / 100;
    setScale((prev) => (prev === rounded ? prev : rounded));
  }, []);

  /** 放大后限制平移范围，别让图被拖出画布 */
  const bound = useCallback(() => {
    const box = wrapRef.current;
    if (!box) return;
    const v = view.current;
    const { width: w, height: h } = box.getBoundingClientRect();
    const mx = Math.max(0, ((v.scale - 1) * w) / 2);
    const my = Math.max(0, ((v.scale - 1) * h) / 2);
    v.x = Math.min(mx, Math.max(-mx, v.x));
    v.y = Math.min(my, Math.max(-my, v.y));
    if (v.scale <= 1) {
      v.x = 0;
      v.y = 0;
    }
  }, []);

  /** 以容器中心为原点缩放：cx / cy 是光标相对中心的坐标 */
  const zoomAt = useCallback(
    (next: number, cx = 0, cy = 0) => {
      const v = view.current;
      const target = Math.min(max, Math.max(min, next));
      if (Math.abs(target - v.scale) < 0.0005) return;
      const k = target / v.scale;
      v.x = cx - k * (cx - v.x);
      v.y = cy - k * (cy - v.y);
      v.scale = target;
      bound();
      commit();
    },
    [bound, commit, max, min],
  );

  const reset = useCallback(() => {
    view.current = { scale: 1, x: 0, y: 0 };
    commit();
  }, [commit]);

  // 换图时回到初始状态
  useEffect(() => {
    view.current = { scale: 1, x: 0, y: 0 };
    setLoaded(false);
    setScale(1);
    if (imgRef.current) imgRef.current.style.transform = '';
  }, [src]);

  // 滚轮缩放：必须 non-passive 才能 preventDefault，否则整页会跟着滚
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = event.clientX - rect.left - rect.width / 2;
      const cy = event.clientY - rect.top - rect.height / 2;
      zoomAt(view.current.scale * Math.exp(-event.deltaY * 0.0016), cx, cy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.current.scale,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };
      drag.current = null;
      setDragging(false);
      return;
    }

    if (view.current.scale > 1) {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: view.current.x, oy: view.current.y };
      el.setPointerCapture?.(event.pointerId);
      setDragging(true);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    const pinchState = pinch.current;
    if (pinchState && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchState.dist > 8) {
        const rect = el.getBoundingClientRect();
        const cx = pinchState.mx - rect.left - rect.width / 2;
        const cy = pinchState.my - rect.top - rect.height / 2;
        zoomAt(pinchState.scale * (dist / pinchState.dist), cx, cy);
      }
      return;
    }

    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    view.current.x = d.ox + (event.clientX - d.x);
    view.current.y = d.oy + (event.clientY - d.y);
    bound();
    commit();
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (drag.current?.id === event.pointerId) {
      const el = wrapRef.current;
      if (el?.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId);
      drag.current = null;
      setDragging(false);
    }
  };

  const onDoubleClick = () => {
    if (view.current.scale > 1.02) reset();
    else zoomAt(2.5, 0, 0);
  };

  return (
    <div
      ref={wrapRef}
      className={clsx(
        'relative flex h-full w-full touch-none items-center justify-center overflow-hidden select-none',
        scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      role="group"
      aria-label={`${alt} — ${t('zoom.hint')}`}
    >
      <img
        key={src}
        ref={imgRef}
        src={src}
        width={width}
        height={height}
        alt={alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={clsx(
          'max-h-full max-w-full object-contain will-change-transform',
          'transition-opacity duration-300 ease-[cubic-bezier(.16,1,.3,1)]',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* 缩放倍率 / 还原：只在放大后出现，避免遮挡画面 */}
      {scale > 1 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            reset();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute right-3 bottom-3 flex items-center gap-2 border border-line-strong/70 bg-ink/85 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-dim uppercase backdrop-blur-sm transition-colors hover:border-acid/60 hover:text-acid"
        >
          {scale.toFixed(1)}× <span className="text-mute">·</span> {t('zoom.reset')}
        </button>
      )}
    </div>
  );
}
