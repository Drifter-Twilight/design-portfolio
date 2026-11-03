/**
 * 简历数据 —— 弹窗内容的结构化部分。
 *
 * 文字类内容（简介、核心能力、栏目标题）在中英文案文件里：
 *   src/i18n/zh.ts → resume / about
 *   src/i18n/en.ts → resume / about
 *
 * 下面两个数组默认留空：填进去就会在弹窗里渲染对应栏目，留空则整栏不显示。
 * 这样不会出现替用户编造的履历。
 */

export interface ResumeEntry {
  /** 时间区间，例如 2021.06 — 2023.04 / 至今 */
  period: { zh: string; en: string };
  /** 公司 / 学校 */
  org: { zh: string; en: string };
  /** 职位 / 专业 */
  role: { zh: string; en: string };
  /** 每条一句，建议不超过 26 个字 */
  bullets: { zh: string[]; en: string[] };
}

/**
 * 工作经历示例（复制一份去掉注释即可启用）：
 *
 * {
 *   period: { zh: '2023.04 — 至今', en: 'Apr 2023 — Present' },
 *   org: { zh: '某某品牌', en: 'Brand Co.' },
 *   role: { zh: '电商视觉设计师', en: 'E-commerce Visual Designer' },
 *   bullets: {
 *     zh: ['负责店铺首页与详情页的视觉体系搭建', '主导 12 次大促的投放素材产出'],
 *     en: ['Built the storefront and detail-page visual system', 'Led creative for 12 campaign pushes'],
 *   },
 * },
 */
export const experience: ResumeEntry[] = [];

/** 教育背景，结构同上（role 写专业） */
export const education: ResumeEntry[] = [];
