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
  RotateCw,
  Play,
  Pause,
  Palette,
  Tv,
  Sliders,
} from 'lucide-react';
import { audio } from '../services/soundEffects';

export default function RemoteControl({
  isOpen,
  onClose,
  currentChannel,
  powerOn,
  onTogglePower,
  onNextChannel,
  onPrevChannel,
  onSelectChannelByNumber,
  onToggleAux,
  volume,
  onVolumeChange,
  muted,
  onToggleMute,
  isPlaying = true,
  onTogglePlayPause,
  onSeekDelta,
  onOpenGuide,
  onOpenSearch,
  onOpenTapeRack,
  onOpenChannelStudio,
  onToggleLiveTv,
  onRestartProgram,
  liveTvMode,
  aspectRatio = 'auto',
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
        <div className="w-full my-2.5 bg-[#060b08] rounded-xl p-2.5 border-2 border-zinc-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] flex flex-col font-vcr">
          <div className="flex items-center justify-between text-[10px] font-pixel text-zinc-500 pb-1 border-b border-zinc-900/80">
            <span className="tracking-wider text-zinc-400">RC-TUNER</span>
            <div className="flex items-center gap-1.5">
              {muted && <span className="text-amber-400 font-bold">MUTE</span>}
              <span
                className={
                  powerOn
                    ? !isPlaying
                      ? 'text-amber-400 font-bold animate-pulse'
                      : 'text-phosphor-green animate-pulse'
                    : 'text-zinc-600'
                }
              >
                {powerOn
                  ? !isPlaying
                    ? '❚❚ PAUSED'
                    : currentChannel?.number === 'AUX'
                    ? '● AUX-IN'
                    : '● ON-AIR'
                  : 'STANDBY'}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span className="text-phosphor-green text-2xl tracking-widest font-bold drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]">
              {digitBuffer
                ? `CH ${digitBuffer}_`
                : currentChannel?.number === 'AUX'
                ? `AUX-${currentChannel.baseChannelNumber || '02'}`
                : currentChannel?.number
                ? `CH ${currentChannel.number}`
                : 'CH --'}
            </span>
            <span className="text-phosphor-green/90 text-xs font-mono font-bold uppercase tracking-wider truncate max-w-[95px] text-right">
              {currentChannel?.callsign || ''}
            </span>
          </div>

          {currentChannel?.name && (
            <div className="text-[10px] font-mono text-zinc-400 truncate mt-1 pt-0.5 border-t border-zinc-900/60">
              {currentChannel.number === 'AUX' ? `TAPE: ${currentChannel.name}` : currentChannel.name}
            </div>
          )}
        </div>

        {/* Top Power, TV/AUX, & Mute Row */}
        <div className="w-full grid grid-cols-3 gap-1.5 mb-3">
          <button
            onClick={() => {
              triggerIr();
              onTogglePower();
            }}
            className={`py-2 px-1.5 rounded-lg font-pixel text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
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
              if (onToggleAux) onToggleAux();
            }}
            title={currentChannel?.number === 'AUX' ? 'Return to Broadcast TV' : 'Switch to AUX / Tape Input'}
            className={`py-2 px-1.5 rounded-lg font-pixel text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition border ${
              currentChannel?.number === 'AUX'
                ? 'bg-amber-500 text-black border-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>{currentChannel?.number === 'AUX' ? 'TV' : 'AUX'}</span>
          </button>

          <button
            onClick={() => {
              triggerIr();
              onToggleMute();
            }}
            className={`py-2 px-1.5 rounded-lg font-pixel text-[11px] flex items-center justify-center gap-1 cursor-pointer transition ${
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

        {/* Playback Transport Controls (Rewind 10s, Play/Pause, Forward 10s) */}
        <div className="w-full bg-black/50 p-1.5 rounded-2xl border border-zinc-800/90 mb-3 grid grid-cols-3 gap-1.5 shadow-inner">
          <button
            onClick={() => {
              triggerIr();
              if (onSeekDelta) onSeekDelta(-10);
            }}
            title="Rewind 10s (J / ←)"
            className="h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer active:scale-95 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              triggerIr();
              if (onTogglePlayPause) onTogglePlayPause();
            }}
            title={isPlaying ? 'Pause Broadcast (Space / K)' : 'Resume Broadcast (Space / K)'}
            className={`h-8 rounded-xl font-pixel text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95 shadow ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black border border-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'bg-green-600 hover:bg-green-500 text-white border border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={() => {
              triggerIr();
              if (onSeekDelta) onSeekDelta(10);
            }}
            title="Fast Forward 10s (L / →)"
            className="h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer active:scale-95 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
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
              title="Cycle Aspect Ratio (AUTO / 4:3 / 16:9)"
              className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded font-pixel text-[10px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Tv className="w-3 h-3 text-blue-400" />
              <span>{aspectRatio?.toUpperCase() || 'AUTO'}</span>
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
