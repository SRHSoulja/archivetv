import React from 'react';
import {
  Tv,
  List,
  Search,
  Film,
  Sliders,
  Maximize2,
  Minimize2,
  Keyboard,
  Radio,
  Info,
  ListVideo,
  Megaphone,
} from 'lucide-react';
import { audio } from '../services/soundEffects';

function GithubIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function NavbarHeader({
  cabinetStyle,
  onSelectCabinetStyle,
  scanlinesEnabled,
  onToggleScanlines,
  onOpenPicture,
  onOpenBreaks,
  remoteOpen,
  onToggleRemote,
  onOpenGuide,
  onOpenSearch,
  onOpenTapeRack,
  onOpenChannelStudio,
  onOpenShortcuts,
  onOpenAbout,
  currentChannel,
  isFullscreen,
  onToggleFullscreen,
}) {
  return (
    <header className="nav-stage w-full bg-[#141210]/90 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 select-none z-30 sticky top-0">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg border border-amber-400/40">
          <Tv className="w-5 h-5 text-black" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-amber-400 text-base md:text-lg font-bold tracking-wider">
              ARCHIVE<span className="text-white">TV</span>
            </span>
            <span className="bg-red-950/80 text-red-400 border border-red-800/60 font-pixel text-[10px] px-1.5 py-0.5 rounded">
              ANALOG
            </span>
          </div>
          <div className="font-mono text-[10px] text-zinc-400 hidden sm:block">
            INTERNET ARCHIVE VINTAGE TELEVISION BOX
          </div>
        </div>
      </div>

      {/* Center Channel Quick Info Pill */}
      {currentChannel && (
        <div className="hidden md:flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-zinc-700/80 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-amber-400 font-pixel font-bold">CH {currentChannel.number}</span>
          <span className="text-zinc-300 truncate max-w-[160px]">{currentChannel.name}</span>
          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-pixel">
            {currentChannel.callsign}
          </span>
        </div>
      )}

      {/* Right Controls & Quick Actions */}
      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 min-w-0">
        {/* TV Guide Button */}
        <button
          onClick={() => {
            audio.playKnobClick();
            onOpenGuide();
          }}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-600/50 text-blue-200 rounded-lg font-pixel text-xs cursor-pointer transition shadow"
          title="Open Electronic Program Guide"
        >
          <List className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">GUIDE</span>
        </button>

        {/* Deep Archive Search */}
        <button
          onClick={() => {
            audio.playKnobClick();
            onOpenSearch();
          }}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/50 text-amber-200 rounded-lg font-pixel text-xs cursor-pointer transition shadow"
          title="Search all videos on Archive.org"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SEARCH</span>
        </button>

        {/* VCR / Tapes */}
        <button
          onClick={() => {
            audio.playKnobClick();
            onOpenTapeRack();
          }}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-200 rounded-lg font-pixel text-xs cursor-pointer transition shadow"
          title="Open VHS Cassette Rack"
        >
          <Film className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">TAPES</span>
        </button>

        {/* Channel Studio & Customizer */}
        <button
          onClick={() => {
            audio.playKnobClick();
            if (onOpenChannelStudio) onOpenChannelStudio();
          }}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-teal-950/80 hover:bg-teal-900 border border-teal-600/50 text-teal-200 rounded-lg font-pixel text-xs cursor-pointer transition shadow"
          title="Channel Studio — build and edit channels"
        >
          <ListVideo className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">CHANNELS</span>
        </button>

        {/* Commercial Breaks */}
        <button
          onClick={() => {
            audio.playKnobClick();
            onOpenBreaks();
          }}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/50 text-amber-200 rounded-lg font-pixel text-xs cursor-pointer transition shadow"
          title="Commercial breaks - build a reel of spots and set how often it interrupts"
        >
          <Megaphone className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">BREAKS</span>
        </button>

        <span className="mx-0.5 h-5 w-px bg-zinc-700/80 shrink-0" aria-hidden="true" />

        {/* Cabinet Style Selector Dropdown */}
        <select
          value={cabinetStyle}
          onChange={(e) => {
            audio.playSwitch(true);
            onSelectCabinetStyle(e.target.value);
          }}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 font-pixel text-xs px-1.5 sm:px-2.5 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:border-amber-500 max-w-[92px] sm:max-w-none"
          title="Select CRT Cabinet Style"
        >
          <option value="woodgrain">70s Woodgrain</option>
          <option value="trinitron">80s Trinitron</option>
          <option value="portable">90s Portable</option>
          <option value="pure">Pure CRT Glass</option>
        </select>

        {/* Remote Control Toggle */}
        <button
          onClick={() => {
            audio.playSwitch(!remoteOpen);
            onToggleRemote();
          }}
          className={`p-1.5 rounded-lg border font-pixel text-xs cursor-pointer transition flex items-center gap-1 ${
            remoteOpen
              ? 'bg-amber-500 text-black border-amber-400 font-bold shadow'
              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
          }`}
          title="Toggle Infrared Remote Control"
        >
          <Radio className="w-4 h-4" />
          <span className="hidden lg:inline">REMOTE</span>
        </button>

        {/* Picture Settings */}
        <button
          onClick={() => {
            audio.playKnobClick();
            onOpenPicture();
          }}
          className="p-1.5 rounded-lg border text-xs cursor-pointer transition bg-zinc-800/80 text-teal-300 border-zinc-700 hover:border-teal-500/60 hover:text-teal-200"
          title="Picture settings - scanlines, curvature, brightness, tinting"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
