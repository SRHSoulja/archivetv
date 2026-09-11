import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  // <summary> is natively focusable and easy to forget: leaving it out of the
  // list made it look like the end of the dialog, and Tab walked out past it.
  'summary',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Focus management for a modal panel.
 *
 * Escape is handled centrally in App, where the panels are stacked in order, so
 * this hook deliberately does not touch it. What it does cover is the part no
 * panel had: keyboard focus was left wherever it was when the panel opened, so
 * Tab walked straight out of the dialog into the controls behind it, and closing
 * the panel dropped focus on the body instead of returning it to whatever
 * opened the thing.
 *
 * Returns a ref for the panel element.
 */
export function useDialog(isOpen) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  const focusables = useCallback(() => {
    const root = panelRef.current;
    if (!root) return [];
    return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
      if (el === document.activeElement) return true;
      // Not offsetParent: the contents of a collapsed <details> still report
      // one, so they stayed in the list while the browser skipped them, and Tab
      // fell out of the dialog at what looked like the last item. An element
      // with no layout boxes cannot be tabbed to.
      if (el.getClientRects().length === 0) return false;
      return !el.closest('details:not([open])') || el.tagName === 'SUMMARY';
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    restoreRef.current = document.activeElement;

    // Focus the panel itself rather than its first control: landing on a
    // destructive-looking button would be worse than landing nowhere, and the
    // panel carries tabindex="-1" so it can hold focus without joining the order.
    const id = requestAnimationFrame(() => {
      const root = panelRef.current;
      if (root && !root.contains(document.activeElement)) root.focus?.();
    });

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current?.focus?.();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panelRef.current?.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKeyDown, true);
      const el = restoreRef.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
  }, [isOpen, focusables]);

  return panelRef;
}
