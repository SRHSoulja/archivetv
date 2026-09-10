import React, { useState } from 'react';
import { X, Film, Play, Disc, Copy, Check } from 'lucide-react';
import { audio } from '../services/soundEffects';

export default function TapeRackDrawer({
  isOpen,
  onClose,
  currentChannel,
  channels = [],
  onSelectProgram,
  onSelectChannel,
  onCustomTapePlay,
}) {
  const [activeChannelId, setActiveChannelId] = useState(currentChannel?.id || channels[0]?.id);
  const [customInput, setCustomInput] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyUrl = async (identifier) => {
    const url = `https://archive.org/details/${identifier}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    audio.playSwitch(true);
    setCopiedId(identifier);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const selectedChan = channels.find((c) => c.id === activeChannelId) || currentChannel || channels[0];
  const tapes = selectedChan?.programs || [];

  const handleTapeClick = (prog) => {
    audio.playSwitch(true);
    if (selectedChan) {
      onSelectChannel(selectedChan);
    }
    onSelectProgram(prog);
    onClose();
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    setCustomLoading(true);
    setCustomError(null);
    try {
      await onCustomTapePlay(customInput.trim());
      setCustomInput('');
      onClose();
    } catch (err) {
      setCustomError(err.message || 'Could not find or load this archive tape.');
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[80vh] bg-[#1a1715] border-4 border-[#3d2c20] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#e3ded9]">
        {/* VCR Tape Rack Header */}
        <div className="woodgrain-pattern p-4 border-b-2 border-[#523d2e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-black/60 border border-amber-600/50 flex items-center justify-center">
              <Film className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-pixel text-amber-400 text-lg md:text-xl font-bold">
                VHS TAPE RACK & VCR ARCHIVE
              </div>
              <div className="font-mono text-zinc-400 text-xs">
                SELECT A CASSETTE TAPE TO LOAD INTO THE TELEVISION VCR DECK
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playKnobClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Tape Shelves Tabs */}
        <div className="bg-[#12100e] px-4 py-2 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto retro-scroll">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                audio.playKnobClick();
                setActiveChannelId(ch.id);
              }}
              className={`px-3 py-1.5 rounded-lg font-pixel text-xs whitespace-nowrap cursor-pointer transition ${
                activeChannelId === ch.id
                  ? 'bg-amber-600 text-black font-bold shadow'
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700'
              }`}
            >
              CH {ch.number} • {ch.callsign}
            </button>
          ))}
        </div>

        {/* Cassette Tapes Grid */}
        <div className="flex-1 overflow-y-auto p-5 retro-scroll bg-[#151311]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tapes.map((prog, idx) => (
              <div
                key={prog.identifier || idx}
                onClick={() => handleTapeClick(prog)}
                className="group relative bg-[#0d0c0a] border-2 border-zinc-700 hover:border-amber-400 rounded-xl p-3 shadow-lg hover:shadow-amber-500/20 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                    <span className="font-pixel text-[10px] text-amber-500">
                      TAPE #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {Math.round(prog.duration / 60)} MINS
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(prog.identifier);
                        }}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 border border-zinc-700 cursor-pointer"
                        title="Copy Archive URL"
                      >
                        {copiedId === prog.identifier ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-zinc-800 mb-2.5">
                    <img
                      src={prog.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 font-pixel text-[11px] text-white font-bold truncate drop-shadow">
                      {prog.title}
                    </div>
                  </div>

                  <div className="bg-[#f0ede6] text-[#1c1a17] p-2 rounded border border-zinc-400 font-mono text-xs shadow-inner">
                    <div className="font-bold truncate text-black">{prog.title}</div>
                    <div className="text-[10px] text-zinc-700 flex justify-between mt-0.5">
                      <span>YEAR: {prog.year || 'VINTAGE'}</span>
                      <span className="text-red-700 font-bold">SP MODE</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                    {prog.description}
                  </p>
                </div>

                <button className="mt-3 w-full py-1.5 bg-zinc-800 group-hover:bg-amber-500 group-hover:text-black text-zinc-300 font-pixel text-xs font-bold rounded flex items-center justify-center gap-1.5 transition">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>INSERT & PLAY TAPE</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Tape Insert Deck (VCR Slot) */}
        <div className="bg-[#0e0c0a] p-3 border-t-2 border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Disc className="w-4 h-4 text-amber-500 animate-spin" />
            <span className="font-pixel text-xs text-amber-400">
              CUSTOM TAPE DECK (ENTER ANY ARCHIVE.ORG ID OR URL):
            </span>
          </div>

          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. night_of_the_living_dead"
              className="bg-black/60 border border-zinc-700 rounded-lg px-3 py-1 text-xs text-amber-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400 w-full md:w-64 font-mono"
            />
            <button
              type="submit"
              disabled={customLoading}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-pixel text-xs font-bold rounded cursor-pointer transition disabled:opacity-50 whitespace-nowrap"
            >
              {customLoading ? 'LOADING...' : 'LOAD TAPE'}
            </button>
          </form>
          {customError && (
            <div className="text-red-400 text-xs font-mono">{customError}</div>
          )}
        </div>
      </div>
    </div>
  );
}
