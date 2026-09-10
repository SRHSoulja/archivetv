import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Copy, GitPullRequest, RotateCcw, ImagePlus } from 'lucide-react';
import { setPosterOverride, clearPosterOverride, getPosterOverride } from '../services/posterService';

const REPO = 'https://github.com/SRHSoulja/archivetv';
// Below this the art upscales badly in the sleeve -- it is the size the
// archive.org thumbnail service returns, and why those fallbacks look weak.
const MIN_WIDTH = 200;

export default function ArtOverridePanel({ identifier, title, year, onClose, onApplied }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const hasOverride = Boolean(getPosterOverride(identifier));

  // Validate by actually loading it, so the verdict reflects what the sleeve
  // will really do rather than what the URL looks like.
  useEffect(() => {
    const candidate = url.trim();
    setCopied(false);
    if (!candidate) return setStatus(null);
    if (!/^https?:\/\//i.test(candidate)) return setStatus({ state: 'invalid' });

    setStatus({ state: 'checking' });
    let alive = true;
    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setStatus({ state: w < MIN_WIDTH ? 'small' : 'ok', w, h });
      };
      img.onerror = () => alive && setStatus({ state: 'fail' });
      img.src = candidate;
    }, 400);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [url]);

  const usable = status?.state === 'ok' || status?.state === 'small';
  const snippet = `  '${identifier}': '${url.trim()}',`;

  const issueUrl = () => {
    const body = [
      `**Programme:** ${title}${year ? ` (${year})` : ''}`,
      `**Identifier:** \`${identifier}\``,
      `**Proposed art:** ${url.trim()}`,
      status?.w ? `**Dimensions:** ${status.w}x${status.h}` : '',
      '',
      'Line for `CURATED_POSTERS` in `src/services/posterService.js`:',
      '```js',
      snippet,
      '```',
      '',
      '_Submitted from the in-app box art tool; the URL was confirmed to load at the size above._',
    ]
      .filter(Boolean)
      .join('\n');
    return `${REPO}/issues/new?title=${encodeURIComponent(
      `Box art: ${title}`
    )}&body=${encodeURIComponent(body)}&labels=box-art`;
  };

  const apply = () => {
    setPosterOverride(identifier, url.trim());
    onApplied?.(url.trim());
    onClose?.();
  };

  const reset = () => {
    clearPosterOverride(identifier);
    onApplied?.(null);
    onClose?.();
  };

  const copy = () => {
    try {
      navigator.clipboard?.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#141211] border-2 border-amber-600/70 rounded-2xl p-5 shadow-2xl text-zinc-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <ImagePlus className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-pixel text-amber-400 text-sm font-bold tracking-wide">BOX ART</h3>
              <p className="font-mono text-[10px] text-zinc-500 break-all leading-tight">
                {identifier}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white cursor-pointer p-1"
            aria-label="Close box art tool"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-zinc-400">
          Paste an image URL to preview it here. It is checked by loading it, so the verdict is
          what the sleeve will really do.
        </p>

        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          spellCheck={false}
          autoFocus
          className="mt-3 w-full bg-black/60 border-2 border-zinc-700 focus:border-amber-500/70 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none font-mono"
        />

        {status && (
          <div className="mt-3 font-pixel text-[10px] leading-relaxed">
            {status.state === 'checking' && <span className="text-zinc-500">CHECKING...</span>}
            {status.state === 'invalid' && (
              <span className="text-red-400">MUST START WITH HTTP</span>
            )}
            {status.state === 'fail' && <span className="text-red-400">WILL NOT LOAD</span>}
            {status.state === 'small' && (
              <span className="text-amber-400">
                LOADS BUT SMALL &mdash; {status.w}x{status.h}, UPSCALES POORLY
              </span>
            )}
            {status.state === 'ok' && (
              <span className="text-green-400">
                LOOKS GOOD &mdash; {status.w}x{status.h}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-4">
          {usable && (
            <div className="w-32 shrink-0 rounded-lg overflow-hidden border-2 border-zinc-700 bg-black">
              <div className="relative w-full aspect-[2/3] flex items-center justify-center">
                <img
                  src={url.trim()}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-40"
                />
                <img
                  src={url.trim()}
                  alt="Preview"
                  className="relative w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-2">
            <button
              type="button"
              disabled={!usable}
              onClick={apply}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-pixel text-[10px] tracking-wider border-2 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-green-900/60 hover:bg-green-800/70 border-green-600/60 text-green-200"
            >
              <Check className="w-3.5 h-3.5" /> USE THIS HERE
            </button>

            <button
              type="button"
              disabled={!usable}
              onClick={copy}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-pixel text-[10px] tracking-wider border-2 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-200"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? 'COPIED' : 'COPY CODE LINE'}
            </button>

            <a
              href={usable ? issueUrl() : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!usable}
              onClick={(e) => !usable && e.preventDefault()}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-pixel text-[10px] tracking-wider border-2 transition bg-amber-900/60 hover:bg-amber-800/70 border-amber-600/60 text-amber-200 ${
                usable ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" /> SUGGEST FOR REPO
            </a>

            {hasOverride && (
              <button
                type="button"
                onClick={reset}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-pixel text-[10px] tracking-wider border-2 bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-400 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> RESET TO DEFAULT
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 pt-3 border-t border-zinc-800 text-[11px] leading-relaxed text-zinc-500">
          Saved in this browser only &mdash; nothing you do here affects other viewers. Suggesting
          opens a prefilled issue containing the exact line to add.
        </p>
      </div>
    </div>,
    document.body
  );
}
