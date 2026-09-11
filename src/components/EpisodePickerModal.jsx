import React, { useState } from 'react';
import { X, Play, Clock, Search, Film } from 'lucide-react';
import { audio } from '../services/soundEffects';
import { useDialog } from '../hooks/useDialog';

export default function EpisodePickerModal({
  isOpen,
  onClose,
  currentProgram,
  onSelectEpisode,
}) {
  const dialogRef = useDialog(isOpen);
  const [filterText, setFilterText] = useState('');

  if (!isOpen || !currentProgram?.availableFiles || currentProgram.availableFiles.length === 0) {
    return null;
  }

  const episodes = currentProgram.availableFiles;
  const filtered = episodes.filter((ep) =>
    (ep.displayName || ep.name).toLowerCase().includes(filterText.toLowerCase())
  );

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePick = (ep) => {
    audio.playSwitch(true);
    onSelectEpisode(ep);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Episode picker"
        className="relative w-full max-w-2xl bg-[#141217] border-2 border-blue-600/70 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-[#19223d] to-blue-950 p-4 border-b-2 border-blue-600/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900/60 border border-blue-400 flex items-center justify-center">
              <Film className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="font-pixel text-yellow-400 text-lg font-bold">
                EPISODE & TRACK SELECTOR
              </div>
              <div className="font-mono text-xs text-blue-200 truncate max-w-sm">
                {currentProgram.title} ({episodes.length} Episodes Available)
              </div>
            </div>
          </div>

          <button
            aria-label="Close episode picker"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 bg-[#181620] border-b border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter episodes by title or number..."
              className="w-full bg-black/60 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-blue-100 placeholder-zinc-500 focus:outline-none focus:border-blue-400 font-mono"
            />
          </div>
        </div>

        {/* Episode List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 retro-scroll bg-[#0e0d12]">
          {filtered.map((ep, idx) => {
            const isCurrent = currentProgram.videoUrl === ep.videoUrl;
            return (
              <div
                key={ep.name || idx}
                onClick={() => handlePick(ep)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                  isCurrent
                    ? 'bg-blue-900/60 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                    : 'bg-[#18171f] border-zinc-800 hover:border-blue-500/80 hover:bg-[#201e29]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-black/60 border border-zinc-700 font-pixel text-xs text-amber-400 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate group-hover:text-yellow-300">
                      {ep.displayName || ep.name}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{formatTime(ep.duration)}</span>
                      <span>•</span>
                      <span>{ep.format}</span>
                    </div>
                  </div>
                </div>

                <button
                  className={`px-3 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1 shrink-0 ${
                    isCurrent
                      ? 'bg-yellow-400 text-black font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isCurrent ? 'PLAYING' : 'PLAY'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
