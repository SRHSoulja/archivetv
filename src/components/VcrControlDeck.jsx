import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronsLeft,
  ChevronsRight,
  FastForward,
  Rewind,
  Bookmark,
  BookmarkCheck,
  List,
  Tv,
} from 'lucide-react';
import { audio } from '../services/soundEffects';
import { isBookmarked, saveBookmark, removeBookmark } from '../services/archiveApi';

export default function VcrControlDeck({
  currentProgram,
  currentTime,
  duration,
  isPlaying,
  onTogglePlayPause,
  onSeek,
  onRestart,
  playbackRate = 1,
  onChangePlaybackRate,
  activeEngine = 'direct',
  onToggleEngine,
  onOpenEpisodes,
  episodesCount = 0,
}) {
  const progressBarRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverX, setHoverX] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (currentProgram?.identifier) {
      setBookmarked(isBookmarked(currentProgram.identifier));
    }
  }, [currentProgram?.identifier]);

  const handleToggleBookmark = () => {
    if (!currentProgram) return;
    audio.playSwitch(true);
    if (bookmarked) {
      removeBookmark(currentProgram.identifier);
      setBookmarked(false);
    } else {
      saveBookmark(currentProgram);
      setBookmarked(true);
    }
  };

  const seekRafRef = useRef(null);

  useEffect(() => {
    return () => {
      if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
    };
  }, []);

  const totalDur = duration || currentProgram?.duration || 1;
  const displayTime = isDragging ? hoverTime : currentTime;
  const progressPercent = Math.min(100, Math.max(0, (displayTime / totalDur) * 100));

  // Pointer drag-to-scrub implementation for super smooth scrub experience
  const computeSeekTarget = (clientX) => {
    if (!progressBarRef.current) return { targetTime: 0, xPosition: 0 };
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = rect.width > 0 ? x / rect.width : 0;
    return { targetTime: pct * totalDur, xPosition: x };
  };

  const handlePointerDown = (e) => {
    if (!progressBarRef.current) return;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const { targetTime, xPosition } = computeSeekTarget(e.clientX);
    setHoverTime(targetTime);
    setHoverX(xPosition);
    onSeek(targetTime);
  };

  const handlePointerMove = (e) => {
    const { targetTime, xPosition } = computeSeekTarget(e.clientX);
    setHoverTime(targetTime);
    setHoverX(xPosition);
    if (isDragging) {
      if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
      seekRafRef.current = requestAnimationFrame(() => {
        onSeek(targetTime);
      });
    }
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      if (seekRafRef.current) cancelAnimationFrame(seekRafRef.current);
      setIsDragging(false);
      onSeek(hoverTime);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Jump helpers
  const handleJump = (seconds) => {
    audio.playKnobClick();
    const target = Math.max(0, Math.min(totalDur, currentTime + seconds));
    onSeek(target);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `00:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
  const cycleRate = () => {
    audio.playSwitch(true);
    const currentIdx = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIdx + 1) % rates.length];
    onChangePlaybackRate(nextRate);
  };

  return (
    <div className="w-full mt-4 bg-[#141316] border-2 border-zinc-700/80 rounded-2xl p-3 md:p-4 shadow-2xl flex flex-col gap-3 select-none text-zinc-300 metal-brushed">
      {/* 1. Interactive Drag-to-Scrub Timeline with Hover Preview */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-pixel font-bold">VCR TAPE TRACK</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 truncate max-w-[180px] sm:max-w-md">
              {currentProgram?.title || 'No Broadcast'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-phosphor-green font-bold text-xs md:text-sm">
              {formatTime(currentTime)}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 text-xs md:text-sm">{formatTime(totalDur)}</span>
          </div>
        </div>

        {/* The Scrubber Track */}
        <div
          ref={progressBarRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => !isDragging && setIsHovering(false)}
          className="relative w-full h-6 bg-black/90 rounded-lg border-2 border-zinc-700 hover:border-amber-400 cursor-pointer overflow-visible flex items-center px-0.5 shadow-inner transition-colors group touch-none"
        >
          {/* Progress Fill */}
          <div
            className="h-3.5 bg-gradient-to-r from-emerald-600 via-green-500 to-amber-400 rounded-md shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all duration-75 relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Draggable Scrubber Head */}
            <div
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-amber-500 shadow-md transition-transform ${
                isDragging ? 'scale-150 ring-2 ring-amber-400/60' : 'group-hover:scale-125'
              }`}
            />
          </div>

          {/* Hover Tooltip Timestamp */}
          {(isHovering || isDragging) && (
            <div
              className="absolute -top-8 px-2 py-0.5 bg-black/95 text-amber-300 border border-amber-500/80 rounded font-mono text-[11px] pointer-events-none -translate-x-1/2 shadow-lg z-30 whitespace-nowrap"
              style={{ left: `${hoverX}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
      </div>

      {/* 2. VCR Transport Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/80">
        {/* Left: Tape Counter Vacuum Fluorescent Display */}
        <div className="bg-black/90 px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2 font-mono">
          <span className="text-[10px] text-zinc-500 font-pixel">COUNTER</span>
          <span className="text-phosphor-green text-sm md:text-base font-bold tracking-widest">
            {formatTime(currentTime)}
          </span>
        </div>

        {/* Center: Rewind / Skip / Play / Fast Forward Buttons */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Restart from 00:00 */}
          <button
            onClick={onRestart}
            title="Rewind to Beginning (00:00)"
            className="p-2 md:px-3 md:py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-600 text-amber-300 font-pixel text-xs flex items-center gap-1 cursor-pointer transition shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">00:00</span>
          </button>

          {/* Skip -60s */}
          <button
            onClick={() => handleJump(-60)}
            title="Rewind 60 seconds (Shift + Left)"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-600 text-zinc-200 cursor-pointer transition shadow"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Skip -10s */}
          <button
            onClick={() => handleJump(-10)}
            title="Rewind 10 seconds (Left Arrow or J)"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-600 text-zinc-200 cursor-pointer transition shadow"
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Big Main Play / Pause Button */}
          <button
            onClick={onTogglePlayPause}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-pixel text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-[0_0_12px_rgba(245,158,11,0.3)] active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Skip +10s */}
          <button
            onClick={() => handleJump(10)}
            title="Fast forward 10 seconds (Right Arrow or L)"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-600 text-zinc-200 cursor-pointer transition shadow"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Skip +60s */}
          <button
            onClick={() => handleJump(60)}
            title="Fast forward 60 seconds (Shift + Right)"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-600 text-zinc-200 cursor-pointer transition shadow"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Rate & Features */}
        <div className="flex items-center gap-2">
          {/* Playback Speed */}
          <button
            onClick={cycleRate}
            title="Cycle Playback Speed"
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-amber-300 font-mono text-xs cursor-pointer transition"
          >
            {playbackRate}x
          </button>

          {/* Episode Picker (if multi-episode) */}
          {episodesCount > 1 && (
            <button
              onClick={onOpenEpisodes}
              className="px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-600/60 text-blue-200 font-pixel text-xs flex items-center gap-1 cursor-pointer transition shadow animate-pulse"
              title="View all episodes in this series"
            >
              <List className="w-3.5 h-3.5" />
              <span>EPISODES ({episodesCount})</span>
            </button>
          )}

          {/* Bookmark Tape */}
          <button
            onClick={handleToggleBookmark}
            title={bookmarked ? 'Saved to My Tapes' : 'Bookmark this tape'}
            className={`p-2 rounded-lg border font-pixel text-xs cursor-pointer transition flex items-center gap-1 ${
              bookmarked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
          >
            {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>

          {/* Player Engine Switch */}
          <button
            onClick={onToggleEngine}
            title="Toggle between Direct CRT player and Archive.org Tube embed"
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-pixel text-[11px] flex items-center gap-1 cursor-pointer transition"
          >
            <Tv className="w-3.5 h-3.5 text-green-400" />
            <span className="hidden lg:inline">
              {activeEngine === 'embed' ? 'TUBE EMBED' : 'DIRECT CRT'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
