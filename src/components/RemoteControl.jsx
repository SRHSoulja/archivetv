import React, { useState, useEffect } from 'react';
import {
  Power,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  List,
  Search,
  Shuffle,
  Film,
  X,
  Radio,
  RotateCcw,
  Palette,
  Tv,
  Sliders,
} from 'lucide-react';
import { audio } from '../services/soundEffects';

export default function RemoteControl({
  isOpen,
  onClose,
  powerOn,
  onTogglePower,
  onNextChannel,
  onPrevChannel,
  onSelectChannelByNumber,
  volume,
  onVolumeChange,
  muted,
  onToggleMute,
  onOpenGuide,
  onOpenSearch,
  onOpenTapeRack,
  onOpenChannelStudio,
  onToggleLiveTv,
  onRestartProgram,
  liveTvMode,
  aspectRatio = '4:3',
  onToggleAspectRatio,
  onRandomChannel,
  colorMode = 'color',
  onCycleColorMode,
}) {
  const [irBlinking, setIrBlinking] = useState(false);
  const [digitBuffer, setDigitBuffer] = useState('');

  const triggerIr = () => {
    audio.playRemoteBeep();
    setIrBlinking(true);
    setTimeout(() => setIrBlinking(false), 120);
  };

  const handleDigit = (digit) => {
    triggerIr();
    const newBuf = (digitBuffer + digit).slice(-2);
    setDigitBuffer(newBuf);

    if (newBuf.length === 2 || parseInt(newBuf, 10) > 1) {
      const chNum = newBuf.padStart(2, '0');
      onSelectChannelByNumber(chNum);
      setTimeout(() => setDigitBuffer(''), 1500);
    }
  };

  const handleRewind = () => {
    triggerIr();
    if (onRestartProgram) onRestartProgram();
  };

  useEffect(() => {
    if (digitBuffer) {
      const t = setTimeout(() => {
        if (digitBuffer) {
          onSelectChannelByNumber(digitBuffer.padStart(2, '0'));
          setDigitBuffer('');
        }
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [digitBuffer]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="w-56 bg-gradient-to-b from-[#2a292e] via-[#1c1b20] to-[#121115] rounded-3xl p-4 shadow-2xl border-2 border-zinc-700/80 flex flex-col items-center">
        {/* Top IR Blaster & Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-700/60">
          <div className="flex items-center gap-2">
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-100 ${
                irBlinking
                  ? 'bg-red-400 shadow-[0_0_12px_#ff2233] scale-125'
                  : 'bg-red-950 border border-red-900/60'
              }`}
            />
            <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">
              INFRARED RC-90
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded cursor-pointer"
            title="Close Remote"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Digital Readout Display */}
        <div className="w-full my-2.5 bg-black/80 rounded-lg p-2 border border-zinc-800 flex items-center justify-between font-vcr">
          <span className="text-zinc-500 text-xs">DIAL:</span>
          <span className="text-phosphor-green text-xl tracking-widest font-bold">
            {digitBuffer ? `CH ${digitBuffer}` : '--'}
          </span>
        </div>

        {/* Top Power & Mute Row */}
        <div className="w-full grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => {
              triggerIr();
              onTogglePower();
            }}
            className={`py-2 px-3 rounded-lg font-pixel text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
              powerOn
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>PWR</span>
          </button>

          <button
            onClick={() => {
              triggerIr();
              onToggleMute();
            }}
            className={`py-2 px-3 rounded-lg font-pixel text-xs flex items-center justify-center gap-1 cursor-pointer transition ${
              muted
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600'
            }`}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>MUTE</span>
          </button>
        </div>

        {/* Channel Up/Down & Volume Up/Down Rockers */}
        <div className="w-full grid grid-cols-2 gap-3 mb-3">
          <div className="bg-zinc-800/80 p-1.5 rounded-xl border border-zinc-700 flex flex-col items-center">
            <span className="font-pixel text-[9px] text-zinc-400 mb-1">CHANNEL</span>
            <div className="flex flex-col gap-1 w-full">
              <button
                onClick={() => {
                  triggerIr();
                  onNextChannel();
                }}
                className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  triggerIr();
                  onPrevChannel();
                }}
                className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-zinc-800/80 p-1.5 rounded-xl border border-zinc-700 flex flex-col items-center">
            <span className="font-pixel text-[9px] text-zinc-400 mb-1">VOLUME</span>
            <div className="flex flex-col gap-1 w-full">
              <button
                onClick={() => {
                  triggerIr();
                  onVolumeChange(Math.min(1, volume + 0.1));
                }}
                className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  triggerIr();
                  onVolumeChange(Math.max(0, volume - 0.1));
                }}
                className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Number Keypad (1 to 9, 0) */}
        <div className="w-full grid grid-cols-3 gap-1.5 mb-3 bg-black/40 p-2 rounded-xl border border-zinc-800">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(String(num))}
              className="h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-pixel text-xs border border-zinc-600/80 shadow-sm flex items-center justify-center cursor-pointer active:bg-zinc-900 active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => {
              triggerIr();
              onRandomChannel();
            }}
            title="Random Channel Hop"
            className="h-8 rounded bg-purple-900/60 hover:bg-purple-800/60 text-purple-200 font-pixel text-[10px] border border-purple-500/50 flex items-center justify-center cursor-pointer active:scale-95"
          >
            <Shuffle className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-pixel text-xs border border-zinc-600/80 flex items-center justify-center cursor-pointer active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleRewind}
            title="Rewind to Beginning (00:00)"
            className="h-8 rounded bg-amber-900/70 hover:bg-amber-800 text-amber-200 font-pixel text-[9px] border border-amber-500/60 flex items-center justify-center cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Feature Buttons (Guide, Search, Tapes, Live) */}
        <div className="w-full grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              triggerIr();
              onOpenGuide();
            }}
            className="py-1.5 px-2 bg-blue-950 hover:bg-blue-900 border border-blue-600/50 text-blue-200 rounded font-pixel text-[10px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <List className="w-3 h-3" />
            <span>GUIDE</span>
          </button>

          <button
            onClick={() => {
              triggerIr();
              onOpenSearch();
            }}
            className="py-1.5 px-2 bg-amber-950 hover:bg-amber-900 border border-amber-600/50 text-amber-200 rounded font-pixel text-[10px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <Search className="w-3 h-3" />
            <span>SEARCH</span>
          </button>

          <button
            onClick={() => {
              triggerIr();
              onOpenTapeRack();
            }}
            className="py-1.5 px-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-200 rounded font-pixel text-[10px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <Film className="w-3 h-3" />
            <span>VCR/TAPE</span>
          </button>

          <button
            onClick={() => {
              triggerIr();
              onToggleLiveTv();
            }}
            className={`py-1.5 px-2 rounded font-pixel text-[10px] flex items-center justify-center gap-1 cursor-pointer border ${
              liveTvMode
                ? 'bg-red-950 text-red-200 border-red-600/60 animate-pulse'
                : 'bg-zinc-800 text-zinc-300 border-zinc-600'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>{liveTvMode ? 'LIVE AIR' : 'START 00:00'}</span>
          </button>

          {onCycleColorMode && (
            <button
              onClick={() => {
                triggerIr();
                onCycleColorMode();
              }}
              title="Cycle Picture Modes (Color / B&W / Amber / Green)"
              className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded font-pixel text-[10px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Palette className="w-3 h-3 text-amber-400" />
              <span>{colorMode.toUpperCase()}</span>
            </button>
          )}

          {onToggleAspectRatio && (
            <button
              onClick={() => {
                triggerIr();
                onToggleAspectRatio();
              }}
              title="Toggle Aspect Ratio (4:3 / 16:9)"
              className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded font-pixel text-[10px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Tv className="w-3 h-3 text-blue-400" />
              <span>{aspectRatio}</span>
            </button>
          )}

          {onOpenChannelStudio && (
            <button
              onClick={() => {
                triggerIr();
                onOpenChannelStudio();
              }}
              title="Channel Studio: Customize Lineup & Drop Videos"
              className="py-1.5 px-2 col-span-2 bg-gradient-to-r from-amber-950 via-orange-950 to-amber-950 hover:from-amber-900 hover:to-orange-900 border border-amber-500/60 text-amber-300 rounded font-pixel text-[10px] flex items-center justify-center gap-1 cursor-pointer shadow-sm active:scale-95"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>CHANNEL STUDIO</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
