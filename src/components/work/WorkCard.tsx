import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { LazyImage } from './LazyImage';
import { useLightbox } from './LightboxProvider';
import type { Locale, WorkImage } from '@/data/works';

interface WorkCardProps {
  image: WorkImage;
  index: number;
  locale: Locale;
  /** 展示比例，默认按原图 */
  ratio?: number;
  /** 点击后在 lightbox 里翻页的同组图片 */
  items: WorkImage[];
  /** 在 items 里的起始下标：本卡属于 items 的一个子集时用它对齐大图 */
  lightboxIndex?: number;
  groupTitle?: string;
  priority?: boolean;
  sizes?: string;
  /** 瀑布流纵向排列时序号会跳号，可关闭 */
  showIndex?: boolean;
}

/**
 * 单张作品卡：整块是 button，键盘可聚焦、可回车打开。
 * hover 只做 transform / border 变化，避免触发布局重排。
 */
export function WorkCard({
  image,
  index,
  locale,
  ratio,
  items,
  lightboxIndex,
  groupTitle,
  priority = false,
  sizes,
  showIndex = true,
}: WorkCardProps) {
  const { t } = useTranslation();
  const openLightbox = useLightbox();
  const label = image.label[locale] || image.label.zh;
  const alt = image.alt[locale] || image.alt.zh;

  return (
    <button
      type="button"
      className="group/card block w-full text-left focus-visible:outline-offset-4"
      aria-label={`${alt} — ${t('work.view')}`}
      onClick={() =>
        openLightbox({
          items: items.map((item) => ({ src: item.src, w: item.w, h: item.h, alt: item.alt[locale] || item.alt.zh })),
          index: lightboxIndex ?? index,
          title: groupTitle,
        })
      }
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        {showIndex ? (
          <span className="font-mono text-[10px] tabular-nums tracking-[0.2em] text-mute">
            {String(index + 1).padStart(2, '0')}
          </span>
        ) : (
          <span aria-hidden="true" className="h-px w-3 bg-line-strong" />
        )}
        <span className="truncate text-[11px] tracking-[0.12em] text-dim transition-colors group-hover/card:text-fg">
          {label}
        </span>
      </div>

      <div className="relative">
        <LazyImage
          /* 网格卡片很小，优先用 900px 的卡片副本；大图留给 Lightbox */
          src={image.card?.src ?? image.src}
          width={image.card?.w ?? image.w}
          height={image.card?.h ?? image.h}
          alt={alt}
          ratio={ratio}
          priority={priority}
          sizes={sizes}
          placeholder={String(index + 1).padStart(2, '0')}
        />
        {/* 打开提示：只在能 hover 的设备上出现 */}
        <span
          aria-hidden="true"
          className={clsx(
            'pointer-events-none absolute right-2 bottom-2 hidden items-center gap-1.5',
            'border border-acid/40 bg-ink/85 px-2.5 py-1.5 text-[10px] tracking-[0.16em] text-acid uppercase',
            'translate-y-1 opacity-0 transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)]',
            'group-hover/card:translate-y-0 group-hover/card:opacity-100 md:flex',
          )}
        >
          {t('work.view')}
        </span>
      </div>
    </button>
  );
}
