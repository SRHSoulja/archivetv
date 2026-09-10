import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { audio } from '../services/soundEffects';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '▲ / ▼', desc: 'Channel Up / Channel Down' },
    { key: '◄ / ►', desc: 'Scrub Backward / Forward 10 seconds' },
    { key: 'Shift + ◄ / ►', desc: 'Scrub Backward / Forward 60 seconds' },
    { key: 'J / K / L', desc: 'Rewind 10s / Pause-Play / Fast Forward 10s' },
    { key: 'Home / Backspace', desc: 'Restart Video at Beginning (00:00)' },
    { key: 'Space', desc: 'Play / Pause Video' },
    { key: '0 - 9', desc: 'Direct Channel Number Entry' },
    { key: '+ / -', desc: 'Volume Up / Down' },
    { key: 'M', desc: 'Toggle Mute' },
    { key: 'P', desc: 'Main Power Toggle' },
    { key: 'C', desc: 'Cycle Picture Mode (Color / B&W / Amber / Green)' },
    { key: 'E', desc: 'Open Episodes / Track Selector' },
    { key: 'G', desc: 'Open Prevue TV Guide' },
    { key: 'U', desc: 'Open Channel Studio & Lineup Customizer' },
    { key: 'S', desc: 'Open Deep Archive Search & Explorer' },
    { key: 'T', desc: 'Open VHS Cassette Tape Shelf' },
    { key: 'R', desc: 'Toggle Handheld Infrared Remote' },
    { key: 'A', desc: 'Cycle Aspect Ratio (Auto / 4:3 / 16:9)' },
    { key: 'F', desc: 'Toggle Fullscreen Mode' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#181615] border-3 border-amber-600/60 rounded-2xl p-5 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <span className="font-pixel text-amber-400 text-base font-bold">
              TELEVISION & VCR KEYBOARD SHORTCUTS
            </span>
          </div>
          <button
            onClick={() => {
              audio.playKnobClick();
              onClose();
            }}
            className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto retro-scroll pr-1">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-zinc-800 text-xs font-mono"
            >
              <span className="text-zinc-300">{s.desc}</span>
              <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-600 rounded font-pixel text-amber-300 text-[11px] shadow">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800 text-center font-pixel text-[11px] text-zinc-500">
          PRO-TIP: DRAG THE VCR SCRUB BAR OR ANTENNAS ON SCREEN!
        </div>
      </div>
    </div>
  );
}
