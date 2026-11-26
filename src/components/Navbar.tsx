import { memo, useEffect, useState, type ComponentType } from 'react';
import {
  Books,
  ChatTeardropText,
  Cpu,
  DownloadSimple,
  Gear,
  House,
  List,
  Shield,
  Stack,
  Tag,
  X,
} from '@phosphor-icons/react';
import type { PrimarySection } from '../types';
import type { AppLanguage, AppThemeMode } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';

interface NavbarProps {
  activeSection: PrimarySection;
  onSelectSection: (section: PrimarySection) => void;
  onOpenSpinWheel?: () => void;
  activeTheme?: AppThemeMode;
  compactNavbar?: boolean;
  language?: AppLanguage;
  activeDownloadsCount?: number;
}

function MiniSpinWheelIcon({ sizeClass = 'w-8 h-8' }: { sizeClass?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${sizeClass} shrink-0`}>
      {/* Top golden pointer triangle */}
      <svg
        viewBox="0 0 12 10"
        className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2 z-10"
        aria-hidden="true"
      >
        <path d="M1.5 2H10.5L6 9L1.5 2Z" fill="rgba(0,0,0,0.4)" />
        <path d="M1.5 1.5H10.5L6 8.5L1.5 1.5Z" fill="#fbbf0d" stroke="#f59e0b" strokeWidth="1.2" />
      </svg>

      {/* Continuously spinning miniature 8-wedge colorful wheel */}
      <svg viewBox="0 0 32 32" className="w-full h-full sa-spin-wheel-idle" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="#1e2d3d" />
        {/* 8 slices: Red, Gold, Green, Blue alternating */}
        <path d="M16 16 L11.4 4.9 A12 12 0 0 1 20.6 4.9 Z" fill="#ef4444" />
        <path d="M16 16 L20.6 4.9 A12 12 0 0 1 27.1 11.4 Z" fill="#fbbf0d" />
        <path d="M16 16 L27.1 11.4 A12 12 0 0 1 27.1 20.6 Z" fill="#00c25c" />
        <path d="M16 16 L27.1 20.6 A12 12 0 0 1 20.6 27.1 Z" fill="#0094df" />
        <path d="M16 16 L20.6 27.1 A12 12 0 0 1 11.4 27.1 Z" fill="#ef4444" />
        <path d="M16 16 L11.4 27.1 A12 12 0 0 1 4.9 20.6 Z" fill="#fbbf0d" />
        <path d="M16 16 L4.9 20.6 A12 12 0 0 1 4.9 11.4 Z" fill="#00c25c" />
        <path d="M16 16 L4.9 11.4 A12 12 0 0 1 11.4 4.9 Z" fill="#0094df" />
        {/* Rim dots */}
        <circle cx="16" cy="2.3" r="0.9" fill="#ffffff" />
        <circle cx="25.7" cy="6.3" r="0.9" fill="#ffffff" />
        <circle cx="29.7" cy="16" r="0.9" fill="#ffffff" />
        <circle cx="25.7" cy="25.7" r="0.9" fill="#ffffff" />
        <circle cx="16" cy="29.7" r="0.9" fill="#ffffff" />
        <circle cx="6.3" cy="25.7" r="0.9" fill="#ffffff" />
        <circle cx="2.3" cy="16" r="0.9" fill="#ffffff" />
        <circle cx="6.3" cy="6.3" r="0.9" fill="#ffffff" />
        {/* Center white hub */}
        <circle cx="16" cy="16" r="4.6" fill="#1e2d3d" />
        <circle cx="16" cy="16" r="3.4" fill="#ffffff" />
      </svg>
    </span>
  );
}

export const Navbar = memo(function Navbar({
  activeSection,
  onSelectSection,
  onOpenSpinWheel,
  activeTheme = 'default',
  compactNavbar = false,
  language = 'en',
  activeDownloadsCount = 0,
}: NavbarProps) {
  const [logoError, setLogoError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const t = getTranslations(language);
  const isPs5Theme = activeTheme === 'ps5';
  const isXboxTheme = activeTheme === 'xbox';
  const isDefaultTheme = !isPs5Theme && !isXboxTheme;

  const navItems: {
    id: PrimarySection;
    label: string;
    icon: ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'store', label: t.nav.home, icon: House },
    { id: 'library', label: t.nav.library, icon: Books },
    { id: 'deals', label: t.nav.gameDeals, icon: Tag },
    { id: 'extras', label: t.nav.extras, icon: Stack },
    { id: 'requests', label: t.nav.requests, icon: ChatTeardropText },
  ];

  const mobileUtilityItems: {
    id: PrimarySection;
    label: string;
    icon: ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    {
      id: 'downloads',
      label: t.nav.downloads,
      icon: DownloadSimple,
      count: activeDownloadsCount > 0 ? activeDownloadsCount : undefined,
    },
    { id: 'hardware', label: t.nav.hardwareMonitor, icon: Cpu },
    { id: 'settings', label: t.nav.settings, icon: Gear },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSelectNav = (section: PrimarySection) => {
    onSelectSection(section);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-20 bg-slate-900/35 dark:bg-black/55 backdrop-blur-[2px] md:hidden"
        />
      )}

      <header
        className={`relative z-30 shrink-0 select-none border-b transition-colors duration-200 ${
          isPs5Theme
            ? 'bg-[#021233]/80 border-white/[0.12] backdrop-blur-md shadow-[0_8px_28px_rgba(0,6,20,0.42)]'
            : isXboxTheme
            ? 'bg-[#081a0b]/84 border-[#52e042]/20 backdrop-blur-md shadow-[0_8px_28px_rgba(2,14,4,0.48)]'
            : 'bg-white/[0.97] dark:bg-[#0f141c]/[0.97] border-slate-200/85 dark:border-white/[0.08] shadow-[0_1px_16px_rgba(15,23,42,0.05)] dark:shadow-[0_6px_24px_rgba(0,0,0,0.35)]'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto h-14 sm:h-[60px] px-3 sm:px-5 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Zone 1: Brand Logo + Wordmark */}
          <button
            type="button"
            onClick={() => handleSelectNav('store')}
            className={`flex items-center gap-2.5 text-start group rounded-lg py-1 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 ${
              isXboxTheme
                ? 'focus-visible:ring-[#6ee755]'
                : isPs5Theme
                ? 'focus-visible:ring-[#7cc4ff]'
                : 'focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]'
            }`}
          >
            {!logoError ? (
              <img
                src="./img/logo01.png"
                alt="SecretArea"
                decoding="async"
                onError={() => setLogoError(true)}
                className="h-7 sm:h-8 w-auto max-w-[110px] sm:max-w-[140px] object-contain shrink-0"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm shrink-0 ${
                  isXboxTheme
                    ? 'bg-gradient-to-br from-[#107C10] to-[#0a520a]'
                    : 'bg-gradient-to-br from-[#0284c7] to-[#1d4ed8] dark:from-[#1a9fff] dark:to-[#1256a0]'
                }`}
              >
                <Shield weight="duotone" className="w-4 h-4 text-white" />
              </div>
            )}

            {!compactNavbar && (
              <span
                className={`font-display text-[15.5px] sm:text-[17px] whitespace-nowrap shrink-0 transition-colors ${
                  isPs5Theme
                    ? 'font-semibold tracking-[0.04em] text-white'
                    : isXboxTheme
                    ? 'font-bold tracking-[0.04em] text-[#ecfdf0]'
                    : 'font-bold tracking-[-0.02em] text-slate-900 group-hover:text-[#0284c7] dark:text-white dark:group-hover:text-[#38bdf8]'
                }`}
              >
                SecretArea
              </span>
            )}
          </button>

          {/* Zone 2: Desktop / Tablet Primary Navigation */}
          <nav
            aria-label="Primary navigation"
            className={`hidden md:flex items-center justify-center min-w-0 overflow-x-auto no-scrollbar ${
              isDefaultTheme
                ? compactNavbar
                  ? 'gap-1 lg:gap-1.5'
                  : 'gap-0.5 lg:gap-1 xl:gap-2'
                : compactNavbar
                ? 'gap-1.5 lg:gap-3'
                : 'gap-1 lg:gap-2.5 xl:gap-4'
            }`}
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;

              if (isPs5Theme) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleSelectNav(item.id)}
                    className={`relative inline-flex items-center justify-center gap-1.5 text-[11.5px] lg:text-[12.5px] xl:text-[13px] tracking-[0.04em] lg:tracking-[0.06em] whitespace-nowrap transition-all cursor-pointer shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7cc4ff] ${
                      isActive
                        ? compactNavbar
                          ? 'p-2.5 bg-white/[0.16] border border-white/[0.34] font-bold text-white shadow-[0_0_18px_rgba(96,178,255,0.38)]'
                          : 'px-2.5 lg:px-3.5 py-1.5 lg:py-2 bg-white/[0.15] border border-white/[0.3] font-bold text-white shadow-[0_0_18px_rgba(96,178,255,0.35)]'
                        : compactNavbar
                        ? 'p-2.5 font-medium text-white/65 hover:text-white hover:bg-white/[0.08]'
                        : 'px-2 lg:px-3 py-1.5 lg:py-2 font-medium text-white/65 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <Icon className={compactNavbar ? 'w-4.5 h-4.5 shrink-0' : 'w-4 h-4 shrink-0'} />
                    {!compactNavbar && <span>{item.label}</span>}
                    {typeof item.count === 'number' && !compactNavbar && (
                      <span className="font-mono-tabular text-[11px] font-bold opacity-90">
                        ({item.count})
                      </span>
                    )}
                  </button>
                );
              }

              if (isXboxTheme) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleSelectNav(item.id)}
                    className={`relative inline-flex items-center justify-center gap-1.5 text-[11.5px] lg:text-[12.5px] xl:text-[13px] tracking-[0.04em] lg:tracking-[0.06em] whitespace-nowrap transition-all cursor-pointer shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ee755] ${
                      isActive
                        ? compactNavbar
                          ? 'p-2.5 bg-[#107C10]/85 border border-[#6ee755]/85 font-bold text-white shadow-[0_0_16px_rgba(82,224,66,0.35)]'
                          : 'px-2.5 lg:px-3.5 py-1.5 lg:py-2 bg-[#107C10]/85 border border-[#6ee755]/85 font-bold text-white shadow-[0_0_16px_rgba(82,224,66,0.32)]'
                        : compactNavbar
                        ? 'p-2.5 font-medium text-[#b5d6b8] hover:text-white hover:bg-[#107C10]/30'
                        : 'px-2 lg:px-3 py-1.5 lg:py-2 font-medium text-[#b5d6b8] hover:text-white hover:bg-[#107C10]/30'
                    }`}
                  >
                    <Icon className={compactNavbar ? 'w-4.5 h-4.5 shrink-0' : 'w-4 h-4 shrink-0'} />
                    {!compactNavbar && <span>{item.label}</span>}
                    {typeof item.count === 'number' && !compactNavbar && (
                      <span className="font-mono-tabular text-[11px] font-bold opacity-90">
                        ({item.count})
                      </span>
                    )}
                  </button>
                );
              }

              // Modern Default Theme Nav Link
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleSelectNav(item.id)}
                  className="relative h-14 sm:h-[60px] flex items-center shrink-0 group cursor-pointer focus-visible:outline-none"
                >
                  <span
                    className={`inline-flex items-center justify-center gap-1 lg:gap-2 rounded-lg text-[11.5px] lg:text-[12.5px] xl:text-[13px] whitespace-nowrap transition-all duration-150 group-focus-visible:ring-2 group-focus-visible:ring-[#0284c7] dark:group-focus-visible:ring-[#38bdf8] ${
                      compactNavbar ? 'w-10 h-10' : 'px-1.5 lg:px-2.5 xl:px-3 py-2'
                    } ${
                      isActive
                        ? 'font-semibold text-[#0284c7] dark:text-[#38bdf8] bg-sky-500/[0.08] dark:bg-[#38bdf8]/[0.1]'
                        : 'font-medium text-slate-600 group-hover:text-slate-950 group-hover:bg-slate-100/90 dark:text-[#b4c2d4] dark:group-hover:text-white dark:group-hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon
                      className={`${
                        compactNavbar ? 'w-4.5 h-4.5' : 'w-4 h-4'
                      } shrink-0 transition-transform duration-150 ${
                        isActive ? 'scale-105' : 'opacity-80 group-hover:opacity-100'
                      }`}
                    />
                    {!compactNavbar && <span>{item.label}</span>}
                    {typeof item.count === 'number' && !compactNavbar && (
                      <span className="font-mono-tabular text-[11.5px] font-bold text-[#0284c7] dark:text-[#38bdf8]">
                        ({item.count})
                      </span>
                    )}
                  </span>

                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-t-full bg-[#0284c7] dark:bg-[#38bdf8]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Spin Wheel, Console Glyphs & Mobile Menu Button */}
          <div className="flex items-center justify-end gap-2 shrink-0 lg:min-w-[84px]">
            {onOpenSpinWheel && (
              <button
                type="button"
                onClick={onOpenSpinWheel}
                title={t.nav.spin}
                aria-label={t.nav.spin}
                className={`group inline-flex items-center justify-center p-0.5 bg-transparent border-0 shadow-none rounded-full shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                  isPs5Theme
                    ? 'focus-visible:ring-[#7cc4ff]'
                    : isXboxTheme
                    ? 'focus-visible:ring-[#6ee755]'
                    : 'focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]'
                }`}
              >
                <MiniSpinWheelIcon sizeClass="w-8 h-8" />
              </button>
            )}
            {isPs5Theme && (
              <div
                aria-hidden="true"
                dir="ltr"
                className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-[#8ec5ff]/75 px-2"
              >
                <span>△</span>
                <span>○</span>
                <span>×</span>
                <span>□</span>
              </div>
            )}

            {isXboxTheme && (
              <div
                aria-hidden="true"
                dir="ltr"
                className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2"
              >
                <span className="w-4.5 h-4.5 rounded-full bg-[#107C10]/35 border border-[#4ade80]/70 text-[#4ade80] flex items-center justify-center">
                  A
                </span>
                <span className="w-4.5 h-4.5 rounded-full bg-[#7f1d1d]/35 border border-[#f87171]/70 text-[#f87171] flex items-center justify-center">
                  B
                </span>
                <span className="w-4.5 h-4.5 rounded-full bg-[#1e3a8a]/35 border border-[#60a5fa]/70 text-[#60a5fa] flex items-center justify-center">
                  X
                </span>
                <span className="w-4.5 h-4.5 rounded-full bg-[#78350f]/35 border border-[#facc15]/70 text-[#facc15] flex items-center justify-center">
                  Y
                </span>
              </div>
            )}

            {/* Mobile Hamburger Menu Button (< md) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
              className={`md:hidden h-10 w-10 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 ${
                isPs5Theme
                  ? 'rounded-full bg-white/[0.12] hover:bg-white/[0.2] border border-white/[0.18] text-white focus-visible:ring-[#7cc4ff]'
                  : isXboxTheme
                  ? 'bg-[#122b15] hover:bg-[#193b1c] border border-[#52e042]/35 text-[#e7fce9] focus-visible:ring-[#6ee755]'
                  : 'border border-slate-200 dark:border-white/[0.1] bg-slate-50/90 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.09] text-slate-700 dark:text-[#d2deec] focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]'
              }`}
            >
              {isMobileMenuOpen ? (
                <X weight="bold" className="w-5 h-5" />
              ) : (
                <List weight="bold" className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Drawer (< md) */}
        {isMobileMenuOpen && (
          <div
            className={`md:hidden absolute inset-x-0 top-full z-40 border-b shadow-2xl ${
              isPs5Theme
                ? 'bg-[#021233]/96 border-white/[0.14] backdrop-blur-xl text-white'
                : isXboxTheme
                ? 'bg-[#071a0b]/96 border-[#52e042]/25 backdrop-blur-xl text-[#ecfdf0]'
                : 'bg-white/98 dark:bg-[#0f141c]/98 border-slate-200 dark:border-white/[0.08] backdrop-blur-xl text-slate-900 dark:text-white'
            }`}
          >
            <nav aria-label="Mobile navigation" className="p-3 space-y-1">
              {[...navItems, ...mobileUtilityItems].map((item, idx) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;
                return (
                  <div key={item.id}>
                    {idx === navItems.length && (
                      <div
                        className={`my-2 border-t ${
                          isPs5Theme
                            ? 'border-white/[0.12]'
                            : isXboxTheme
                            ? 'border-[#52e042]/20'
                            : 'border-slate-200 dark:border-white/[0.08]'
                        }`}
                      />
                    )}
                    <button
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => handleSelectNav(item.id)}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-[14px] transition-colors cursor-pointer ${
                        isPs5Theme
                          ? isActive
                            ? 'bg-white/[0.16] border border-white/[0.28] font-bold text-white'
                            : 'font-medium text-white/75 hover:bg-white/[0.08] hover:text-white'
                          : isXboxTheme
                          ? isActive
                            ? 'bg-[#107C10]/75 border border-[#6ee755]/75 font-bold text-white'
                            : 'font-medium text-[#b5d6b8] hover:bg-[#107C10]/30 hover:text-white'
                          : isActive
                          ? 'bg-sky-500/[0.1] dark:bg-[#38bdf8]/[0.12] text-[#0284c7] dark:text-[#38bdf8] font-semibold'
                          : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-[#c7d4e5] dark:hover:bg-white/[0.06] dark:hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {typeof item.count === 'number' && (
                          <span className="font-mono-tabular text-[12px] font-bold opacity-85">
                            ({item.count})
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className={`w-1.5 h-5 rounded-full shrink-0 ${
                            isPs5Theme
                              ? 'bg-white'
                              : isXboxTheme
                              ? 'bg-[#6ee755]'
                              : 'bg-[#0284c7] dark:bg-[#38bdf8]'
                          }`}
                        />
                      )}
                    </button>
                  </div>
                );
              })}
              {onOpenSpinWheel && (
                <>
                  <div
                    className={`my-2 border-t ${
                      isPs5Theme
                        ? 'border-white/[0.12]'
                        : isXboxTheme
                        ? 'border-[#52e042]/20'
                        : 'border-slate-200 dark:border-white/[0.08]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSpinWheel();
                    }}
                    className={`group w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-[14px] font-semibold transition-colors cursor-pointer ${
                      isPs5Theme
                        ? 'bg-white/[0.08] hover:bg-white/[0.15] text-white'
                        : isXboxTheme
                        ? 'bg-[#107C10]/30 hover:bg-[#107C10]/50 text-[#ecfdf0]'
                        : 'bg-sky-500/[0.08] hover:bg-sky-500/[0.14] text-[#0284c7] dark:text-[#38bdf8]'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <MiniSpinWheelIcon sizeClass="w-6 h-6" />
                      <span className="truncate">{t.nav.spin}</span>
                    </span>
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
});
