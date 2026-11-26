import { memo, useEffect, useState } from 'react';
import { Buildings } from '@phosphor-icons/react';
import type { GameItem } from '../types';

export const StudioEmblem = memo(function StudioEmblem({ studio }: { studio: GameItem }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [studio.coverImage]);

  useEffect(() => {
    if (!failed) return;
    const handleOnline = () => setFailed(false);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [failed]);

  if (!studio.coverImage || failed) {
    return (
      <div className="h-24 w-full rounded-[3px] bg-slate-100 dark:bg-[#10161e] border border-slate-200 dark:border-white/[0.06] flex flex-col items-center justify-center p-3 gap-1.5 text-center">
        <Buildings className="w-6 h-6 text-slate-400 dark:text-[#5b697c]" />
        <span className="text-[11px] font-medium text-slate-600 dark:text-[#8b9bb4] line-clamp-1">{studio.name}</span>
      </div>
    );
  }

  return (
    <div className="h-24 w-full rounded-[3px] bg-[#f4f6f9] border border-slate-200 dark:border-transparent flex items-center justify-center p-3.5 overflow-hidden">
      <img
        src={studio.coverImage}
        alt={studio.name}
        title={studio.name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="max-h-full max-w-full object-contain group-hover:scale-[1.04] transition-transform duration-200"
      />
    </div>
  );
});
