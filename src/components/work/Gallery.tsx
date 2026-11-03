import { WorkCard } from './WorkCard';
import type { Locale, WorkImage } from '@/data/works';

interface GalleryProps {
  images: WorkImage[];
  locale: Locale;
  groupTitle?: string;
  /** 网格最小列宽（px），实际列数由容器宽度自动决定 */
  min?: number;
  /** 固定展示比例；masonry 模式下忽略，改用图片原始比例 */
  ratio?: number;
  lightboxItems?: WorkImage[];
  /**
   * 本组图片在 lightboxItems 里的起始下标。
   * 例如详情页是「套图 + 详情页」大图组里的后半段，就要传套图张数。
   */
  indexOffset?: number;
  className?: string;
  /** grid：等高网格（适用于比例一致的作品）；masonry：按原始比例瀑布流 */
  layout?: 'grid' | 'masonry';
  /**
   * 窄屏下最小列宽的百分比上限。
   * 传 42 表示手机端至少排 2 列；超宽横幅类（Banner）传 88 让它独占一行。
   */
  narrowMin?: number;
}

/**
 * 自适应网格 / 瀑布流。
 * 用 auto-fill + minmax 而不是固定断点，任何容器宽度下都能得到合理列数；
 * 比例不一致的作品（品牌 VI 套图）走 masonry，避免裁切或大面积留白。
 */
export function Gallery({
  images,
  locale,
  groupTitle,
  min = 200,
  ratio,
  lightboxItems,
  indexOffset = 0,
  className,
  layout = 'grid',
  narrowMin = 42,
}: GalleryProps) {
  const items = lightboxItems ?? images;
  const gap = 'clamp(14px, 1.6vw, 24px)';
  // min() 让固定像素下限在窄屏自动收敛为百分比，避免退化成一列
  const track = `min(${min}px, ${narrowMin}%)`;

  if (layout === 'masonry') {
    // column-width 不接受百分比，改用响应式列数：手机 2 列，桌面 3 列
    return (
      <div
        className={[className, 'columns-2 lg:columns-3'].filter(Boolean).join(' ')}
        style={{ columnGap: gap }}
      >
        {images.map((image, i) => (
          <div key={image.id} style={{ breakInside: 'avoid', marginBottom: gap }}>
            <WorkCard
              image={image}
              index={i}
              locale={locale}
              items={items}
              lightboxIndex={indexOffset + i}
              groupTitle={groupTitle}
              sizes="(max-width: 768px) 50vw, 22vw"
              showIndex={false}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${track}, 1fr))`,
        gap,
      }}
    >
      {images.map((image, i) => (
        <WorkCard
          key={image.id}
          image={image}
          index={i}
          locale={locale}
          ratio={ratio}
          items={items}
          lightboxIndex={indexOffset + i}
          groupTitle={groupTitle}
          sizes="(max-width: 768px) 50vw, 22vw"
        />
      ))}
    </div>
  );
}
