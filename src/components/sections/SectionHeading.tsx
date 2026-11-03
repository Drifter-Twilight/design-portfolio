import clsx from 'clsx';
import AnimatedContent from '@/components/reactbits/AnimatedContent';

interface SectionHeadingProps {
  index: string;
  title: string;
  en: string;
  desc: string;
  id?: string;
  className?: string;
}

/** 章节标头：编号 + 中文大标 + 英文副行 + 描述，全站统一 */
export function SectionHeading({ index, title, en, desc, id, className }: SectionHeadingProps) {
  return (
    <AnimatedContent distance={38} duration={0.9} threshold={0.25} ease="power2.out">
      <div className={clsx('border-t border-line pt-5', className)}>
        <div className="flex items-baseline justify-between gap-6">
          <span className="font-mono text-[11px] tracking-[0.24em] text-acid">{index}</span>
          <span className="hidden text-[10px] tracking-[0.26em] text-mute uppercase sm:block">{en}</span>
        </div>

        <h2
          id={id}
          className="display-zh mt-4 text-[clamp(2.1rem,6.2vw,4.6rem)] text-fg"
        >
          {title}
        </h2>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[36em] text-[clamp(0.875rem,1.05vw,0.9375rem)] leading-[1.8] text-dim">{desc}</p>
          <span aria-hidden="true" className="hidden h-px w-16 shrink-0 bg-line-strong sm:block" />
        </div>
      </div>
    </AnimatedContent>
  );
}

/** 子分组标题（VI / 海报 / Icon 等） */
export function SubHeading({
  title,
  meta,
  desc,
  className,
}: {
  title: string;
  meta?: string;
  desc?: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between', className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[clamp(1.05rem,1.7vw,1.375rem)] font-bold tracking-[0.02em] text-fg">{title}</h3>
        {meta && <span className="font-mono text-[10px] tracking-[0.16em] text-mute">{meta}</span>}
      </div>
      {desc && <p className="max-w-[34em] text-[12.5px] leading-[1.7] text-mute">{desc}</p>}
    </div>
  );
}
