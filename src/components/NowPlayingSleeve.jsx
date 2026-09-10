import React, { useState, useEffect } from 'react';
import { Film, Radio } from 'lucide-react';
import { fetchTheatricalPoster, getCachedPosterSync } from '../services/posterService';

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

export default function NowPlayingSleeve({ currentProgram, currentChannel, powerOn }) {
  const identifier = currentProgram?.identifier || '';
  const seriesTitle = currentProgram?.seriesTitle || '';
  const fullTitle = currentProgram?.title || '';
  const title = seriesTitle || fullTitle;
  const year = currentProgram?.year || '';

  const [poster, setPoster] = useState(null);

  // Same two-step the tape rack uses: cached/curated art paints instantly, the
  // network lookup only runs when there is nothing on hand.
  useEffect(() => {
    let alive = true;
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

  if (!powerOn || !currentProgram) return null;

  const episode =
    seriesTitle && fullTitle.startsWith(`${seriesTitle} - `)
      ? fullTitle.slice(seriesTitle.length + 3)
      : null;
  const blurb = stripHtml(currentProgram.description);

  return (
    <div className="sleeve-stage select-none">
      <div className="w-56 bg-gradient-to-b from-[#2a292e] via-[#1c1b20] to-[#121115] rounded-3xl p-4 shadow-2xl border-2 border-zinc-700/80 flex flex-col">
        {/* Header strip, mirroring the remote's */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-700/60">
          <div className="flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">NOW PLAYING</span>
          </div>
          {currentChannel?.callsign && (
            <span className="font-pixel text-[9px] text-amber-500/90 tracking-wider">
              {currentChannel.callsign}
            </span>
          )}
        </div>

        {/* Box art, presented as a tape sleeve */}
        <div className="w-full my-3 rounded-xl overflow-hidden border-2 border-zinc-800 bg-[#060b08] shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]">
          <div className="relative w-full aspect-[2/3] bg-[#0b0a0c] flex items-center justify-center">
            {poster ? (
              <img
                src={poster}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setPoster(null)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 px-3 text-center">
                <Radio className="w-7 h-7 text-zinc-700" />
                <span className="font-pixel text-[9px] text-zinc-600 leading-relaxed">
                  NO SLEEVE ART
                </span>
              </div>
            )}
            {/* Sleeve gloss */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-transparent" />
          </div>
        </div>

        {/* Tape label */}
        <div className="w-full bg-[#060b08] rounded-xl p-2.5 border-2 border-zinc-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)]">
          <div className="font-vcr text-phosphor-green text-xs font-bold leading-snug line-clamp-2 drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]">
            {title || 'UNTITLED'}
          </div>
          {episode && (
            <div className="font-mono text-[10px] text-zinc-400 mt-1 line-clamp-2">{episode}</div>
          )}
          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-zinc-900/70 font-pixel text-[9px] text-zinc-500">
            {year && <span>{year}</span>}
            {year && currentChannel?.number && <span className="text-zinc-700">|</span>}
            {currentChannel?.number && <span>CH {currentChannel.number}</span>}
          </div>
        </div>

        {blurb && (
          <p className="mt-3 text-[10px] leading-relaxed text-zinc-500 line-clamp-6">{blurb}</p>
        )}
      </div>
    </div>
  );
}
