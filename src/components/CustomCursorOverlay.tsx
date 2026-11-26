import { memo, useEffect, useRef, useState } from 'react';
import type { AppThemeMode } from '../services/launcherSettings';

export type CustomCursorKind =
  | 'default'
  | 'pointer'
  | 'text'
  | 'wait'
  | 'progress'
  | 'move'
  | 'ns-resize'
  | 'ew-resize'
  | 'nesw-resize'
  | 'nwse-resize'
  | 'zoom-in'
  | 'zoom-out'
  | 'not-allowed'
  | 'help';

interface CustomCursorOverlayProps {
  enabled: boolean;
  activeTheme?: AppThemeMode;
}

const BURST_POOL_SIZE = 3;

const TEXT_CONTROL_SELECTOR =
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), textarea, [contenteditable="true"]';

const INTERACTIVE_SELECTOR =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"], select, summary, label[for], input[type="range"], input[type="checkbox"], input[type="radio"], input[type="color"]';

const CLASS_CURSOR_HINTS: [string, CustomCursorKind][] = [
  ['cursor-not-allowed', 'not-allowed'],
  ['cursor-no-drop', 'not-allowed'],
  ['cursor-wait', 'wait'],
  ['cursor-progress', 'progress'],
  ['cursor-zoom-in', 'zoom-in'],
  ['cursor-zoom-out', 'zoom-out'],
  ['cursor-help', 'help'],
  ['cursor-vertical-text', 'text'],
  ['cursor-text', 'text'],
  ['cursor-grabbing', 'move'],
  ['cursor-grab', 'move'],
  ['cursor-all-scroll', 'move'],
  ['cursor-move', 'move'],
  ['cursor-ns-resize', 'ns-resize'],
  ['cursor-row-resize', 'ns-resize'],
  ['cursor-ew-resize', 'ew-resize'],
  ['cursor-col-resize', 'ew-resize'],
  ['cursor-nesw-resize', 'nesw-resize'],
  ['cursor-nwse-resize', 'nwse-resize'],
  ['cursor-pointer', 'pointer'],
];

function mapCssCursorValue(raw: string): CustomCursorKind | null {
  if (!raw || raw === 'auto' || raw === 'none' || raw === 'inherit' || raw === 'initial') {
    return null;
  }
  if (raw.includes('not-allowed') || raw.includes('no-drop')) return 'not-allowed';
  if (raw === 'wait') return 'wait';
  if (raw === 'progress') return 'progress';
  if (raw === 'zoom-in') return 'zoom-in';
  if (raw === 'zoom-out') return 'zoom-out';
  if (raw === 'help') return 'help';
  if (raw === 'text' || raw === 'vertical-text') return 'text';
  if (raw === 'move' || raw === 'grab' || raw === 'grabbing' || raw === 'all-scroll') {
    return 'move';
  }
  if (raw === 'ns-resize' || raw === 'n-resize' || raw === 's-resize' || raw === 'row-resize') {
    return 'ns-resize';
  }
  if (raw === 'ew-resize' || raw === 'e-resize' || raw === 'w-resize' || raw === 'col-resize') {
    return 'ew-resize';
  }
  if (raw === 'nesw-resize' || raw === 'ne-resize' || raw === 'sw-resize') {
    return 'nesw-resize';
  }
  if (raw === 'nwse-resize' || raw === 'nw-resize' || raw === 'se-resize') {
    return 'nwse-resize';
  }
  if (raw === 'pointer') return 'pointer';
  return null;
}

/**
 * Pure DOM/attribute/class cursor resolver — zero getComputedStyle calls and zero layout thrashing.
 */
function resolveCursorKindFast(target: EventTarget | null): CustomCursorKind {
  if (!(target instanceof Element)) return 'default';

  if (target.closest('[disabled], [aria-disabled="true"], .cursor-not-allowed')) {
    return 'not-allowed';
  }

  let node: Element | null = target;
  for (let depth = 0; depth < 4 && node; depth += 1) {
    const inlineCursor = (node as HTMLElement).style?.cursor;
    if (inlineCursor) {
      const mapped = mapCssCursorValue(inlineCursor);
      if (mapped) return mapped;
    }

    const cls = typeof node.className === 'string' ? node.className : '';
    if (cls && cls.includes('cursor-')) {
      for (let i = 0; i < CLASS_CURSOR_HINTS.length; i++) {
        if (cls.includes(CLASS_CURSOR_HINTS[i][0])) {
          return CLASS_CURSOR_HINTS[i][1];
        }
      }
    }

    node = node.parentElement;
  }

  if (target.closest(TEXT_CONTROL_SELECTOR)) return 'text';
  if (target.closest(INTERACTIVE_SELECTOR)) return 'pointer';

  return 'default';
}

function getHotspotOffset(kind: CustomCursorKind): { x: number; y: number } {
  switch (kind) {
    case 'default':
      return { x: 4, y: 4 };
    case 'pointer':
      return { x: 7, y: 5 };
    case 'text':
    case 'wait':
    case 'progress':
    case 'move':
    case 'ns-resize':
    case 'ew-resize':
    case 'nesw-resize':
    case 'nwse-resize':
    case 'zoom-in':
    case 'zoom-out':
    case 'not-allowed':
    case 'help':
      return { x: 14, y: 14 };
  }
}

interface BurstSlotNodes {
  root: HTMLDivElement | null;
  outerCircle: SVGCircleElement | null;
  innerCircle: SVGCircleElement | null;
  raysGroup: SVGGElement | null;
}

export const CustomCursorOverlay = memo(function CustomCursorOverlay({
  enabled,
  activeTheme = 'default',
}: CustomCursorOverlayProps) {
  const [isFinePointer, setIsFinePointer] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  const effectiveEnabled = enabled && isFinePointer;

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const hotspotRef = useRef<HTMLDivElement | null>(null);
  const pointerRingRef = useRef<SVGSVGElement | null>(null);
  const bodyScaleRef = useRef<HTMLDivElement | null>(null);
  const shapeRefs = useRef<Record<CustomCursorKind, HTMLDivElement | null>>({
    default: null,
    pointer: null,
    text: null,
    wait: null,
    progress: null,
    move: null,
    'ns-resize': null,
    'ew-resize': null,
    'nesw-resize': null,
    'nwse-resize': null,
    'zoom-in': null,
    'zoom-out': null,
    'not-allowed': null,
    help: null,
  });

  const [mountedKinds, setMountedKinds] = useState<CustomCursorKind[]>(['default', 'pointer']);
  const mountedKindsSetRef = useRef<Set<CustomCursorKind>>(new Set(['default', 'pointer']));

  const burstSlotsRef = useRef<BurstSlotNodes[]>(
    Array.from({ length: BURST_POOL_SIZE }, () => ({
      root: null,
      outerCircle: null,
      innerCircle: null,
      raysGroup: null,
    }))
  );
  const burstPoolIndexRef = useRef(0);

  const posRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const pendingTargetRef = useRef<EventTarget | null>(null);
  const lastResolvedTargetRef = useRef<EventTarget | null>(null);
  const kindRef = useRef<CustomCursorKind>('default');
  const visibleRef = useRef(false);
  const desiredVisibleRef = useRef(false);
  const pressedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const accentBlue = activeTheme === 'xbox' ? '#60e650' : '#6cb6ff';
  const ringBlue = activeTheme === 'xbox' ? '#84f553' : '#7ec2ff';
  const ringBlueRef = useRef(ringBlue);
  ringBlueRef.current = ringBlue;

  // Watch pointer capability changes (e.g. tablet detach/attach)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handleChange = () => setIsFinePointer(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Toggle global CSS native-cursor hiding class strictly by effectiveEnabled (never per-visibility/blur)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    if (effectiveEnabled) {
      html.classList.add('sa-custom-cursor');
    } else {
      html.classList.remove('sa-custom-cursor');
    }
    return () => {
      html.classList.remove('sa-custom-cursor');
    };
  }, [effectiveEnabled]);

  // Ref-driven imperative pointer tracking, hover state, press feedback & pooled click bursts
  useEffect(() => {
    if (!effectiveEnabled) {
      visibleRef.current = false;
      desiredVisibleRef.current = false;
      pressedRef.current = false;
      lastResolvedTargetRef.current = null;
      return;
    }

    const applyBodyScale = (pressed: boolean, kind: CustomCursorKind) => {
      const bodyEl = bodyScaleRef.current;
      if (!bodyEl) return;
      bodyEl.style.transform = pressed
        ? 'scale(0.84)'
        : kind === 'pointer'
        ? 'scale(1.03)'
        : 'scale(1)';
    };

    const applyKindDom = (nextKind: CustomCursorKind) => {
      const prevKind = kindRef.current;
      if (nextKind === prevKind) return;
      kindRef.current = nextKind;

      if (!mountedKindsSetRef.current.has(nextKind)) {
        mountedKindsSetRef.current.add(nextKind);
        setMountedKinds((prev) => (prev.includes(nextKind) ? prev : [...prev, nextKind]));
      }

      const prevShape = shapeRefs.current[prevKind];
      const nextShape = shapeRefs.current[nextKind];
      if (prevShape) {
        prevShape.style.opacity = '0';
        prevShape.style.visibility = 'hidden';
      }
      if (nextShape) {
        nextShape.style.opacity = '1';
        nextShape.style.visibility = 'visible';
      }

      const hotspot = getHotspotOffset(nextKind);
      if (hotspotRef.current) {
        hotspotRef.current.style.transform = `translate3d(${-hotspot.x}px, ${-hotspot.y}px, 0)`;
      }

      if (pointerRingRef.current) {
        const isPointer = nextKind === 'pointer';
        pointerRingRef.current.style.opacity = isPointer ? '1' : '0';
        pointerRingRef.current.style.visibility = isPointer ? 'visible' : 'hidden';
        pointerRingRef.current.classList.toggle('sa-cursor-ring-paused', !isPointer);
      }

      applyBodyScale(pressedRef.current, nextKind);
    };

    const setCursorVisibilityDom = (visible: boolean) => {
      if (visibleRef.current === visible) return;
      visibleRef.current = visible;
      if (cursorRef.current) {
        cursorRef.current.style.opacity = visible ? '1' : '0';
      }
      if (overlayRef.current) {
        overlayRef.current.classList.toggle('sa-cursor-paused', !visible || document.hidden);
      }
    };

    const syncDomFrame = () => {
      rafRef.current = null;
      const el = cursorRef.current;
      if (!el) return;

      if (!desiredVisibleRef.current) {
        setCursorVisibilityDom(false);
        return;
      }

      const { x, y } = posRef.current;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      setCursorVisibilityDom(true);

      const target = pendingTargetRef.current;
      if (target && target !== lastResolvedTargetRef.current) {
        lastResolvedTargetRef.current = target;
        const nextKind = resolveCursorKindFast(target);
        applyKindDom(nextKind);
      }
    };

    const scheduleFrame = () => {
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(syncDomFrame);
      }
    };

    const triggerClickBurst = (x: number, y: number, kind: CustomCursorKind) => {
      const slotIdx = burstPoolIndexRef.current % BURST_POOL_SIZE;
      burstPoolIndexRef.current += 1;
      const slot = burstSlotsRef.current[slotIdx];
      if (!slot || !slot.root) return;

      const isBlocked = kind === 'not-allowed';
      const burstColor = isBlocked ? '#f87171' : ringBlueRef.current;

      slot.root.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      if (slot.outerCircle) {
        slot.outerCircle.setAttribute('stroke', burstColor);
        slot.outerCircle.animate(
          [
            { opacity: 0.92, transform: 'scale(0.35)' },
            { opacity: 0, transform: 'scale(2.15)' },
          ],
          { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
        );
      }

      if (slot.innerCircle) {
        slot.innerCircle.setAttribute('stroke', burstColor);
        slot.innerCircle.animate(
          [
            { opacity: 0.95, transform: 'scale(0.45)' },
            { opacity: 0, transform: 'scale(1.65)' },
          ],
          { duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
        );
      }

      if (slot.raysGroup) {
        if (isBlocked) {
          slot.raysGroup.style.display = 'none';
        } else {
          slot.raysGroup.style.display = '';
          slot.raysGroup.setAttribute('stroke', burstColor);
          slot.raysGroup.animate(
            [
              { opacity: 0.95, transform: 'scale(0.55)' },
              { opacity: 0.85, transform: 'scale(1.18)', offset: 0.55 },
              { opacity: 0, transform: 'scale(1.45)' },
            ],
            { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
          );
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        desiredVisibleRef.current = false;
        setCursorVisibilityDom(false);
        return;
      }

      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
      pendingTargetRef.current = e.target;
      desiredVisibleRef.current = true;
      scheduleFrame();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;

      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
      pendingTargetRef.current = e.target;
      desiredVisibleRef.current = true;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      setCursorVisibilityDom(true);

      lastResolvedTargetRef.current = e.target;
      const nextKind = resolveCursorKindFast(e.target);
      applyKindDom(nextKind);

      if (!pressedRef.current) {
        pressedRef.current = true;
        applyBodyScale(true, nextKind);
      }

      triggerClickBurst(e.clientX, e.clientY, nextKind);
    };

    const handlePointerUp = () => {
      if (pressedRef.current) {
        pressedRef.current = false;
        applyBodyScale(false, kindRef.current);
      }
    };

    const hideAndPause = () => {
      desiredVisibleRef.current = false;
      pressedRef.current = false;
      lastResolvedTargetRef.current = null;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      applyBodyScale(false, kindRef.current);
      setCursorVisibilityDom(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideAndPause();
      } else if (overlayRef.current && visibleRef.current) {
        overlayRef.current.classList.remove('sa-cursor-paused');
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', hideAndPause);
    window.addEventListener('blur', hideAndPause);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.removeEventListener('mouseleave', hideAndPause);
      window.removeEventListener('blur', hideAndPause);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [effectiveEnabled]);

  if (!effectiveEnabled) return null;

  const initialHotspot = getHotspotOffset('default');

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="sa-cursor-overlay sa-cursor-paused fixed inset-0 pointer-events-none z-[99999] overflow-hidden select-none"
    >
      {/* Pre-allocated Click Ripple & Radial Burst Pool (zero React re-renders) */}
      {Array.from({ length: BURST_POOL_SIZE }).map((_, idx) => (
        <div
          key={idx}
          ref={(el) => {
            burstSlotsRef.current[idx].root = el;
          }}
          style={{ transform: 'translate3d(-200px, -200px, 0)' }}
          className="fixed left-0 top-0 pointer-events-none"
        >
          <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            className="-translate-x-1/2 -translate-y-1/2 overflow-visible"
          >
            <circle
              ref={(el) => {
                burstSlotsRef.current[idx].outerCircle = el;
              }}
              cx="26"
              cy="26"
              r="8"
              fill="none"
              stroke={ringBlue}
              strokeWidth="2.2"
              style={{ opacity: 0, transformOrigin: '26px 26px' }}
            />
            <circle
              ref={(el) => {
                burstSlotsRef.current[idx].innerCircle = el;
              }}
              cx="26"
              cy="26"
              r="5"
              fill="none"
              stroke={ringBlue}
              strokeWidth="1.8"
              style={{ opacity: 0, transformOrigin: '26px 26px' }}
            />
            <g
              ref={(el) => {
                burstSlotsRef.current[idx].raysGroup = el;
              }}
              stroke={ringBlue}
              strokeWidth="2.4"
              strokeLinecap="round"
              style={{ opacity: 0, transformOrigin: '26px 26px' }}
            >
              <line x1="26" y1="15" x2="26" y2="9" />
              <line x1="18" y1="18" x2="13.5" y2="13.5" />
              <line x1="34" y1="18" x2="38.5" y2="13.5" />
              <line x1="15" y1="26" x2="9" y2="26" />
              <line x1="37" y1="26" x2="43" y2="26" />
            </g>
          </svg>
        </div>
      ))}

      {/* Floating Cursor Sprite */}
      <div
        ref={cursorRef}
        style={{
          opacity: 0,
          transform: 'translate3d(-100px, -100px, 0)',
          transition: 'opacity 110ms ease',
        }}
        className="fixed left-0 top-0 will-change-transform"
      >
        <div
          ref={hotspotRef}
          style={{
            transform: `translate3d(${-initialHotspot.x}px, ${-initialHotspot.y}px, 0)`,
          }}
        >
          {/* Dashed Interactive Hover Ring at Tip (zero-layout opacity/visibility toggle) */}
          <svg
            ref={pointerRingRef}
            width="28"
            height="28"
            viewBox="0 0 28 28"
            style={{
              left: '7px',
              top: '5px',
              opacity: 0,
              visibility: 'hidden',
            }}
            className="sa-cursor-ring-paused absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible"
          >
            <circle
              cx="14"
              cy="14"
              r="10"
              fill="none"
              stroke={ringBlue}
              strokeWidth="2"
              strokeDasharray="3.2 4.2"
              strokeLinecap="round"
              className="sa-cursor-dashed-orbit"
            />
          </svg>

          {/* Main Vector Cursor Body with snappy press feedback (zero runtime CSS filter or layout) */}
          <div
            ref={bodyScaleRef}
            style={{ transform: 'scale(1)' }}
            className="relative w-8 h-8 transition-transform duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-left"
          >
            {mountedKinds.map((kind) => (
              <div
                key={kind}
                ref={(el) => {
                  shapeRefs.current[kind] = el;
                }}
                style={{
                  opacity: kind === kindRef.current ? 1 : 0,
                  visibility: kind === kindRef.current ? 'visible' : 'hidden',
                }}
                className="absolute left-0 top-0"
              >
                {renderCursorSvg(kind, accentBlue)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

function renderCursorSvg(kind: CustomCursorKind, accentBlue: string) {
  const ink = '#181c22';

  switch (kind) {
    case 'default':
      // Rounded geometric arrow with sky-blue lower chevron accent + lightweight baked SVG shadow
      return (
        <svg width="30" height="32" viewBox="0 0 30 32" fill="none">
          <path
            d="M4.2 4.5C3.7 4.2 3.1 4.6 3.2 5.2L7.4 26.7C7.6 27.5 8.6 27.8 9.2 27.2L14.2 22.1C14.7 21.6 15.3 21.3 16 21.1L24.7 19C25.5 18.8 25.7 17.7 25 17.2L4.2 4.5Z"
            fill="rgba(0,0,0,0.22)"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Subtle outer light halo for dark mode legibility */}
          <path
            d="M4.2 3.2C3.7 2.9 3.1 3.3 3.2 3.9L7.4 25.4C7.6 26.2 8.6 26.5 9.2 25.9L14.2 20.8C14.7 20.3 15.3 20 16 19.8L24.7 17.7C25.5 17.5 25.7 16.4 25 15.9L4.2 3.2Z"
            stroke="rgba(255,255,255,0.48)"
            strokeWidth="4.2"
            strokeLinejoin="round"
          />
          {/* White body */}
          <path
            d="M4.2 3.2C3.7 2.9 3.1 3.3 3.2 3.9L7.4 25.4C7.6 26.2 8.6 26.5 9.2 25.9L14.2 20.8C14.7 20.3 15.3 20 16 19.8L24.7 17.7C25.5 17.5 25.7 16.4 25 15.9L4.2 3.2Z"
            fill="#FFFFFF"
          />
          {/* Sky-blue lower-right diagonal chevron shading */}
          <path
            d="M7.6 18.8L8.1 25.2C8.2 25.9 8.9 26.1 9.4 25.6L14.2 20.8C14.7 20.3 15.3 20 16 19.8L24.5 17.7C25.2 17.5 25.4 16.7 24.9 16.1L19.6 13L13.1 14.9L7.6 18.8Z"
            fill={accentBlue}
          />
          {/* Crisp thick rounded dark outline */}
          <path
            d="M4.2 3.2C3.7 2.9 3.1 3.3 3.2 3.9L7.4 25.4C7.6 26.2 8.6 26.5 9.2 25.9L14.2 20.8C14.7 20.3 15.3 20 16 19.8L24.7 17.7C25.5 17.5 25.7 16.4 25 15.9L4.2 3.2Z"
            stroke={ink}
            strokeWidth="2.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'pointer':
      // Rounded pointing hand with sky-blue wrist/heel accent + lightweight baked SVG shadow
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path
            d="M8.5 6.5C7.4 6.5 6.6 7.3 6.6 8.4C6.6 8.9 6.8 9.4 7.1 9.8L13.3 16.5L10.8 17.5C9.5 18 8.9 19.4 9.5 20.7C9.9 21.6 10.8 22.2 11.7 22.4L14.7 25.7C17.2 28.4 21.3 28.7 24.2 26.3C27.1 23.9 27.5 19.6 25 16.7L22.2 13.4C21.5 12.6 20.3 12.4 19.4 13C19.3 11.9 18.3 11 17.1 11.2C16.7 11.2 16.4 11.4 16.1 11.6C15.9 10.5 14.9 9.7 13.7 9.9C13.3 9.9 12.9 10.1 12.6 10.4L10 7.3C9.6 6.8 9.1 6.5 8.5 6.5Z"
            fill="rgba(0,0,0,0.22)"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 5.2C7.4 5.2 6.6 6 6.6 7.1C6.6 7.6 6.8 8.1 7.1 8.5L13.3 15.2L10.8 16.2C9.5 16.7 8.9 18.1 9.5 19.4C9.9 20.3 10.8 20.9 11.7 21.1L14.7 24.4C17.2 27.1 21.3 27.4 24.2 25C27.1 22.6 27.5 18.3 25 15.4L22.2 12.1C21.5 11.3 20.3 11.1 19.4 11.7C19.3 10.6 18.3 9.7 17.1 9.9C16.7 9.9 16.4 10.1 16.1 10.3C15.9 9.2 14.9 8.4 13.7 8.6C13.3 8.6 12.9 8.8 12.6 9.1L10 6C9.6 5.5 9.1 5.2 8.5 5.2Z"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 5.2C7.4 5.2 6.6 6 6.6 7.1C6.6 7.6 6.8 8.1 7.1 8.5L13.3 15.2L10.8 16.2C9.5 16.7 8.9 18.1 9.5 19.4C9.9 20.3 10.8 20.9 11.7 21.1L14.7 24.4C17.2 27.1 21.3 27.4 24.2 25C27.1 22.6 27.5 18.3 25 15.4L22.2 12.1C21.5 11.3 20.3 11.1 19.4 11.7C19.3 10.6 18.3 9.7 17.1 9.9C16.7 9.9 16.4 10.1 16.1 10.3C15.9 9.2 14.9 8.4 13.7 8.6C13.3 8.6 12.9 8.8 12.6 9.1L10 6C9.6 5.5 9.1 5.2 8.5 5.2Z"
            fill="#FFFFFF"
          />
          {/* Sky-blue wrist/heel shading */}
          <path
            d="M15.8 23.2C18.6 22.8 22.1 20.1 24.2 16.3L25.4 17.7C26.9 20.1 26.4 23.2 24.2 25C21.8 27 18.2 27 15.8 24.8L14.6 23.5L15.8 23.2Z"
            fill={accentBlue}
          />
          {/* Hand outline & finger creases */}
          <path
            d="M8.5 5.2C7.4 5.2 6.6 6 6.6 7.1C6.6 7.6 6.8 8.1 7.1 8.5L13.3 15.2L10.8 16.2C9.5 16.7 8.9 18.1 9.5 19.4C9.9 20.3 10.8 20.9 11.7 21.1L14.7 24.4C17.2 27.1 21.3 27.4 24.2 25C27.1 22.6 27.5 18.3 25 15.4L22.2 12.1C21.5 11.3 20.3 11.1 19.4 11.7C19.3 10.6 18.3 9.7 17.1 9.9C16.7 9.9 16.4 10.1 16.1 10.3C15.9 9.2 14.9 8.4 13.7 8.6C13.3 8.6 12.9 8.8 12.6 9.1L10 6C9.6 5.5 9.1 5.2 8.5 5.2Z"
            stroke={ink}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12.6 9.1L15.5 12.5M16.1 10.3L18.5 13.1M19.4 11.7L21.3 13.9"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'text':
      // Crisp rounded I-beam with light halo for dark & light theme contrast
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M10.5 6.5H17.5M10.5 21.5H17.5M14 6.5V21.5"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="4.4"
            strokeLinecap="round"
          />
          <path
            d="M10.5 6.5H17.5M10.5 21.5H17.5M14 6.5V21.5"
            stroke={ink}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line x1="12" y1="14" x2="16" y2="14" stroke={accentBlue} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'progress':
      // Animated 12-tick blue radial spinner
      return (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          className="sa-cursor-spinner-rotate"
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            const opacity = 0.18 + (i / 11) * 0.82;
            return (
              <line
                key={angle}
                x1="14"
                y1="4.2"
                x2="14"
                y2="8.2"
                stroke={accentBlue}
                strokeWidth="2.3"
                strokeLinecap="round"
                opacity={opacity}
                transform={`rotate(${angle} 14 14)`}
              />
            );
          })}
        </svg>
      );

    case 'wait':
      // Animated hourglass with sky-blue sand
      return (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          className="sa-cursor-hourglass-flip"
        >
          <path
            d="M8.5 5.5H19.5V8.4C19.5 10.6 17.8 12.5 15.8 14C17.8 15.5 19.5 17.4 19.5 19.6V22.5H8.5V19.6C8.5 17.4 10.2 15.5 12.2 14C10.2 12.5 8.5 10.6 8.5 8.4V5.5Z"
            fill="#FFFFFF"
          />
          <path
            d="M10.2 21.8C10.4 19.8 12.1 18.4 14 17.2C15.9 18.4 17.6 19.8 17.8 21.8H10.2Z"
            fill={accentBlue}
          />
          <path
            d="M11 8.5H17C16.7 10.2 15.5 11.4 14 12.4C12.5 11.4 11.3 10.2 11 8.5Z"
            fill={accentBlue}
          />
          <path
            d="M7.5 5.5H20.5M7.5 22.5H20.5M9 5.5V8.4C9 10.7 10.7 12.6 12.8 14C10.7 15.4 9 17.3 9 19.6V22.5M19 5.5V8.4C19 10.7 17.3 12.6 15.2 14C17.3 15.4 19 17.3 19 19.6V22.5"
            stroke={ink}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'zoom-in':
      // Magnifying glass with sky-blue +
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="12.5" cy="12.5" r="7" fill="#FFFFFF" stroke={ink} strokeWidth="2.2" />
          <path d="M17.8 17.8L23 23" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12.5 9.6V15.4M9.6 12.5H15.4" stroke={accentBlue} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'zoom-out':
      // Magnifying glass with sky-blue -
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="12.5" cy="12.5" r="7" fill="#FFFFFF" stroke={ink} strokeWidth="2.2" />
          <path d="M17.8 17.8L23 23" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M9.6 12.5H15.4" stroke={accentBlue} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'move':
      // 4-way rounded arrows
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M14 5V23M5 14H23"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path d="M14 5V23M5 14H23" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M14 3.5L11.5 7H16.5L14 3.5Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 24.5L11.5 21H16.5L14 24.5Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M3.5 14L7 11.5V16.5L3.5 14Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M24.5 14L21 11.5V16.5L24.5 14Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );

    case 'ns-resize':
      // Vertical double arrow
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 5.5V22.5" stroke="rgba(255,255,255,0.65)" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M14 5.5V22.5" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M14 3.5L11 7.5H17L14 3.5Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 24.5L11 20.5H17L14 24.5Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );

    case 'ew-resize':
      // Horizontal double arrow
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M5.5 14H22.5" stroke="rgba(255,255,255,0.65)" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M5.5 14H22.5" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M3.5 14L7.5 11V17L3.5 14Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M24.5 14L20.5 11V17L24.5 14Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );

    case 'nesw-resize':
      // Diagonal double arrow NE-SW
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M7.5 20.5L20.5 7.5" stroke="rgba(255,255,255,0.65)" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M7.5 20.5L20.5 7.5" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M22.5 5.5L17 6.8L21.2 11L22.5 5.5Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M5.5 22.5L6.8 17L11 21.2L5.5 22.5Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );

    case 'nwse-resize':
      // Diagonal double arrow NW-SE
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M7.5 7.5L20.5 20.5" stroke="rgba(255,255,255,0.65)" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M7.5 7.5L20.5 20.5" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M5.5 5.5L11 6.8L6.8 11L5.5 5.5Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M22.5 22.5L17 21.2L21.2 17L22.5 22.5Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );

    case 'not-allowed':
      // Circle with sky-blue diagonal slash
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="8" fill="#FFFFFF" stroke={ink} strokeWidth="2.2" />
          <line x1="8.6" y1="8.6" x2="19.4" y2="19.4" stroke={accentBlue} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'help':
      // Rounded question mark
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M10.8 10.2C10.8 8.3 12.2 6.8 14.1 6.8C16 6.8 17.4 8.2 17.4 10C17.4 11.4 16.4 12.3 15.1 13.1C14.2 13.7 14 14.3 14 15.5V16.4"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d="M10.8 10.2C10.8 8.3 12.2 6.8 14.1 6.8C16 6.8 17.4 8.2 17.4 10C17.4 11.4 16.4 12.3 15.1 13.1C14.2 13.7 14 14.3 14 15.5V16.4"
            stroke={ink}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="14" cy="20.2" r="1.6" fill={accentBlue} stroke={ink} strokeWidth="1.2" />
        </svg>
      );
  }
}
