import React from 'react';
import { X, Sliders, RotateCcw } from 'lucide-react';
import { audio } from '../services/soundEffects';
import { useDialog } from '../hooks/useDialog';

const COLOR_MODES = [
  { id: 'color', label: 'COLOR' },
  { id: 'bw', label: 'B&W' },
  { id: 'amber', label: 'AMBER' },
  { id: 'green', label: 'GREEN' },
];

function Toggle({ label, hint, on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => {
        audio.playSwitch(!on);
        onChange(!on);
      }}
      className={`w-full flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition cursor-pointer ${
        on
          ? 'bg-green-950/50 border-green-600/60'
          : 'bg-zinc-900/70 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      <span className="min-w-0">
        <span
          className={`block font-pixel text-[11px] tracking-wider ${
            on ? 'text-green-300' : 'text-zinc-400'
          }`}
        >
          {label}
        </span>
        <span className="block mt-0.5 text-[10px] leading-relaxed text-zinc-400">{hint}</span>
      </span>
      <span
        className={`shrink-0 mt-0.5 w-9 h-5 rounded-full border-2 flex items-center transition ${
          on ? 'bg-green-600/40 border-green-500 justify-end' : 'bg-zinc-800 border-zinc-600 justify-start'
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full mx-0.5 ${on ? 'bg-green-300' : 'bg-zinc-500'}`}
        />
      </span>
    </button>
  );
}

function Slider({ label, value, onChange, min = 60, max = 140 }) {
  return (
    <div>
      <div className="flex items-center justify-between font-pixel text-[10px] tracking-wider">
        <span className="text-zinc-400">{label}</span>
        <span className={value === 100 ? 'text-zinc-500' : 'text-amber-300'}>{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 accent-amber-500 cursor-pointer"
      />
    </div>
  );
}

export default function PictureSettingsModal({
  isOpen,
  onClose,
  scanlinesEnabled,
  onToggleScanlines,
  curvatureEnabled,
  onToggleCurvature,
  eraTintEnabled,
  onToggleEraTint,
  brightness,
  onBrightnessChange,
  contrast,
  onContrastChange,
  colorMode,
  onColorModeChange,
}) {
  const dialogRef = useDialog(isOpen);
  if (!isOpen) return null;

  const applyPreset = (preset) => {
    audio.playKnobClick();
    if (preset === 'clean') {
      onToggleScanlines(false);
      onToggleCurvature(false);
      onToggleEraTint(false);
      onBrightnessChange(100);
      onContrastChange(100);
      onColorModeChange('color');
      return;
    }
    onToggleScanlines(true);
    onToggleCurvature(true);
    onToggleEraTint(true);
    onBrightnessChange(100);
    onContrastChange(100);
    onColorModeChange('color');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Picture settings"
        className="relative w-full max-w-md max-h-[88vh] overflow-y-auto retro-scroll bg-[#141211] border-2 border-amber-600/70 rounded-2xl p-5 shadow-2xl text-zinc-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-pixel text-amber-400 text-sm font-bold tracking-wide">PICTURE</h3>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Tune or switch off the CRT effects
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white cursor-pointer p-1"
            aria-label="Close picture settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Toggle
            label="SCANLINES"
            hint="Horizontal lines across the tube."
            on={scanlinesEnabled}
            onChange={onToggleScanlines}
          />
          <Toggle
            label="SCREEN CURVATURE"
            hint="Rounds the corners the way real glass did."
            on={curvatureEnabled}
            onChange={onToggleCurvature}
          />
          <Toggle
            label="ERA TINTING"
            hint="Ages the picture to match the programme: grayscale for silent film, sepia for golden age. Off shows the source as-is."
            on={eraTintEnabled}
            onChange={onToggleEraTint}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Slider label="BRIGHTNESS" value={brightness} onChange={onBrightnessChange} />
          <Slider label="CONTRAST" value={contrast} onChange={onContrastChange} />
        </div>

        <div className="mt-4">
          <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">PHOSPHOR</span>
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {COLOR_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  audio.playKnobClick();
                  onColorModeChange(m.id);
                }}
                className={`py-1.5 rounded-lg font-pixel text-[10px] tracking-wider border-2 cursor-pointer transition ${
                  colorMode === m.id
                    ? 'bg-amber-500 text-black border-yellow-300 font-bold'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-zinc-800 flex gap-2">
          <button
            type="button"
            onClick={() => applyPreset('clean')}
            className="flex-1 py-2 rounded-lg font-pixel text-[10px] tracking-wider border-2 bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-200 cursor-pointer"
          >
            CLEAN PICTURE
          </button>
          <button
            type="button"
            onClick={() => applyPreset('crt')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-pixel text-[10px] tracking-wider border-2 bg-amber-900/60 hover:bg-amber-800/70 border-amber-600/60 text-amber-200 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> FULL CRT
          </button>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-zinc-400">
          Saved in this browser. Antenna and tracking still affect the picture separately.
        </p>
      </div>
    </div>
  );
}
