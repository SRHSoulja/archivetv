import React, { useState, useEffect, useMemo } from 'react';
import { X, Film, Play, Disc, Copy, Check, Bookmark, Trash2, Star, LayoutGrid, Image as ImageIcon, Info } from 'lucide-react';
import { audio } from '../services/soundEffects';
import {
  getBookmarks,
  removeBookmark,
  getCustomTitle,
  setCustomTitle,
  getCustomYear,
  setCustomYear,
  getTapeOrder,
  setTapeOrder,
  getTapeSort,
  setTapeSort,
} from '../services/archiveApi';
import { fetchTheatricalPoster, getCachedPosterSync } from '../services/posterService';
import ArtOverridePanel from './ArtOverridePanel';

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
  const [infoTape, setInfoTape] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [artTape, setArtTape] = useState(null);
  const [titleVersion, setTitleVersion] = useState(0);
  const [sortMode, setSortMode] = useState(() => getTapeSort());
  const [dragId, setDragId] = useState(null);
  const [orderIds, setOrderIds] = useState(() => getTapeOrder());
  const [yearDraft, setYearDraft] = useState('');
  const [activeChannelId, setActiveChannelId] = useState(currentChannel?.id || channels[0]?.id || 'toons');
  const [customInput, setCustomInput] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [posterMap, setPosterMap] = useState({});

  // When drawer opens or TV channel changes, synchronize active channel and reload bookmarks
  useEffect(() => {
    if (isOpen) {
      setBookmarks(getBookmarks().filter(Boolean));
      if (currentChannel?.id) {
        setActiveChannelId(currentChannel.id);
      }
    }
  }, [isOpen, currentChannel?.id]);

  const selectedChan =
    channels.find(
      (c) => c.id === activeChannelId || String(c.number) === String(activeChannelId)
    ) ||
    currentChannel ||
    channels[0] ||
    null;

  const tapes = (selectedChan?.programs || []).filter(Boolean);

  // Seeded from the identifier so a tape always leans the same way.
  const tiltFor = (id) => {
    let h = 0;
    for (let i = 0; i < (id || '').length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 997;
    return (((h % 7) - 3) * 0.22).toFixed(2);
  };

  const shownName = (p) => (getCustomTitle(p.identifier) || p.title || '').toLowerCase();
  const shownYear = (p) => getCustomYear(p.identifier) || p.year || '';
  const yearOf = (p) => {
    const n = parseInt(shownYear(p), 10);
    return Number.isFinite(n) ? n : null;
  };

  const baseList = (activeTab === 'bookmarks' ? bookmarks : tapes).filter(Boolean);

  const sortedList = useMemo(() => {
    const list = [...baseList];
    if (sortMode === 'az') return list.sort((a, b) => shownName(a).localeCompare(shownName(b)));
    if (sortMode === 'za') return list.sort((a, b) => shownName(b).localeCompare(shownName(a)));
    if (sortMode === 'newest')
      return list.sort((a, b) => (yearOf(b) ?? -Infinity) - (yearOf(a) ?? -Infinity));
    if (sortMode === 'oldest')
      return list.sort((a, b) => (yearOf(a) ?? Infinity) - (yearOf(b) ?? Infinity));
    if (sortMode === 'custom') {
      const at = (p) => {
        const i = orderIds.indexOf(p.identifier);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };
      return list.sort((a, b) => at(a) - at(b));
    }
    return list;
    // titleVersion re-runs this after a rename or year edit changes the keys
  }, [baseList, sortMode, titleVersion, orderIds]);

  // Rearrange as the cursor passes over a neighbour, rather than computing the
  // result on release -- you can see where it will land before letting go.
  const previewMove = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const ids = sortedList.map((p) => p.identifier);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setOrderIds(ids);
  };

  const commitOrder = () => {
    if (dragId) {
      // The stored order is one global list, but only the current tab is on
      // screen. Writing just the visible ids would drop every other channel's
      // arrangement, so splice the new sequence into the positions those items
      // already occupy and leave everything else untouched.
      const visible = sortedList.map((p) => p.identifier);
      const visibleSet = new Set(visible);
      const stored = getTapeOrder();
      const merged = [];
      let vi = 0;
      for (const id of stored) {
        if (visibleSet.has(id)) {
          if (vi < visible.length) merged.push(visible[vi++]);
        } else {
          merged.push(id);
        }
      }
      for (; vi < visible.length; vi += 1) merged.push(visible[vi]);
      setTapeOrder(merged);
    }
    setDragId(null);
  };

  // Asynchronously fetch authentic theatrical posters / VHS box arts for displayed tapes in batches
  useEffect(() => {
    if (!isOpen) return;
    const currentList = (activeTab === 'bookmarks' ? bookmarks : tapes).filter(Boolean);
    if (currentList.length === 0) return;

    let isMounted = true;

    // Filter to items that need a network fetch (not already in memory/curated)
    const unCached = currentList.filter((prog) => {
      if (!prog || !prog.identifier) return false;
      if (posterMap[prog.identifier]) return false;
      if (getCachedPosterSync(prog.title, prog.year, prog.identifier)) return false;
      return true;
    });

    if (unCached.length === 0) return;

    const batchLoad = async () => {
      const updates = {};
      await Promise.all(
        unCached.slice(0, 8).map(async (prog) => {
          try {
            const p = await fetchTheatricalPoster(prog.title, prog.year, prog.identifier);
            if (p) updates[prog.identifier] = p;
          } catch {}
        })
      );

      if (isMounted && Object.keys(updates).length > 0) {
        setPosterMap((prev) => ({ ...prev, ...updates }));
      }
    };

    batchLoad();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, activeChannelId, bookmarks.length, tapes.length]);

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
            <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-lg border border-zinc-700">
              <span className="text-zinc-500 text-[10px] font-pixel">ORDER:</span>
              <select
                value={sortMode}
                onChange={(e) => {
                  audio.playKnobClick();
                  setSortMode(e.target.value);
                  setTapeSort(e.target.value);
                }}
                className="bg-transparent text-amber-300 text-[11px] font-mono focus:outline-none cursor-pointer"
              >
                <option value="default">As listed</option>
                <option value="az">Title A-Z</option>
                <option value="za">Title Z-A</option>
                <option value="newest">Year, newest</option>
                <option value="oldest">Year, oldest</option>
                <option value="custom">Custom (drag)</option>
              </select>
            </div>

            {sortMode === 'custom' && (
              <span className="font-pixel text-[10px] text-amber-400/90">DRAG TO ARRANGE</span>
            )}

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
            <div
              className="vhs-shelf-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {sortedList.map((prog, idx) => {
                if (!prog) return null;
                const posterSrc =
                  posterMap[prog.identifier] ||
                  getCachedPosterSync(prog.title, prog.year, prog.identifier) ||
                  prog.thumbnailUrl ||
                  `https://archive.org/services/img/${prog.identifier}`;

                return (
                  <div
                    key={`shelf_${activeTab}_${selectedChan?.id || 'ch'}_${prog.identifier || 'prog'}_${prog.videoFile || prog.videoUrl || ''}`}
                    className="vhs-shelf-cell"
                    style={{ '--tilt': `${tiltFor(prog.identifier)}deg` }}
                  >
                  <div
                    draggable={sortMode === 'custom'}
                    onDragStart={(e) => {
                      setDragId(prog.identifier);
                      e.dataTransfer.effectAllowed = 'move';
                      try {
                        e.dataTransfer.setData('text/plain', prog.identifier);
                      } catch {}
                    }}
                    onDragEnter={() => {
                      if (sortMode === 'custom') previewMove(prog.identifier);
                    }}
                    onDragOver={(e) => {
                      if (sortMode !== 'custom') return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      commitOrder();
                    }}
                    onDragEnd={commitOrder}
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
                    className={`group relative bg-[#181614] border-2 rounded-xl vhs-box-shadow transition-all duration-200 flex flex-col overflow-hidden select-none ${
                      sortMode === 'custom' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                    } ${
                      dragId === prog.identifier
                        ? 'opacity-40 scale-95 border-amber-400'
                        : 'border-[#45372b] hover:border-amber-400 hover:-translate-y-1'
                    }`}
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
                      {/* Ambient Atmospheric Backdrop for Wide Stills / Non-2:3 Artwork */}
                      <img
                        src={posterSrc}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-40 pointer-events-none"
                      />

                      {/* Main Poster Artwork: object-contain ensures wide cards and banners fit fully without clipping */}
                      <img
                        src={posterSrc}
                        alt={prog.title}
                        className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
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
                      <div className="absolute inset-0 vhs-box-sheen pointer-events-none z-20" />

                      {/* Age / Cardboard Wear Texture */}
                      <div className="absolute inset-0 vhs-cardboard-wear pointer-events-none z-20" />

                      {/* Bottom Vignette for Title legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none z-20" />

                      {/* Title overlay at the bottom of the box */}
                      <div className="absolute bottom-2 left-3 right-2 z-30">
                        <div
                          title={getCustomTitle(prog.identifier) || prog.title}
                          className="font-pixel text-xs font-bold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,1)] line-clamp-2"
                        >
                          {getCustomTitle(prog.identifier) || prog.title}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-amber-300/90">
                          <span>{shownYear(prog) || 'VINTAGE'}</span>
                          {prog.duration ? <span>{Math.round(prog.duration / 60)}M</span> : <span>HI-FI</span>}
                        </div>
                      </div>

                      {/* Bookmark Badge or Remove Button */}
                      <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audio.playKnobClick();
                            setRenameDraft(getCustomTitle(prog.identifier));
                            setYearDraft(getCustomYear(prog.identifier));
                            setInfoTape(prog);
                          }}
                          className="p-1 rounded-full bg-black/80 hover:bg-amber-900 text-amber-300 border border-amber-700/80 cursor-pointer shadow"
                          title="Tape details"
                          aria-label="Tape details"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
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
                  </div>
                );
              })}
            </div>
          ) : (
            /* Physical VHS Cassette Tape Cartridge View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedList.map((prog, idx) => {
                if (!prog) return null;
                return (
                  <div
                    key={`cassette_${activeTab}_${selectedChan?.id || 'ch'}_${prog.identifier || 'prog'}_${prog.videoFile || prog.videoUrl || ''}_${idx}`}
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
                        <div
                          title={getCustomTitle(prog.identifier) || prog.title}
                          className="absolute bottom-2 left-2 right-2 font-pixel text-[11px] text-white font-bold truncate drop-shadow"
                        >
                          {getCustomTitle(prog.identifier) || prog.title}
                        </div>
                      </div>

                      <div className="bg-[#f0ede6] text-[#1c1a17] p-2 rounded border border-zinc-400 font-mono text-xs shadow-inner">
                        <div className="font-bold truncate text-black" title={getCustomTitle(prog.identifier) || prog.title}>
                          {getCustomTitle(prog.identifier) || prog.title}
                        </div>
                        <div className="text-[10px] text-zinc-700 flex justify-between mt-0.5">
                          <span>YEAR: {shownYear(prog) || 'VINTAGE'}</span>
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
                );
              })}
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

      {artTape && (
        <ArtOverridePanel
          identifier={artTape.identifier}
          title={artTape.title}
          year={artTape.year}
          onClose={() => setArtTape(null)}
          onApplied={(url) => {
            setPosterMap((prev) => {
              const next = { ...prev };
              if (url) next[artTape.identifier] = url;
              else delete next[artTape.identifier];
              return next;
            });
          }}
        />
      )}

      {infoTape && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInfoTape(null)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-[#141211] border-2 border-amber-600/70 rounded-2xl p-5 shadow-2xl text-zinc-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 shrink-0 pb-3 border-b border-zinc-800">
              <h3 className="font-pixel text-amber-400 text-sm font-bold tracking-wide leading-snug">
                {getCustomTitle(infoTape.identifier) || infoTape.title}
              </h3>
              <button
                onClick={() => setInfoTape(null)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 shrink-0"
                aria-label="Close tape details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 shrink-0 flex flex-wrap gap-x-4 gap-y-1 font-pixel text-[10px] text-zinc-500">
              <span>YEAR: <span className="text-amber-300">{infoTape.year || 'VINTAGE'}</span></span>
              {infoTape.duration ? (
                <span>RUNTIME: <span className="text-amber-300">{Math.round(infoTape.duration / 60)} MIN</span></span>
              ) : null}
              {infoTape.addedAt ? (
                <span>
                  SAVED: <span className="text-amber-300">{new Date(infoTape.addedAt).toLocaleDateString()}</span>
                </span>
              ) : null}
            </div>

            <p className="mt-2 shrink-0 font-mono text-[10px] text-zinc-500 break-all">
              {infoTape.identifier}
            </p>

            <div className="mt-3 shrink-0">
                <span className="font-pixel text-[10px] text-zinc-500 tracking-wider">YOUR LABEL</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    placeholder={infoTape.title}
                    className="flex-1 min-w-0 bg-black/60 border-2 border-zinc-700 focus:border-amber-500/70 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      audio.playKnobClick();
                      setCustomTitle(infoTape.identifier, renameDraft);
                      setTitleVersion((v) => v + 1);
                    }}
                    className="shrink-0 px-3 rounded font-pixel text-[10px] tracking-wider bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                  >
                    SAVE
                  </button>
                  {getCustomTitle(infoTape.identifier) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTitle(infoTape.identifier, '');
                        setRenameDraft('');
                        setTitleVersion((v) => v + 1);
                      }}
                      className="shrink-0 px-2 rounded font-pixel text-[10px] tracking-wider bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 cursor-pointer"
                    >
                      RESET
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
                  Renames this tape for you only. Box art still resolves from the original title.
                </p>

                <div className="mt-3">
                  <span className="font-pixel text-[10px] text-zinc-500 tracking-wider">YEAR</span>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={yearDraft}
                      onChange={(e) => setYearDraft(e.target.value)}
                      placeholder={infoTape.year || 'VINTAGE'}
                      className="w-28 bg-black/60 border-2 border-zinc-700 focus:border-amber-500/70 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        audio.playKnobClick();
                        setCustomYear(infoTape.identifier, yearDraft);
                        setTitleVersion((v) => v + 1);
                      }}
                      className="px-3 rounded font-pixel text-[10px] tracking-wider bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                    >
                      SAVE
                    </button>
                    {getCustomYear(infoTape.identifier) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomYear(infoTape.identifier, '');
                          setYearDraft('');
                          setTitleVersion((v) => v + 1);
                        }}
                        className="px-2 rounded font-pixel text-[10px] tracking-wider bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 cursor-pointer"
                      >
                        RESET
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
                    Archive.org often records the upload year rather than the broadcast year.
                  </p>
                </div>
              </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto retro-scroll pr-1">
              <p className="text-xs leading-relaxed text-zinc-400 whitespace-pre-line">
                {(infoTape.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
                  'No description recorded for this tape.'}
              </p>
            </div>

            <div className="mt-3 shrink-0 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  audio.playKnobClick();
                  setArtTape(infoTape);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-pixel text-[10px] tracking-wider border-2 bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-200 cursor-pointer transition"
              >
                <ImageIcon className="w-3.5 h-3.5" /> CHANGE BOX ART
              </button>

              <a
                href={`https://archive.org/details/${infoTape.identifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                VIEW ON ARCHIVE.ORG
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
