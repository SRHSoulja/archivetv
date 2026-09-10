import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Film, Radio } from 'lucide-react';
import { fetchTheatricalPoster, getCachedPosterSync } from '../services/posterService';
import { fetchFullDescription } from '../services/archiveApi';
import { ImagePlus } from 'lucide-react';
import ArtOverridePanel from './ArtOverridePanel';

function formatRuntime(seconds) {
  const total = Math.round(Number(seconds) || 0);
  if (!total) return '';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}H ${String(m).padStart(2, '0')}M` : `${m}M`;
}

// Archive.org descriptions carry markup (and the odd <a>), so render them as text.
function stripHtml(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default function NowPlayingSleeve({ currentProgram, currentChannel, powerOn, gutters }) {
  const panelRef = useRef(null);
  const [panelWidth, setPanelWidth] = useState(0);
  const identifier = currentProgram?.identifier || '';
  const seriesTitle = currentProgram?.seriesTitle || '';
  const fullTitle = currentProgram?.title || '';
  const title = seriesTitle || fullTitle;
  const year = currentProgram?.year || '';

  const [poster, setPoster] = useState(null);
  const [fullBlurb, setFullBlurb] = useState('');
  const [artFailed, setArtFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [artToolOpen, setArtToolOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  const blurbRef = useRef(null);

  // Same two-step the tape rack uses: cached/curated art paints instantly, the
  // network lookup only runs when there is nothing on hand.
  useEffect(() => {
    let alive = true;
    setArtFailed(false);
    setExpanded(false);
    setArtToolOpen(false);
    const instant = getCachedPosterSync(title, year, identifier);
    setPoster(instant || null);
    if (instant || !identifier) return undefined;

    fetchTheatricalPoster(title, year, identifier)
      .then((found) => {
        if (alive && found) setPoster(found);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [identifier, title, year]);

  // Measured rather than assumed: the panel is zoomed by the height
  // breakpoints, so its real width is only knowable after layout. It stays
  // mounted and is hidden with visibility (not display) precisely so it can
  // always be measured.
  useLayoutEffect(() => {
    const el = blurbRef.current;
    if (el && !expanded) {
      setClipped(el.scrollHeight > el.clientHeight + 1);
    }
  });

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w && Math.abs(w - panelWidth) > 1) setPanelWidth(w);
  });

  useEffect(() => {
    setFullBlurb('');
    const short = stripHtml(currentProgram?.description);
    if (!identifier || !short.endsWith('...')) return undefined;

    let alive = true;
    fetchFullDescription(identifier)
      .then((full) => {
        if (alive && full && full.length > short.length) setFullBlurb(full);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [identifier, currentProgram?.description]);

  if (!powerOn || !currentProgram) return null;

  const fits = Boolean(gutters?.ready) && panelWidth > 0 && gutters.width >= panelWidth + 24;

  // Fill the gutter instead of sitting at a hardcoded width, but stay bounded by
  // the height too: the sleeve is mostly a 2:3 poster, so its height runs at
  // ~1.5x its width plus roughly 250px of header, label and synopsis. Solving
  // that against the viewport keeps a wide gutter from producing a sleeve too
  // tall for a short screen.
  // Usable band sits below the sticky header, with a 16px margin top and bottom.
  const topInset = gutters?.topInset || 0;
  const bandH = Math.max(0, (gutters?.viewportH || 0) - topInset - 32);
  const bandCenterY = topInset + bandH / 2 + 16;

  const gutterCap = Math.max(0, (gutters?.width || 0) - 40);
  const heightCap = Math.max(0, (bandH - 270) / 1.5);
  const sleeveWidth = Math.max(180, Math.min(gutterCap, heightCap, 340));

  const episode =
    seriesTitle && fullTitle.startsWith(`${seriesTitle} - `)
      ? fullTitle.slice(seriesTitle.length + 3)
      : null;
  const blurb = fullBlurb || stripHtml(currentProgram.description);

  // Same source chain the tape rack uses. Falling back to the item's thumbnail
  // and then archive.org's image service is why the rack nearly always has
  // artwork; the sleeve was giving up after posterService and showing a
  // placeholder instead.
  const posterSrc =
    poster ||
    currentProgram.thumbnailUrl ||
    (identifier ? `https://archive.org/services/img/${identifier}` : null);
  const episodeCount = currentProgram.availableFiles?.length || 0;
  const runtime = formatRuntime(currentProgram.duration);

  return (
    <div
      className="sleeve-stage select-none"
      style={{
        position: 'fixed',
        zIndex: 40,
        top: gutters?.ready ? `${bandCenterY}px` : '50%',
        left: gutters?.ready ? `${gutters.leftCenter}px` : '-9999px',
        transform: 'translate(-50%, -50%)',
        visibility: fits ? 'visible' : 'hidden',
      }}
    >
      <div
        ref={panelRef}
        style={{
          position: 'relative',
          width: `${sleeveWidth}px`,
          maxHeight: bandH ? `${bandH}px` : undefined,
        }}
        className=" bg-gradient-to-b from-[#2a292e] via-[#1c1b20] to-[#121115] rounded-3xl p-4 shadow-2xl border-2 border-zinc-700/80 flex flex-col overflow-hidden">
        {/* Header strip, mirroring the remote's */}
        <div className="w-full shrink-0 flex items-center justify-between pb-3 border-b border-zinc-700/60">
          <div className="flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-pixel text-[11px] text-zinc-400 tracking-wider">NOW PLAYING</span>
          </div>
          <div className="flex items-center gap-2">
            {currentChannel?.callsign && (
              <span className="font-pixel text-[9px] text-amber-500/90 tracking-wider">
                {currentChannel.callsign}
              </span>
            )}

          </div>
        </div>

        {/* Box art, presented as a tape sleeve */}
        <div className="w-full my-3 shrink-0 rounded-xl overflow-hidden border-2 border-zinc-800 bg-[#060b08] shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]">
          <div className="relative w-full aspect-[2/3] bg-[#0a0806] overflow-hidden flex items-center justify-center">
            {posterSrc && !artFailed ? (
              <>
                {/* Ambient backdrop, so non-2:3 artwork fills the sleeve rather
                    than sitting on dead space */}
                <img
                  src={posterSrc}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-40 pointer-events-none"
                />
                {/* object-contain, not cover: wide title cards and banners fit
                    whole instead of being cropped */}
                <img
                  src={posterSrc}
                  alt={title}
                  className="relative z-10 w-full h-full object-contain"
                  onError={(e) => {
                    const thumb = currentProgram.thumbnailUrl;
                    if (thumb && e.target.src !== thumb) {
                      e.target.src = thumb;
                    } else {
                      setArtFailed(true);
                    }
                  }}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 px-3 text-center">
                <Radio className="w-7 h-7 text-zinc-700" />
                <span className="font-pixel text-[9px] text-zinc-600 leading-relaxed">
                  NO SLEEVE ART
                </span>
              </div>
            )}
            {identifier && (
              <button
                type="button"
                onClick={() => setArtToolOpen(true)}
                title="Suggest better box art"
                aria-label="Suggest better box art"
                className="absolute bottom-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-md bg-black/75 border border-zinc-500/70 text-zinc-300 font-pixel text-[9px] tracking-wider opacity-60 hover:opacity-100 hover:text-amber-300 hover:border-amber-400/70 transition-all cursor-pointer"
              >
                <ImagePlus className="w-3 h-3" /> ART
              </button>
            )}

            {/* Sleeve gloss */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-transparent" />
          </div>
        </div>

        {/* Tape label */}
        <div className="w-full shrink-0 bg-[#060b08] rounded-xl p-2.5 border-2 border-zinc-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)]">
          <div className="font-vcr text-phosphor-green text-sm font-bold leading-snug break-words line-clamp-3 drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]">
            {title || 'UNTITLED'}
          </div>
          {episode && (
            <div className="font-mono text-[11px] text-zinc-400 mt-1 break-words line-clamp-2" title={episode}>
              {episode}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 pt-1.5 border-t border-zinc-900/70 font-pixel text-[9px] text-zinc-500">
            {year && <span>{year}</span>}
            {year && currentChannel?.number && <span className="text-zinc-700">|</span>}
            {currentChannel?.number && <span>CH {currentChannel.number}</span>}
            {runtime && <span className="text-zinc-700">|</span>}
            {runtime && <span>{runtime}</span>}
            {episodeCount > 1 && <span className="text-zinc-700">|</span>}
            {episodeCount > 1 && <span>{episodeCount} EPS</span>}
          </div>
        </div>

        {blurb && (
          <div
            className="mt-3 min-h-0 flex-1 overflow-y-auto retro-scroll pr-1"
          >
            <p
              ref={blurbRef}
              className={`text-[11px] leading-relaxed text-zinc-400 ${
                expanded ? '' : 'line-clamp-6'
              }`}
            >
              {blurb}
            </p>
          </div>
        )}

        {blurb && (clipped || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 shrink-0 self-start font-pixel text-[9px] text-amber-400 hover:text-amber-300 tracking-wider cursor-pointer"
          >
            {expanded ? '- SHOW LESS' : '+ READ MORE'}
          </button>
        )}

        {artToolOpen && (
          <ArtOverridePanel
            identifier={identifier}
            title={title}
            year={year}
            onClose={() => setArtToolOpen(false)}
            onApplied={(next) => {
              setArtFailed(false);
              setPoster(next);
            }}
          />
        )}
      </div>
    </div>
  );
}
