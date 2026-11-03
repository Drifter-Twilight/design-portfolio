/**
 * 作品数据类型与清单读取
 * 清单由 scripts/sync-assets.mjs 生成，勿手改 works.json。
 */
import raw from './works.json';
import { asset } from '@/lib/asset';

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

export const works = withBase(raw) as unknown as WorksManifest;

export const pick = (value: Bilingual, locale: Locale) => value[locale] || value.zh;
