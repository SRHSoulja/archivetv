import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Power,
  List,
  Search,
  Film,
  Volume2,
  VolumeX,
  Info,
  Radio,
  RotateCcw,
  Palette,
} from 'lucide-react';
import CrtScreen from './CrtScreen';
import VcrControlDeck from './VcrControlDeck';
import { audio } from '../services/soundEffects';

const TvBoxCabinet = forwardRef(function TvBoxCabinet(
  {
    cabinetStyle = 'woodgrain',
    powerOn,
    onTogglePower,
    currentChannel,
    currentProgram,
    onProgramEnded,
    onNextChannel,
    onPrevChannel,
    volume,
    onVolumeChange,
    muted,
    onToggleMute,
    scanlinesEnabled,
    curvatureEnabled,
    aspectRatio,
    trackingOffset,
    onTrackingChange,
    antennaAngle,
    onAntennaAngleChange,
    signalQuality,
    liveTvMode,
    onRestartProgram,
    onOpenGuide,
    onOpenSearch,
    onOpenTapeRack,
    onOpenEpisodes,
    channelZap,
    colorMode = 'color',
    onCycleColorMode,
    brightness = 100,
    contrast = 100,
    playbackRate = 1,
    onChangePlaybackRate,
    activeEngine = 'direct',
    onEngineChange,
    onToggleEngine,
  },
  ref
) {
  const crtRef = useRef(null);
  const [showOsd, setShowOsd] = useState(false);
  const [powerAnimating, setPowerAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Expose imperative playback controls to parent (for hotkeys & shortcuts)
  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      crtRef.current?.seekTo(seconds);
    },
    seekDelta: (deltaSeconds) => {
      if (crtRef.current) {
        crtRef.current.seekTo(currentTime + deltaSeconds);
      }
    },
    togglePlayPause: () => {
      crtRef.current?.togglePlayPause();
    },
    restart: () => {
      crtRef.current?.restart();
      if (onRestartProgram) onRestartProgram();
    },
  }));

  const handlePowerClick = () => {
    audio.playSwitch(!powerOn);
    if (powerOn) {
      audio.playPowerOff();
      setPowerAnimating('off');
      setTimeout(() => {
        onTogglePower();
        setPowerAnimating(false);
      }, 420);
    } else {
      audio.playPowerOn();
      setPowerAnimating('on');
      onTogglePower();
      setTimeout(() => {
        setPowerAnimating(false);
      }, 600);
    }
  };

  const handleChannelKnobRotate = () => {
    audio.playKnobClick();
    onNextChannel();
  };

  // Wheel to tune channel
  const handleChannelDialWheel = (e) => {
    e.preventDefault();
    audio.playKnobClick();
    if (e.deltaY < 0) {
      onNextChannel();
    } else {
      onPrevChannel();
    }
  };

  const handleVolumeKnobClick = () => {
    audio.playKnobClick();
    const newVol = volume >= 0.9 ? 0.2 : Number((volume + 0.2).toFixed(1));
    onVolumeChange(newVol);
  };

  const handleFineTuneClick = () => {
    audio.playKnobClick();
    if (Math.abs(trackingOffset) > 5) {
      onTrackingChange(0);
    } else {
      onTrackingChange(25);
    }
  };

  const handleSeek = (seconds) => {
    if (crtRef.current) {
      crtRef.current.seekTo(seconds);
    }
  };

  const handleTogglePlayPause = () => {
    if (crtRef.current) {
      crtRef.current.togglePlayPause();
    }
  };

  const handleRestart = () => {
    if (crtRef.current) {
      crtRef.current.restart();
    }
  };

  const currentChNum = parseInt(currentChannel?.number || '2', 10);
  const dialRotation = !Number.isNaN(currentChNum)
    ? ((currentChNum - 2) / 11) * 300 - 150
    : -150;
  const volumeRotation = volume * 270 - 135;
  const fineTuneRotation = (trackingOffset / 50) * 120;

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center select-none">
      {/* 1. Rabbit Ear Antennas */}
      {cabinetStyle !== 'pure' && (
        <div className="relative w-64 h-24 flex justify-center items-end select-none pointer-events-auto z-10 -mb-2">
          <div className="w-16 h-5 bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-800 rounded-t-lg shadow-inner border-t border-zinc-400 flex items-center justify-around px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-600" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-600" />
          </div>

          <div
            onClick={() => onAntennaAngleChange((antennaAngle - 15) % 60)}
            title="Adjust Antenna Reception"
            className="absolute bottom-4 left-1/2 origin-bottom w-1.5 h-32 bg-gradient-to-r from-zinc-300 via-white to-zinc-400 shadow-md cursor-grab active:cursor-grabbing transition-transform duration-300"
            style={{
              transform: `translateX(-6px) rotate(-${28 + antennaAngle * 0.4}deg)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-zinc-300 absolute -top-2 -left-0.75 border border-zinc-500 shadow" />
          </div>

          <div
            onClick={() => onAntennaAngleChange((antennaAngle + 15) % 60)}
            title="Adjust Antenna Reception"
            className="absolute bottom-4 right-1/2 origin-bottom w-1.5 h-32 bg-gradient-to-r from-zinc-300 via-white to-zinc-400 shadow-md cursor-grab active:cursor-grabbing transition-transform duration-300"
            style={{
              transform: `translateX(6px) rotate(${28 + antennaAngle * 0.4}deg)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-zinc-300 absolute -top-2 -left-0.75 border border-zinc-500 shadow" />
          </div>
        </div>
      )}

      {/* 2. Main TV Cabinet Chassis */}
      <div
        className={`relative w-full rounded-3xl p-3 md:p-6 transition-all duration-300 ${
          cabinetStyle === 'woodgrain'
            ? 'woodgrain-pattern border-6 md:border-12 border-[#2b170c] shadow-wood-cabinet'
            : cabinetStyle === 'trinitron'
            ? 'bg-[#151518] border-6 md:border-12 border-[#222228] shadow-2xl'
            : cabinetStyle === 'portable'
            ? 'bg-[#403f44] border-6 md:border-12 border-[#2d2c30] shadow-2xl rounded-4xl'
            : 'bg-black border-2 border-zinc-900 p-0 shadow-2xl'
        }`}
      >
        {/* Vintage Brand Badge on Top Bezel */}
        {cabinetStyle !== 'pure' && (
          <div className="flex items-center justify-between px-2 md:px-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[11px] md:text-xs tracking-widest uppercase font-bold text-amber-500/80 drop-shadow">
                {cabinetStyle === 'woodgrain'
                  ? 'ARCHIVE-VISION DELUXE COLOR CONSOLE'
                  : cabinetStyle === 'trinitron'
                  ? 'ARCHIVETRON • HI-BLACK MATRIX'
                  : 'SOLID STATE 1984'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-amber-300/70 border border-amber-600/30 hidden sm:inline">
                SOLID STATE VHF/UHF
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 text-[11px] font-pixel text-zinc-400 cursor-pointer"
                onClick={() => onAntennaAngleChange(0)}
                title="Click to calibrate antenna"
              >
                <Radio
                  className={`w-3.5 h-3.5 ${
                    signalQuality > 80 ? 'text-green-400' : 'text-amber-400 animate-pulse'
                  }`}
                />
                <span>SIG {Math.round(signalQuality)}%</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    powerOn
                      ? 'bg-red-500 shadow-[0_0_12px_#ff3344] ring-2 ring-red-400/40'
                      : 'bg-red-950/80 border border-red-900/50'
                  }`}
                />
                <span className="font-pixel text-[10px] text-zinc-500">PWR</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Screen and Control Panel Container */}
        <div className="flex flex-col lg:flex-row gap-4 md:gap-5 items-stretch">
          {/* CRT Screen Frame Bezel */}
          <div className="flex-1 flex flex-col">
            <div
              className={`relative bg-[#131217] rounded-2xl md:rounded-3xl p-2.5 md:p-5 border-3 md:border-6 ${
                cabinetStyle === 'woodgrain'
                  ? 'border-[#1a120d] shadow-inner'
                  : 'border-[#1b1b20] shadow-inner'
              }`}
            >
              <div
                className={`w-full overflow-hidden transition-all duration-300 ${
                  powerAnimating === 'off' ? 'crt-power-off' : ''
                } ${powerAnimating === 'on' ? 'crt-power-on' : ''}`}
              >
                <CrtScreen
                  ref={crtRef}
                  powerOn={powerOn}
                  currentChannel={currentChannel}
                  currentProgram={currentProgram}
                  onProgramEnded={onProgramEnded}
                  volume={volume}
                  muted={muted}
                  scanlinesEnabled={scanlinesEnabled}
                  curvatureEnabled={curvatureEnabled}
                  aspectRatio={aspectRatio}
                  trackingOffset={trackingOffset}
                  signalQuality={signalQuality}
                  liveTvMode={liveTvMode}
                  showOsd={showOsd}
                  channelZap={channelZap}
                  onRestartProgram={onRestartProgram}
                  playbackRate={playbackRate}
                  colorMode={colorMode}
                  brightness={brightness}
                  contrast={contrast}
                  activeEngine={activeEngine}
                  onEngineChange={onEngineChange || onToggleEngine}
                  onTimeUpdateReport={(cur, dur, playing) => {
                    setCurrentTime(cur);
                    setDuration(dur);
                    setIsPlaying(playing);
                  }}
                />
              </div>
            </div>

            {/* VCR TRANSPORT CONTROL DECK & SCRUBBER */}
            {powerOn && (
              <VcrControlDeck
                currentProgram={currentProgram}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onTogglePlayPause={handleTogglePlayPause}
                onSeek={handleSeek}
                onRestart={handleRestart}
                playbackRate={playbackRate}
                onChangePlaybackRate={onChangePlaybackRate}
                activeEngine={activeEngine}
                onToggleEngine={onToggleEngine}
                onOpenEpisodes={onOpenEpisodes}
                episodesCount={currentProgram?.availableFiles?.length || 0}
              />
            )}
          </div>

          {/* 4. Side Control Panel */}
          {cabinetStyle !== 'pure' && (
            <div className="lg:w-72 bg-[#1b1916] rounded-2xl p-4 border-2 border-black/60 flex flex-col justify-between gap-5 metal-brushed">
              {/* Channel & Volume Rotary Dials Section */}
              <div className="flex flex-row lg:flex-col items-center justify-around gap-4">
                {/* ROTARY CHANNEL SELECTOR KNOB */}
                <div className="flex flex-col items-center">
                  <span className="font-pixel text-[11px] tracking-wider text-amber-400 font-bold mb-1">
                    CHANNEL SELECT
                  </span>
                  <div
                    onWheel={handleChannelDialWheel}
                    className="relative w-24 h-24 rounded-full bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950 p-1 rotary-knob-shadow flex items-center justify-center border-2 border-zinc-600"
                    title="Click or scroll mouse wheel to change channel"
                  >
                    <div
                      className="absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-300"
                      style={{ transform: `rotate(${dialRotation}deg)` }}
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num, i) => {
                        const deg = (i / 11) * 300 - 150;
                        return (
                          <span
                            key={num}
                            className="absolute text-[10px] font-bold font-mono text-zinc-300 pointer-events-none"
                            style={{
                              transform: `rotate(${deg}deg) translateY(-36px) rotate(-${deg}deg)`,
                            }}
                          >
                            {num}
                          </span>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleChannelKnobRotate}
                      className="w-14 h-14 rounded-full bg-gradient-to-t from-zinc-900 via-zinc-700 to-zinc-800 border-2 border-amber-600/40 shadow-inner flex flex-col items-center justify-start pt-1.5 cursor-pointer hover:brightness-110 active:scale-95 transition-transform"
                    >
                      <div className="w-1.5 h-3.5 bg-amber-400 rounded-full shadow-[0_0_5px_#ffb000]" />
                    </button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        audio.playKnobClick();
                        onPrevChannel();
                      }}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded font-pixel text-xs active:bg-zinc-900 cursor-pointer"
                    >
                      ◀ CH-
                    </button>
                    <button
                      onClick={() => {
                        audio.playKnobClick();
                        onNextChannel();
                      }}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded font-pixel text-xs active:bg-zinc-900 cursor-pointer"
                    >
                      CH+ ▶
                    </button>
                  </div>
                </div>

                {/* VOLUME & TRACKING SECTION */}
                <div className="flex flex-row lg:flex-row items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="font-pixel text-[10px] text-zinc-400 mb-1">VOLUME</span>
                    <button
                      onClick={handleVolumeKnobClick}
                      title={`Volume: ${Math.round(volume * 100)}% (Click to adjust)`}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-600 via-zinc-800 to-zinc-950 p-1 rotary-knob-shadow flex items-center justify-center border border-zinc-500 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div
                        className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex flex-col items-center pt-1 transition-transform"
                        style={{ transform: `rotate(${volumeRotation}deg)` }}
                      >
                        <div className="w-1 h-2 bg-red-400 rounded-full" />
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        audio.playSwitch(!muted);
                        onToggleMute();
                      }}
                      className="mt-1 text-[10px] font-pixel text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center gap-1"
                    >
                      {muted ? (
                        <VolumeX className="w-3 h-3 text-red-400" />
                      ) : (
                        <Volume2 className="w-3 h-3 text-green-400" />
                      )}
                      <span>{muted ? 'MUTED' : `${Math.round(volume * 100)}%`}</span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="font-pixel text-[10px] text-zinc-400 mb-1">FINE TUNE</span>
                    <button
                      onClick={handleFineTuneClick}
                      title="Adjust Signal Fine Tuning (V-Hold)"
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-600 via-zinc-800 to-zinc-950 p-1 rotary-knob-shadow flex items-center justify-center border border-zinc-500 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div
                        className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex flex-col items-center pt-1 transition-transform"
                        style={{ transform: `rotate(${fineTuneRotation}deg)` }}
                      >
                        <div className="w-1 h-2 bg-amber-400 rounded-full" />
                      </div>
                    </button>
                    <span className="mt-1 text-[9px] font-pixel text-zinc-500">
                      {trackingOffset === 0
                        ? 'LOCKED'
                        : `${trackingOffset > 0 ? '+' : ''}${trackingOffset}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* REWIND & COLOR MODE ROW */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={handleRestart}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-amber-900/60 hover:bg-amber-800/80 border border-amber-500/70 text-amber-200 font-pixel text-[11px] shadow active:scale-95 cursor-pointer"
                  title="Rewind to 00:00"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>START 00:00</span>
                </button>

                <button
                  onClick={onCycleColorMode}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 font-pixel text-[11px] shadow active:scale-95 cursor-pointer"
                  title="Cycle CRT Color Modes (Color / B&W / Amber / Green)"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>{colorMode.toUpperCase()}</span>
                </button>
              </div>

              {/* Navigation Pushbuttons (Guide, Search, Tape Rack, OSD) */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                <button
                  onClick={() => {
                    audio.playKnobClick();
                    onOpenGuide();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-blue-950/80 hover:bg-blue-900/80 border border-blue-600/50 text-blue-200 font-pixel text-[11px] shadow active:scale-95 cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>TV GUIDE</span>
                </button>

                <button
                  onClick={() => {
                    audio.playKnobClick();
                    onOpenSearch();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-amber-950/80 hover:bg-amber-900/80 border border-amber-600/50 text-amber-200 font-pixel text-[11px] shadow active:scale-95 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>ARCHIVE</span>
                </button>

                <button
                  onClick={() => {
                    audio.playKnobClick();
                    onOpenTapeRack();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-600/50 text-emerald-200 font-pixel text-[11px] shadow active:scale-95 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>TAPES</span>
                </button>

                <button
                  onClick={() => {
                    audio.playKnobClick();
                    setShowOsd(!showOsd);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 font-pixel text-[11px] shadow active:scale-95 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>INFO</span>
                </button>
              </div>

              {/* Bottom Row: Power Rocker Switch & Speaker Grille */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-4">
                <div className="flex flex-col items-center">
                  <button
                    onClick={handlePowerClick}
                    className={`w-14 h-12 rounded-md font-pixel text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center cursor-pointer border-2 ${
                      powerOn
                        ? 'bg-red-700 hover:bg-red-600 text-white border-red-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_12px_rgba(239,68,68,0.5)]'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-600 shadow-[0_3px_0_#111]'
                    }`}
                  >
                    <Power className="w-4 h-4 mb-0.5" />
                    <span>{powerOn ? 'ON' : 'OFF'}</span>
                  </button>
                  <span className="font-pixel text-[9px] text-zinc-500 mt-1">MAIN POWER</span>
                </div>

                <div className="flex-1 h-14 rounded-lg speaker-grille border border-black/80 flex items-center justify-center relative overflow-hidden">
                  <div
                    className={`w-full h-full bg-amber-500/5 transition-opacity ${
                      powerOn && !muted && volume > 0 ? 'animate-pulse' : 'opacity-0'
                    }`}
                  />
                  <span className="absolute font-pixel text-[9px] text-zinc-600 tracking-wider">
                    DYNAMIC SPEAKER
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default TvBoxCabinet;
