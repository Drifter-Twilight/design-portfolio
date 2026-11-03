import { siWechat } from 'simple-icons';

type Kind = 'email' | 'wechat' | 'resume';

/**
 * 联系方式小图标：与「工具与技能」保持同一套视觉语言 ——
 * 圆角方形容器 + 单色描边 + 与文字同色的图标。
 * 图标本体尺寸刻意与相邻文本一致（12px），不抢行高。
 */
const GLYPH: Record<Exclude<Kind, 'wechat'>, { path: string; evenodd?: boolean }> = {
  email: {
    // 信封：外框 + 三角开合口（evenodd 挖空，做出折线感）
    evenodd: true,
    path:
      'M5.2 4h13.6A2.2 2.2 0 0 1 21 6.2v11.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 17.8V6.2A2.2 2.2 0 0 1 5.2 4Zm-.4 4.05 7.2 4.62 7.2-4.62V5.9H4.8v2.15Z',
  },
  resume: {
    // 文档：折角页 + 三条正文线
    evenodd: true,
    path:
      'M6.4 2.6h6.9l6.1 6.1v12.7a1.7 1.7 0 0 1-1.7 1.7H6.4a1.7 1.7 0 0 1-1.7-1.7V4.3a1.7 1.7 0 0 1 1.7-1.7Zm1.4 9.5v1.5h7.6v-1.5H7.8Zm0 3.2v1.5h7.6v-1.5H7.8Zm0-6.4v1.5h4v-1.5h-4Z',
  },
};

export function ContactIcon({ kind }: { kind: Kind }) {
  const glyph = kind === 'wechat' ? { path: siWechat.path, evenodd: false } : GLYPH[kind];

  return (
    <span
      aria-hidden="true"
      className="flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border border-line-strong/70 text-fg/70"
    >
      <svg viewBox="0 0 24 24" className="size-[12px] fill-current">
        <path d={glyph.path} fillRule={glyph.evenodd ? 'evenodd' : 'nonzero'} clipRule="evenodd" />
      </svg>
    </span>
  );
}
