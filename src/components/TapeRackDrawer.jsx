import React, { useState, useEffect } from 'react';
import { X, Film, Play, Disc, Copy, Check, Bookmark, Trash2, Star, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { audio } from '../services/soundEffects';
import { getBookmarks, removeBookmark } from '../services/archiveApi';
import { fetchTheatricalPoster } from '../services/posterService';

export default function TapeRackDrawer({
  isOpen,
  onClose,
  currentChannel,
  channels = [],
  onSelectChannel,
  onCustomTapePlay,
  onPlayDirectItem,
}) {
  const [activeTab, setActiveTab] = useState('channels'); // 'channels' | 'bookmarks'
  const [viewMode, setViewMode] = useState('boxart'); // 'boxart' | 'cassette'
  const [bookmarks, setBookmarks] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(currentChannel?.id || channels[0]?.id);
  const [customInput, setCustomInput] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [posterMap, setPosterMap] = useState({});

  const selectedChan = channels.find((c) => c.id === activeChannelId) || currentChannel || channels[0];
  const tapes = selectedChan?.programs || [];

  useEffect(() => {
    if (isOpen) {
      setBookmarks(getBookmarks());
    }
  }, [isOpen]);

  // Asynchronously fetch authentic theatrical posters / VHS box arts for displayed tapes
  useEffect(() => {
    if (!isOpen) return;
    const currentList = activeTab === 'bookmarks' ? bookmarks : tapes;
    if (!currentList || currentList.length === 0) return;

    let isMounted = true;
    const loadPosters = async () => {
      for (const prog of currentList) {
        if (!prog || !prog.identifier) continue;
        if (posterMap[prog.identifier]) continue;

        try {
          const poster = await fetchTheatricalPoster(prog.title, prog.year, prog.identifier);
          if (poster && isMounted) {
            setPosterMap((prev) => ({ ...prev, [prog.identifier]: poster }));
          }
        } catch {}
      }
    };

    loadPosters();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, activeChannelId, bookmarks, tapes]);

  const handleRemoveBookmark = (e, id) => {
    e.stopPropagation();
    audio.playSwitch(true);
    const updated = removeBookmark(id);
    setBookmarks(updated);
  };

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

  const handleTapeClick = (prog, idx) => {
    audio.playSwitch(true);
    if (selectedChan) {
      const progIdx = idx !== undefined && idx >= 0 ? idx : selectedChan.programs?.findIndex(
        (p) => p.identifier === prog.identifier || p.videoUrl === prog.videoUrl
      );
      onSelectChannel(selectedChan, progIdx >= 0 ? progIdx : 0);
    }
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

        {/* Mode Selector Tabs: Channel Tape Shelves vs Bookmarked Tapes */}
        <div className="bg-[#12100e] px-4 py-2 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                audio.playKnobClick();
                setActiveTab('channels');
              }}
              className={`px-3 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
                activeTab === 'channels'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>CHANNEL TAPES</span>
            </button>

            <button
              onClick={() => {
                audio.playKnobClick();
                setActiveTab('bookmarks');
                setBookmarks(getBookmarks());
              }}
              className={`px-3 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
                activeTab === 'bookmarks'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>MY BOOKMARKS ({bookmarks.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-zinc-700">
              <button
                onClick={() => {
                  audio.playKnobClick();
                  setViewMode('boxart');
                }}
                className={`px-2.5 py-1 rounded-md font-pixel text-[11px] flex items-center gap-1 cursor-pointer transition ${
                  viewMode === 'boxart'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="View as VHS Box Art / Movie Posters"
              >
                <ImageIcon className="w-3 h-3" />
                <span>BOX ART</span>
              </button>
              <button
                onClick={() => {
                  audio.playKnobClick();
                  setViewMode('cassette');
                }}
                className={`px-2.5 py-1 rounded-md font-pixel text-[11px] flex items-center gap-1 cursor-pointer transition ${
                  viewMode === 'cassette'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="View as Physical VHS Cassette Tapes"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>CASSETTES</span>
              </button>
            </div>
            <div className="font-mono text-zinc-500 text-[11px] hidden md:block">
              {activeTab === 'bookmarks' ? `${bookmarks.length} TAPES SAVED` : 'SELECT TAPE'}
            </div>
          </div>
        </div>

        {/* Channel Tape Shelves Sub-Tabs (only when activeTab === 'channels') */}
        {activeTab === 'channels' && (
          <div className="bg-[#100e0d] px-4 py-2 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto retro-scroll">
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
        )}

        {/* Cassette Tapes Grid */}
        <div className="flex-1 overflow-y-auto p-5 retro-scroll bg-[#151311]">
          {activeTab === 'bookmarks' && bookmarks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <Bookmark className="w-12 h-12 mb-3 text-zinc-600 stroke-1" />
              <div className="font-pixel text-amber-400 text-base mb-1">NO BOOKMARKED TAPES YET</div>
              <p className="font-mono text-xs max-w-md text-zinc-400">
                Click the bookmark ribbon button on the VCR control deck (or the star in the Search Explorer)
                while watching any video to save it to your personal tape collection!
              </p>
            </div>
          ) : viewMode === 'boxart' ? (
            /* Authentic VHS Box Art / Movie Poster Slipcovers Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {(activeTab === 'bookmarks' ? bookmarks : tapes).map((prog, idx) => (
                <div
                  key={prog.identifier || idx}
                  onClick={() => {
                    if (activeTab === 'bookmarks') {
                      audio.playSwitch(true);
                      if (onPlayDirectItem) {
                        onPlayDirectItem(prog);
                      } else {
                        onCustomTapePlay(prog.identifier);
                      }
                      onClose();
                    } else {
                      handleTapeClick(prog, idx);
                    }
                  }}
                  className="group relative bg-[#181614] border-2 border-[#45372b] hover:border-amber-400 rounded-xl vhs-box-shadow hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden select-none"
                >
                  {/* VHS Worn Cardboard Spine Effect (Left Edge) */}
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 vhs-spine z-20 pointer-events-none border-r border-black/40" />

                  {/* Top Vintage Video Studio Header Banner */}
                  <div className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 px-2 py-1 flex items-center justify-between border-b border-black/60 z-10">
                    <span className="font-pixel text-[9px] text-amber-300 font-bold tracking-widest truncate">
                      ★ ARCHIVE VIDEO
                    </span>
                    <span className="font-mono text-[9px] text-red-300 px-1 bg-black/60 rounded">
                      VHS
                    </span>
                  </div>

                  {/* Vertical Poster Box Art Artwork */}
                  <div className="relative aspect-[2/3] w-full bg-[#0a0806] overflow-hidden flex items-center justify-center">
                    <img
                      src={
                        posterMap[prog.identifier] ||
                        prog.thumbnailUrl ||
                        `https://archive.org/services/img/${prog.identifier}`
                      }
                      alt={prog.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // If poster fails, fallback to archive thumbnail
                        if (e.target.src !== prog.thumbnailUrl && prog.thumbnailUrl) {
                          e.target.src = prog.thumbnailUrl;
                        } else {
                          e.target.style.display = 'none';
                        }
                      }}
                    />

                    {/* Plastic Slipcover Light Sheen */}
                    <div className="absolute inset-0 vhs-box-sheen" />

                    {/* Age / Cardboard Wear Texture */}
                    <div className="absolute inset-0 vhs-cardboard-wear pointer-events-none" />

                    {/* Bottom Vignette for Title legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                    {/* Title overlay at the bottom of the box */}
                    <div className="absolute bottom-2 left-3 right-2 z-10">
                      <div className="font-pixel text-xs font-bold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,1)] line-clamp-2">
                        {prog.title}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-amber-300/90">
                        <span>{prog.year || 'VINTAGE'}</span>
                        {prog.duration ? <span>{Math.round(prog.duration / 60)}M</span> : <span>HI-FI</span>}
                      </div>
                    </div>

                    {/* Bookmark Badge or Remove Button */}
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                      {activeTab === 'bookmarks' && (
                        <button
                          onClick={(e) => handleRemoveBookmark(e, prog.identifier)}
                          className="p-1 rounded-full bg-black/80 hover:bg-red-900 text-red-400 border border-red-800/80 cursor-pointer shadow"
                          title="Remove from bookmarks"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Spine & Play Bar */}
                  <div className="bg-[#12100e] p-2 border-t border-zinc-800 flex items-center justify-between gap-1 z-10">
                    <span className="font-pixel text-[9px] text-zinc-400 truncate">
                      {activeTab === 'bookmarks' ? 'SAVED TAPE' : `CH ${selectedChan?.number || '02'}`}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-black font-pixel text-[9px] font-bold transition flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      PLAY
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Physical VHS Cassette Tape Cartridge View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === 'bookmarks' ? bookmarks : tapes).map((prog, idx) => (
                <div
                  key={prog.identifier || idx}
                  onClick={() => {
                    if (activeTab === 'bookmarks') {
                      audio.playSwitch(true);
                      if (onPlayDirectItem) {
                        onPlayDirectItem(prog);
                      } else {
                        onCustomTapePlay(prog.identifier);
                      }
                      onClose();
                    } else {
                      handleTapeClick(prog, idx);
                    }
                  }}
                  className="group relative bg-[#0d0c0a] border-2 border-zinc-700 hover:border-amber-400 rounded-xl p-3 shadow-lg hover:shadow-amber-500/20 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                      <span className="font-pixel text-[10px] text-amber-500 flex items-center gap-1">
                        {activeTab === 'bookmarks' && <Bookmark className="w-3 h-3 fill-current text-amber-400" />}
                        {activeTab === 'bookmarks' ? `SAVED TAPE #${String(idx + 1).padStart(2, '0')}` : `TAPE #${String(idx + 1).padStart(2, '0')}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {prog.duration ? (
                          <span className="text-[10px] font-mono text-zinc-400">
                            {Math.round(prog.duration / 60)} MINS
                          </span>
                        ) : null}
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
                        {activeTab === 'bookmarks' && (
                          <button
                            onClick={(e) => handleRemoveBookmark(e, prog.identifier)}
                            className="p-1 rounded bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/60 cursor-pointer"
                            title="Remove from Bookmarks"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-zinc-800 mb-2.5">
                      <img
                        src={prog.thumbnailUrl || `https://archive.org/services/img/${prog.identifier}`}
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

                    {prog.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                        {prog.description}
                      </p>
                    )}
                  </div>

                  <button className="mt-3 w-full py-1.5 bg-zinc-800 group-hover:bg-amber-500 group-hover:text-black text-zinc-300 font-pixel text-xs font-bold rounded flex items-center justify-center gap-1.5 transition">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>INSERT & PLAY TAPE</span>
                  </button>
                </div>
              ))}
            </div>
          )}
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
