import React, { useState, useEffect } from 'react';
import { X, Check, Copy, GitPullRequest, RotateCcw } from 'lucide-react';
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

  return (
    <div className="absolute inset-0 z-40 bg-[#0d0c10]/97 p-3 flex flex-col overflow-y-auto retro-scroll">
      <div className="flex items-center justify-between shrink-0 pb-2 border-b border-zinc-700/60">
        <span className="font-pixel text-[10px] text-amber-400 tracking-wider">BOX ART</span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-white cursor-pointer"
          aria-label="Close box art tool"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="mt-2 shrink-0 font-mono text-[9px] text-zinc-500 break-all">{identifier}</p>

      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste an image URL"
        spellCheck={false}
        className="mt-2 shrink-0 w-full bg-black/60 border border-zinc-700 focus:border-amber-500/70 rounded px-2 py-1.5 text-[11px] text-zinc-200 outline-none"
      />

      {status && (
        <div className="mt-2 shrink-0 font-pixel text-[9px] leading-relaxed">
          {status.state === 'checking' && <span className="text-zinc-500">CHECKING...</span>}
          {status.state === 'invalid' && <span className="text-red-400">MUST START WITH HTTP</span>}
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

      {usable && (
        <div className="mt-2 shrink-0 rounded-lg overflow-hidden border border-zinc-700 bg-black">
          <div className="relative w-full aspect-[2/3] flex items-center justify-center">
            <img
              src={url.trim()}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-40"
            />
            <img src={url.trim()} alt="Preview" className="relative w-full h-full object-contain" />
          </div>
        </div>
      )}

      <div className="mt-3 shrink-0 flex flex-col gap-1.5">
        <button
          type="button"
          disabled={!usable}
          onClick={apply}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded font-pixel text-[9px] tracking-wider border transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed bg-green-900/60 hover:bg-green-800/70 border-green-600/50 text-green-200"
        >
          <Check className="w-3 h-3" /> USE THIS HERE
        </button>

        <button
          type="button"
          disabled={!usable}
          onClick={copy}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded font-pixel text-[9px] tracking-wider border transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-300"
        >
          <Copy className="w-3 h-3" /> {copied ? 'COPIED' : 'COPY CODE LINE'}
        </button>

        <a
          href={usable ? issueUrl() : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!usable}
          onClick={(e) => !usable && e.preventDefault()}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded font-pixel text-[9px] tracking-wider border transition bg-amber-900/50 hover:bg-amber-800/60 border-amber-600/50 text-amber-200 ${
            usable ? 'cursor-pointer' : 'opacity-35 cursor-not-allowed'
          }`}
        >
          <GitPullRequest className="w-3 h-3" /> SUGGEST FOR REPO
        </a>

        {hasOverride && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded font-pixel text-[9px] tracking-wider border bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-400 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> RESET TO DEFAULT
          </button>
        )}
      </div>

      <p className="mt-2 shrink-0 text-[9px] leading-relaxed text-zinc-600">
        Saved in this browser only. Suggesting opens a prefilled issue with the exact line to add.
      </p>
    </div>
  );
}
