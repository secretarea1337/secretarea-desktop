import { type ReactNode, useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import type { DataProvenance } from '../../types';

export function ProvenanceTag({
  provenance,
  labels,
}: {
  provenance: DataProvenance;
  labels: Record<DataProvenance, string>;
}) {
  const toneClass =
    provenance === 'measured' || provenance === 'detected'
      ? 'text-emerald-700 dark:text-[#34d399]'
      : provenance === 'manufacturer_spec'
      ? 'text-[#0284c7] dark:text-[#38bdf8]'
      : provenance === 'estimated'
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-slate-500 dark:text-[#8b9bb4]';

  return (
    <span className={`text-[10.5px] font-semibold uppercase tracking-wide whitespace-nowrap ${toneClass}`}>
      {labels[provenance] || provenance}
    </span>
  );
}

export function ExpandablePanel({
  title,
  subtitle,
  icon,
  rightSlot,
  defaultExpanded = true,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] shadow-xs dark:shadow-md overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-2.5 text-start min-w-0 flex-1 cursor-pointer group"
        >
          {icon && (
            <span className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-[#38bdf8]/12 border border-sky-500/20 dark:border-[#38bdf8]/25 flex items-center justify-center shrink-0 text-[#0284c7] dark:text-[#38bdf8]">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-[15px] font-bold text-slate-900 dark:text-white truncate group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8] transition-colors">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12px] text-slate-500 dark:text-[#8b9bb4] truncate">{subtitle}</p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2.5 shrink-0">
          {rightSlot}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-600 dark:text-[#9cb0c9] transition-colors cursor-pointer"
          >
            {expanded ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && <div className="p-4 sm:p-5">{children}</div>}
    </section>
  );
}

export function KeyValueRow({
  label,
  value,
  ltr = false,
  highlightClass = '',
}: {
  label: string;
  value: string;
  ltr?: boolean;
  highlightClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-white/[0.05] last:border-b-0">
      <span className="text-[12px] text-slate-500 dark:text-[#8b9bb4] shrink-0">{label}</span>
      <span
        dir={ltr ? 'ltr' : undefined}
        className={`text-[12.5px] font-medium text-end break-all ${
          highlightClass || 'text-slate-800 dark:text-[#e2eaf4]'
        } ${ltr ? 'font-mono-tabular' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
