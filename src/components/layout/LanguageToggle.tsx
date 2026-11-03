import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { Lang } from '@/i18n';

const OPTIONS: { value: Lang; label: string; srHint: string }[] = [
  { value: 'zh', label: '中', srHint: '中文' },
  { value: 'en', label: 'EN', srHint: 'English' },
];

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'zh').startsWith('zh') ? 'zh' : 'en';

  return (
    <div
      role="group"
      aria-label={t('meta.langSwitch')}
      className={clsx('flex items-center border border-line', className)}
    >
      {OPTIONS.map((option, i) => {
        const active = current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value === 'zh' ? 'zh-CN' : 'en'}
            aria-pressed={active}
            aria-label={active ? `${option.srHint}（当前语言）` : t('meta.langSwitchTo')}
            onClick={() => {
              if (!active) void i18n.changeLanguage(option.value);
            }}
            className={clsx(
              'px-2.5 py-1.5 text-[11px] font-medium tracking-[0.14em] transition-colors duration-200',
              i === 0 && 'border-r border-line',
              active ? 'bg-acid text-ink' : 'text-mute hover:text-fg',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
