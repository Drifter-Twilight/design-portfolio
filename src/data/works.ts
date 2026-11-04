/**
 * 作品数据类型与清单读取
 * 清单由 scripts/sync-assets.mjs 生成，勿手改 works.json。
 */
import raw from './works.json';
import { asset } from '@/lib/asset';
import overrides from './overrides.json';

export type Locale = 'zh' | 'en';
export type Bilingual = { zh: string; en: string };

export interface WorkImage {
  src: string;
  w: number;
  h: number;
  id: string;
  label: Bilingual;
  alt: Bilingual;
  /** 轻量副本（长边 1200 的 webp），给 GPU 纹理用；没有则回落到 src */
  card?: { src: string; w: number; h: number };
}

export interface ViSeries {
  id: string;
  title: Bilingual;
  images: WorkImage[];
}

export interface ProductSeries {
  id: string;
  title: Bilingual;
  cover: WorkImage;
  shots: WorkImage[];
  details: WorkImage[];
}

export interface CampaignGroup {
  id: string;
  title: Bilingual;
  images: WorkImage[];
}

export interface CompositeSeries {
  id: string;
  title: Bilingual;
  scene: WorkImage | null;
  blend: WorkImage | null;
}

export interface WorksManifest {
  generatedAt: string;
  source: string;
  graphic: {
    vi: ViSeries[];
    poster: WorkImage[];
    icon: WorkImage[];
  };
  commerce: {
    product: ProductSeries[];
    campaign: CampaignGroup[];
    composite: CompositeSeries[];
    banner: WorkImage[];
  };
  counts: {
    viSets: number;
    viImages: number;
    poster: number;
    icon: number;
    productSets: number;
    productShots: number;
    productDetails: number;
    campaign: number;
    composite: number;
    banner: number;
    total: number;
  };
}

/**
 * 递归给清单里所有绝对路径加上部署前缀。
 * GitHub Pages 项目站点的路径要带 `/<repo>/`，而 JSON 里存的是 `/works-opt/...`。
 */
function withBase<T>(node: T): T {
  if (Array.isArray(node)) return node.map((item) => withBase(item)) as unknown as T;
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      out[key] = typeof value === 'string' && value.startsWith('/') ? asset(value) : withBase(value);
    }
    return out as T;
  }
  return node;
}

/** 录入工具写入的覆盖层：隐藏、改标题、调顺序 */
interface Overrides {
  hidden?: string[];
  titles?: Record<string, Bilingual>;
  order?: Record<string, string[]>;
}

/**
 * 应用 `overrides.json`。
 * 原素材目录 `E:////作品集` 始终是唯一数据源，这一层只记录「你想怎么展示」，
 * 所以重新跑 sync:assets 也不会把手改的内容冲掉。
 */
function applyOverrides(manifest: WorksManifest): WorksManifest {
  const cfg = overrides as Overrides;
  const hidden = new Set(cfg.hidden ?? []);
  const titles = cfg.titles ?? {};
  const order = cfg.order ?? {};

  const rename = <T extends { id: string }>(item: T, key: 'label' | 'title'): T => {
    const next = titles[item.id];
    return next ? ({ ...item, [key]: next } as T) : item;
  };

  const sortBy = <T extends { id: string }>(group: string, list: T[]): T[] => {
    const seq = order[group];
    if (!seq?.length) return list;
    const rank = new Map(seq.map((id, i) => [id, i] as const));
    return [...list].sort((a, b) => (rank.get(a.id) ?? 9e9) - (rank.get(b.id) ?? 9e9));
  };

  const keep = <T extends { id: string }>(list: T[]) => list.filter((x) => !hidden.has(x.id));

  const vi = sortBy('vi', keep(manifest.graphic.vi)).map((x) => rename(x, 'title'));
  const poster = sortBy('poster', keep(manifest.graphic.poster)).map((x) => rename(x, 'label'));
  const icon = sortBy('icon', keep(manifest.graphic.icon)).map((x) => rename(x, 'label'));
  const product = sortBy('product', keep(manifest.commerce.product)).map((x) => rename(x, 'title'));
  const campaign = sortBy('campaign', keep(manifest.commerce.campaign)).map((x) => rename(x, 'title'));
  const composite = sortBy('composite', keep(manifest.commerce.composite)).map((x) => rename(x, 'title'));
  const banner = sortBy('banner', keep(manifest.commerce.banner)).map((x) => rename(x, 'label'));

  const viImages = vi.reduce((n, x) => n + x.images.length, 0);
  const productShots = product.reduce((n, x) => n + x.shots.length, 0);
  const productDetails = product.reduce((n, x) => n + x.details.length, 0);
  const campaignCount = campaign.reduce((n, x) => n + x.images.length, 0);

  return {
    ...manifest,
    graphic: { vi, poster, icon },
    commerce: { product, campaign, composite, banner },
    // 计数要跟着覆盖层重算，否则页面显示的总数和实际展示的对不上
    counts: {
      ...manifest.counts,
      viSets: vi.length,
      viImages,
      poster: poster.length,
      icon: icon.length,
      productSets: product.length,
      productShots,
      productDetails,
      campaign: campaignCount,
      composite: composite.length,
      banner: banner.length,
      total: vi.length + poster.length + icon.length + product.length + campaign.length + composite.length + banner.length,
    },
  };
}

export const works = applyOverrides(withBase(raw) as unknown as WorksManifest);

export const pick = (value: Bilingual, locale: Locale) => value[locale] || value.zh;
