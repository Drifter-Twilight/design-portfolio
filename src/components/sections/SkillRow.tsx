import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { siCss, siHtml5, siJavascript, siReact, siVuedotjs } from 'simple-icons';
import { ScrollVelocity } from '@/components/reactbits/ScrollVelocity';

export type Skill = {
  id: string;
  label: string;
  /** simple-icons 的 24×24 path；没有官方图标的用字母标 */
  path?: string;
  mono?: string;
};

/**
 * Adobe 三件在 simple-icons 中因商标原因已移除，Lovart / WorkBuddy 亦无收录，
 * 这五项沿用其品牌本身的字母标（Ps / Ai / Lr / Lv / WB），与官方图形共享同一容器尺寸。
 */
export const SKILLS: Skill[] = [
  { id: 'ps', label: 'Photoshop', mono: 'Ps' },
  { id: 'ai', label: 'Illustrator', mono: 'Ai' },
  { id: 'lr', label: 'Lightroom', mono: 'Lr' },
  { id: 'lovart', label: 'Lovart', mono: 'Lv' },
  { id: 'workbuddy', label: 'WorkBuddy', mono: 'WB' },
  { id: 'html', label: 'HTML5', path: siHtml5.path },
  { id: 'css', label: 'CSS3', path: siCss.path },
  { id: 'js', label: 'JavaScript', path: siJavascript.path },
  { id: 'vue', label: 'Vue', path: siVuedotjs.path },
  { id: 'react', label: 'React', path: siReact.path },
];

const ITEM_CLASS =
  'flex size-[51px] shrink-0 items-center justify-center rounded-xl border border-line-strong/70 text-fg/75 transition-colors duration-300 hover:border-acid/60 hover:text-acid';

function SkillBadge({ skill }: { skill: Skill }) {
  return (
    <div role="listitem" className={ITEM_CLASS} title={skill.label} aria-label={skill.label}>
      {skill.path ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[23px] fill-current">
          <path d={skill.path} />
        </svg>
      ) : (
        <span
          aria-hidden="true"
          className="text-[15px] leading-none font-bold tracking-[-0.02em]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {skill.mono}
        </span>
      )}
    </div>
  );
}

/**
 * 技能图标条：始终贴在最底部横向一行。
 * 安全区内放得下就静态排布；放不下（窄屏）则退化为与尾页一致的横向循环播放。
 */
export function SkillRow() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const el = rowRef.current;
      if (!el || overflow) return;
      if (el.scrollWidth - el.clientWidth > 2) setOverflow(true);
    };
    // 首帧后再量，避免字体未就绪导致宽度偏差
    const raf = requestAnimationFrame(measure);
    const onResize = () => {
      if (window.innerWidth > 1100) setOverflow(false);
      requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [overflow]);

  const badges: ReactNode = (
    <div role="list" className="flex items-center gap-4">
      {SKILLS.map((skill) => (
        <SkillBadge key={skill.id} skill={skill} />
      ))}
    </div>
  );

  if (overflow) {
    return (
      <div className="w-full">
        {/* 循环播放版对读屏隐藏，另给一份纯文本清单 */}
        <div aria-hidden="true">
          <ScrollVelocity texts={[badges]} velocity={38} numCopies={3} gap={18} fadeEdges />
        </div>
        <p className="sr-only">Skills: {SKILLS.map((skill) => skill.label).join(', ')}</p>
      </div>
    );
  }

  return (
    <div ref={rowRef} className="w-full overflow-hidden">
      {badges}
    </div>
  );
}
