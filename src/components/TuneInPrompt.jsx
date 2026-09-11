import React from 'react';
import { Radio, SkipBack, Power, Volume2 } from 'lucide-react';
import { audio } from '../services/soundEffects';

/**
 * The card you get before the set is properly on.
 *
 * It exists because browsers will not let a page make noise until someone has
 * interacted with it, so every cold visit begins muted and something has to ask
 * for a click. Rather than apologise for that in a small notice over the
 * picture, the requirement is the moment: you switch the television on.
 *
 * Two shapes, never both:
 *
 *  - First visit: a short rundown of what this is, and the one question worth
 *    asking — join everything in progress, or start it from the beginning. The
 *    answer is remembered, and either button doubles as the gesture that
 *    unmutes.
 *  - Any later visit where the browser has muted us: just the switch. No
 *    rundown, no question already answered. Browsers stop blocking autoplay
 *    once you have used a site enough, so this fades away for regulars without
 *    anyone having to add a "don't show again".
 */
export default function TuneInPrompt({ isOpen, firstRun = false, onChoose, onSwitchOn }) {
  if (!isOpen) return null;

  const choose = (live) => {
    audio.playSwitch(live);
    onChoose?.(live);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={firstRun ? 'Welcome to ArchiveTV' : 'Switch the set on'}
        className="w-full max-w-sm rounded-2xl border-2 border-amber-600/70 bg-[#141211] p-5 shadow-2xl text-zinc-300"
      >
        {firstRun ? (
          <>
            <h3 className="font-pixel text-amber-400 text-sm font-bold tracking-wide">
              WELCOME TO ARCHIVETV
            </h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
              A television set pointed at the Internet Archive. Twelve channels of
              public-domain film and broadcast — turn the dial, browse your tape
              shelf, or build channels of your own.
            </p>
            <ul className="mt-2 space-y-0.5 text-[10px] leading-relaxed text-zinc-400">
              <li>
                <span className="text-amber-300">↑ ↓</span> change channel ·{' '}
                <span className="text-amber-300">T</span> tape shelf ·{' '}
                <span className="text-amber-300">?</span> every hotkey
              </li>
            </ul>

            <p className="mt-3 font-pixel text-[10px] tracking-wider text-zinc-400">
              HOW DO YOU WANT TO WATCH?
            </p>

            <div className="mt-1.5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => choose(true)}
                className="w-full flex items-start gap-3 rounded-xl border-2 border-green-600/60 bg-green-950/40 px-3 py-2.5 text-left hover:bg-green-950/70 cursor-pointer transition"
              >
                <Radio className="mt-0.5 w-4 h-4 shrink-0 text-green-300" />
                <span className="min-w-0">
                  <span className="block font-pixel text-[11px] tracking-wider text-green-300">
                    LIVE — JOIN IN PROGRESS
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-400">
                    Channels run to the clock whether you are watching or not, so you
                    arrive partway into whatever is on.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => choose(false)}
                className="w-full flex items-start gap-3 rounded-xl border-2 border-zinc-700 bg-zinc-900/70 px-3 py-2.5 text-left hover:border-zinc-600 cursor-pointer transition"
              >
                <SkipBack className="mt-0.5 w-4 h-4 shrink-0 text-amber-300" />
                <span className="min-w-0">
                  <span className="block font-pixel text-[11px] tracking-wider text-amber-300">
                    START FROM THE BEGINNING
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-400">
                    Every programme starts at 00:00. Better if you came for one
                    particular thing.
                  </span>
                </span>
              </button>
            </div>

            <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-zinc-400">
              <Volume2 className="w-3 h-3 shrink-0 text-amber-400" />
              Either one turns the sound on. Change your mind later with{' '}
              <span className="text-amber-300">V</span>.
            </p>
          </>
        ) : (
          <>
            <h3 className="font-pixel text-amber-400 text-sm font-bold tracking-wide">
              SWITCH THE SET ON
            </h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
              Your browser keeps a page silent until you interact with it, so the
              picture is running without sound.
            </p>
            <button
              type="button"
              onClick={() => {
                audio.playSwitch(true);
                onSwitchOn?.();
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-amber-500 px-3 py-3 font-pixel text-xs font-bold tracking-wider text-black hover:bg-amber-400 cursor-pointer transition active:scale-[0.98]"
            >
              <Power className="w-4 h-4" />
              TURN THE SOUND ON
            </button>
            <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
              Anything else you click will do it too.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
