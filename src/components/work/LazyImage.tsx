import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { acquireSlot, releaseSlot } from '@/lib/imageQueue';

interface LazyImageProps {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** 展示比例，不传则按原始宽高 */
  ratio?: number;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** 加载前的占位文本，例如 "01" / "BEFORE" */
  placeholder?: string;
  onLoad?: () => void;
}

/**
 * 视口感知 + 限流的图片组件。
 * 作品图为原图直引，因此：
 *  1. 进入 300px 预取范围才挂 src（而非一次性全量请求）
 *  2. 通过全局队列把并发解码压到 4 张
 *  3. 用固定 aspect-ratio 占位，杜绝滚动时布局跳动
 */
export function LazyImage({
  src,
  width,
  height,
  alt,
  ratio,
  className,
  imgClassName,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  placeholder,
  onLoad,
}: LazyImageProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const slotHeld = useRef(false);
  const releaseOnceRef = useRef<() => void>(() => {});
  const [visible, setVisible] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (priority) return undefined;
    const node = holderRef.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    let cancelled = false;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          acquireSlot(() => {
            // 排队期间组件可能已卸载（StrictMode 双挂载 / 快速滚动），
            // 这里必须把名额还回去，否则队列会被占满导致后续图片永不加载
            if (cancelled) {
              releaseSlot();
              return;
            }
            slotHeld.current = true;
            setVisible(true);
            // 看门狗：极端情况下（请求被浏览器取消、网络挂起）不会触发 load/error，
            // 超时后先归还名额，避免整条队列被拖死
            window.setTimeout(() => {
              if (!cancelled) releaseOnceRef.current();
            }, 15000);
          });
        }
      },
      { rootMargin: '300px 0px', threshold: 0.01 },
    );
    io.observe(node);

    return () => {
      cancelled = true;
      io.disconnect();
      // 未加载就被卸载：把名额还回去，避免队列卡死
      releaseOnceRef.current();
    };
  }, [priority]);

  // src 变化（切换语言不会变，但数据热更新会）时重置
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  /** 名额只归还一次：加载完成 / 失败 / 卸载 / 看门狗都会调用 */
  const releaseOnce = () => {
    if (!slotHeld.current) return;
    slotHeld.current = false;
    releaseSlot();
  };

  releaseOnceRef.current = releaseOnce;

  const settle = () => {
    setLoaded(true);
    releaseOnce();
    onLoad?.();
  };

  const aspect = ratio ?? (width && height ? width / height : 4 / 3);

  return (
    <div ref={holderRef} className={clsx('frame group', className)} style={{ aspectRatio: String(aspect) }}>
      {/* 占位：微光渐变 + 编号 */}
      <div
        aria-hidden="true"
        className={clsx(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-700',
          loaded ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.012) 48%, rgba(196,167,255,0.055) 100%)',
        }}
      >
        <span className="font-mono text-[10px] tracking-[0.3em] text-mute">{failed ? '—' : (placeholder ?? '')}</span>
      </div>

      {visible && !failed && (
        <img
          src={src}
          width={width || undefined}
          height={height || undefined}
          sizes={sizes}
          alt={alt}
          // 已由 IO + 队列控制时机，再叠一层浏览器 lazy 会导致滚过后请求被取消、永不完成
          loading="eager"
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={settle}
          onError={() => {
            setFailed(true);
            releaseOnce();
          }}
          className={clsx(
            'transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)]',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] tracking-[0.18em] text-mute">IMAGE UNAVAILABLE</span>
        </div>
      )}
    </div>
  );
}
