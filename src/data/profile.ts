import { media } from '@/data/media';

/**
 * 个人信息 —— 全站唯一需要你手改的地方。
 */

export const profile = {
  /** 展示名（Header / 页脚使用） */
  name: { zh: 'Witt He', en: 'Witt He' },
  /** 中文姓名 */
  nameZh: '何宥纬',
  /** 英文名 */
  nameEn: 'Witt He',
  /**
   * 个人照片：地址与尺寸来自 `src/data/profile-media.json`，
   * 在录入工具（admin.bat）的「个人资料」里替换，不要手改这里。
   */
  photo: media.photo.src,
  /** 微信 */
  wechat: 'w13420506578',
  /** 职业抬头 */
  role: { zh: '视觉设计师', en: 'Visual Designer' },
  /** 所在城市 */
  city: { zh: '中国 · 杭州', en: 'Hangzhou, China' },
  /** 邮箱：留空则尾页不显示邮件入口 */
  email: '2696259805@qq.com',
  /** 社交链接：删掉不需要的项即可 */
  socials: [
    { label: 'Behance', href: 'https://www.behance.net/' },
    { label: '站酷 ZCOOL', href: 'https://www.zcool.com.cn/' },
    { label: '小红书', href: 'https://www.xiaohongshu.com/' },
  ],
  /** 首屏文案：主标题交给 TechText 渲染，副标题保持英文 */
  hero: {
    welcome: { zh: '欢迎来到', en: 'Welcome to' },
    title: { zh: 'Witt He的个人设计作品集', en: "Witt He's Design Portfolio" },
    subtitle: 'Graphic & E-commerce Design',
  },
  /** 作品集起始年份，与当前年份组成时间跨度 */
  since: 2023,
} as const;
