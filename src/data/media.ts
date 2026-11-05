import { asset } from '@/lib/asset';
import raw from './profile-media.json';

/**
 * 头像 / 简历的地址与尺寸。
 *
 * 数据由 `tools/admin/profile-assets.mjs` 生成（管理界面替换图片时也会写它），
 * 不要手改：`w` / `h` 是页面占位的依据，写错会让图片加载完的瞬间跳一下。
 *
 * `?v=` 是内容指纹。文件名固定，换图后缓存会继续给旧图；
 * URL 带上指纹才能保证「换了就一定拉到新的」。
 */
export interface MediaSlot {
  src: string;
  w: number;
  h: number;
  v?: string;
  bytes?: number;
  updatedAt?: string;
}

const versioned = (slot: MediaSlot): MediaSlot => ({
  ...slot,
  src: `${asset(slot.src)}${slot.v ? `?v=${slot.v}` : ''}`,
});

export const media = {
  photo: versioned(raw.photo as MediaSlot),
  resume: versioned(raw.resume as MediaSlot),
};
