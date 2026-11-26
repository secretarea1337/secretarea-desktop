import type { ReactNode } from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  labelId: string;
  onLabel: string;
  offLabel: string;
  onChange: (next: boolean) => void;
}

export function ToggleSwitch({
  checked,
  disabled = false,
  labelId,
  onLabel,
  offLabel,
  onChange,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 shrink-0 cursor-pointer disabled:opacity-50 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8] rounded-md p-0.5"
    >
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap ${
          checked
            ? 'text-[#0284c7] dark:text-[#66c0f4]'
            : 'text-slate-500 dark:text-[#8b9bb4]'
        }`}
      >
        {checked ? onLabel : offLabel}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 ${
          checked
            ? 'bg-[#1a9fff] border-[#38adff]'
            : 'bg-slate-200 border-slate-300 group-hover:border-slate-400 dark:bg-[#0e131b] dark:border-white/[0.14] dark:group-hover:border-white/[0.28]'
        }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsRow({
  icon,
  title,
  titleId,
  description,
  meta,
  control,
  children,
}: {
  icon: ReactNode;
  title: string;
  titleId?: string;
  description: string;
  meta?: ReactNode;
  control?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="sa-ps5-subpanel p-3.5 sm:p-4 rounded-lg bg-slate-50 dark:bg-[#12171f] border border-slate-200 dark:border-white/[0.07] space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-[#1a2433] border border-slate-300/70 dark:border-white/[0.08] text-[#0284c7] dark:text-[#66c0f4] flex items-center justify-center shrink-0 mt-0.5">
            {icon}
          </span>
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                id={titleId}
                className="text-[13.5px] font-semibold text-slate-900 dark:text-white"
              >
                {title}
              </span>
              {meta}
            </div>
            <p className="text-[12px] text-slate-600 dark:text-[#8b9bb4] leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children}
    </div>
  );
}
