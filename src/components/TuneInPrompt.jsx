import React from 'react';
import { Radio, SkipBack } from 'lucide-react';
import { audio } from '../services/soundEffects';

/**
 * Asked once, the first time the set is switched on.
 *
 * The wall-clock scheduler was already built and already good -- it derives the
 * slot from the time of day, hands back a seek offset so you join a programme
 * already running, and staggers each channel so they are not in lockstep. It was
 * also off by default and mentioned nowhere, so almost nobody ever saw it.
 *
 * This is one question, answered once, remembered afterwards. It is not a
 * settings panel: the same switch lives on the remote for anyone who changes
 * their mind.
 */
export default function TuneInPrompt({ isOpen, onChoose }) {
  if (!isOpen) return null;

  const choose = (live) => {
    audio.playSwitch(live);
    onChoose(live);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How would you like to watch?"
        className="w-full max-w-sm rounded-2xl border-2 border-amber-600/70 bg-[#141211] p-5 shadow-2xl text-zinc-300"
      >
        <h3 className="font-pixel text-amber-400 text-sm font-bold tracking-wide">
          HOW DO YOU WANT TO WATCH?
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
          Asked once. You can change it any time from the remote.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => choose(true)}
            className="w-full flex items-start gap-3 rounded-xl border-2 border-green-600/60 bg-green-950/40 px-3 py-3 text-left hover:bg-green-950/70 cursor-pointer transition"
          >
            <Radio className="mt-0.5 w-4 h-4 shrink-0 text-green-300" />
            <span className="min-w-0">
              <span className="block font-pixel text-[11px] tracking-wider text-green-300">
                LIVE — JOIN IN PROGRESS
              </span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-400">
                Every channel runs to the clock whether you are watching or not, so
                you arrive partway into whatever is on. Like switching on a
                television.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose(false)}
            className="w-full flex items-start gap-3 rounded-xl border-2 border-zinc-700 bg-zinc-900/70 px-3 py-3 text-left hover:border-zinc-600 cursor-pointer transition"
          >
            <SkipBack className="mt-0.5 w-4 h-4 shrink-0 text-amber-300" />
            <span className="min-w-0">
              <span className="block font-pixel text-[11px] tracking-wider text-amber-300">
                START FROM THE BEGINNING
              </span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-400">
                Every programme starts at 00:00. Better if you came here to watch
                one particular thing.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
