import { useState, useEffect } from 'react';

/**
 * Measures the empty space either side of the TV cabinet.
 *
 * The cabinet is centred and capped at max-w-6xl, but it is also zoomed down on
 * short viewports -- which makes the side gutters WIDER, not narrower. That is
 * why a fixed min-width breakpoint is the wrong test for "is there room beside
 * the set": at 1366x768 the cabinet shrinks to ~830px and leaves 268px a side,
 * comfortably enough for a panel, even though the viewport is well under any
 * sensible width threshold. So measure the real thing instead of predicting it.
 */
export function useGutters(minPanelWidth = 200) {
  const [gutters, setGutters] = useState({
    ready: false,
    fits: false,
    width: 0,
    leftCenter: 0,
    rightCenter: 0,
    viewportH: 0,
    topInset: 0,
  });

  useEffect(() => {
    const stage = () => document.querySelector('.tv-stage');

    const measure = () => {
      const el = stage();
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const left = Math.max(0, r.left);
      const right = Math.max(0, vw - r.right);
      const width = Math.min(left, right);
      const header = document.querySelector('header') || document.querySelector('nav');
      setGutters({
        ready: true,
        // Leave a little breathing room so a panel never kisses the cabinet.
        fits: width >= minPanelWidth + 24,
        width,
        leftCenter: left / 2,
        rightCenter: vw - right / 2,
        viewportH: window.innerHeight,
        // The header is sticky at the top, so anything centred on the full
        // viewport height rides up underneath it once it gets tall enough.
        topInset: header ? Math.max(0, header.getBoundingClientRect().bottom) : 0,
      });
    };

    measure();
    window.addEventListener('resize', measure);

    // The cabinet's own size changes with the zoom breakpoints, and its contents
    // reflow (deck appearing on power-on), so watch the element too.
    let ro;
    const el = stage();
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    // Catch the first paint after fonts/layout settle.
    const t = setTimeout(measure, 250);

    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
      clearTimeout(t);
    };
  }, [minPanelWidth]);

  return gutters;
}
