import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Plus,
  Trash2,
  Tv,
  Play,
  ArrowUp,
  ArrowDown,
  Check,
  Copy,
  Layers,
  Sparkles,
  Search,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import {
  getCustomChannels,
  saveCustomChannel,
  addProgramToChannel,
  removeProgramFromChannel,
  reorderProgramsInChannel,
  deleteCustomChannel,
  resolvePlayableItem,
  getChannelLineup,
  searchArchive,
} from '../services/archiveApi';
import { audio } from '../services/soundEffects';

export default function ChannelCustomizerModal({
  isOpen,
  onClose,
  onChannelsUpdated,
  onTuneChannel,
  initialDroppedUrl = '',
}) {
  const [activeTab, setActiveTab] = useState(initialDroppedUrl ? 'drop' : 'lineup');
  const [customChannels, setCustomChannels] = useState([]);
  const [allChannels, setAllChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  // New Channel Form state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCallsign, setNewChannelCallsign] = useState('');
  const [newChannelBadge, setNewChannelBadge] = useState('CUSTOM');
  const [newChannelColor, setNewChannelColor] = useState('#d97706');

  // URL Drop state
  const [urlInput, setUrlInput] = useState(initialDroppedUrl || '');
  const [inspecting, setInspecting] = useState(false);
  const [inspectedItem, setInspectedItem] = useState(null);
  const [inspectError, setInspectError] = useState(null);
  const [targetChannelId, setTargetChannelId] = useState('');
  const [addAllEpisodes, setAddAllEpisodes] = useState(true);
  const [dropSuccessMessage, setDropSuccessMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchCollection, setSearchCollection] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [addedItemsMap, setAddedItemsMap] = useState({});

  const searchCollectionsList = [
    { id: '', name: 'All Collections' },
    { id: 'classic_tv', name: 'Classic Television' },
    { id: 'animationandcartoons', name: 'Saturday Cartoons' },
    { id: 'SciFi_Horror', name: 'Sci-Fi & Horror' },
    { id: 'vhsvault', name: 'VHS Vault' },
    { id: 'feature_films', name: 'Feature Films' },
    { id: 'Film_Noir', name: 'Film Noir & Crime' },
    { id: 'classic_tv_commercials', name: 'Retro Commercials' },
    { id: 'computerchronicles', name: 'Computer Chronicles' },
    { id: 'prelinger', name: 'Prelinger Archives' },
    { id: 'silent_films', name: 'Silent Masterpieces' },
    { id: 'universal_newsreels', name: 'Universal Newsreels' },
  ];

  const searchPresets = [
    'The Lone Ranger',
    'Saturday Cartoons',
    'The Twilight Zone',
    'Classic Sci-Fi',
    '1980s Commercials',
    'Drive-In Horror',
    'Film Noir',
    'Computer Chronicles',
    'Three Stooges',
  ];

  // Badge Options
  const badgePresets = [
    'CUSTOM',
    'CLASSIC TV',
    'WESTERN',
    'CARTOONS',
    'SCI-FI',
    'HORROR',
    'FILM NOIR',
    'COMEDY',
    'COMMERCIALS',
    'RETRO TECH',
    'DOCUMENTARY',
    'ANIME',
  ];

  const colorPresets = [
    '#d97706', // amber/wood
    '#3b82f6', // blue
    '#10b981', // emerald
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#ef4444', // red
    '#06b6d4', // cyan
    '#eab308', // yellow
  ];

  const reloadLineup = () => {
    const customs = getCustomChannels();
    const full = getChannelLineup();
    setCustomChannels(customs);
    setAllChannels(full);
    if (!selectedChannelId && customs.length > 0) {
      setSelectedChannelId(customs[0].id);
    }
    if (!targetChannelId && customs.length > 0) {
      setTargetChannelId(customs[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadLineup();
      if (initialDroppedUrl) {
        setUrlInput(initialDroppedUrl);
        setActiveTab('drop');
        handleInspect(initialDroppedUrl);
      }
    }
  }, [isOpen, initialDroppedUrl]);

  const handleInspect = async (inputToInspect = null) => {
    const target = inputToInspect !== null ? inputToInspect : urlInput;
    if (!target.trim()) return;

    setInspecting(true);
    setInspectError(null);
    setInspectedItem(null);
    setDropSuccessMessage(null);

    try {
      const resolved = await resolvePlayableItem(target.trim());
      setInspectedItem(resolved);
      audio.playSwitch(true);
    } catch (err) {
      setInspectError(err.message || 'Could not resolve playable media from this Archive identifier or URL.');
    } finally {
      setInspecting(false);
    }
  };

  const handleSearchArchive = async (q = searchQuery, coll = searchCollection) => {
    const term = (q !== undefined ? q : searchQuery).trim();
    if (!term && !coll) return;

    audio.playSwitch(true);
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await searchArchive(term, { collection: coll, rows: 24 });
      setSearchResults(res.items || []);
      if ((res.items || []).length === 0) {
        setSearchError('No archive broadcasts found matching this search.');
      }
    } catch (err) {
      setSearchError(err.message || 'Error searching the Internet Archive.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddSearchResultToChannel = async (item, targetChanId = targetChannelId) => {
    audio.playKnobClick();
    setAddingId(item.identifier);
    try {
      const resolved = await resolvePlayableItem(item.identifier);
      if (!resolved) {
        throw new Error('Unable to resolve playable video streams.');
      }

      let programsToAdd = [];
      if (resolved.availableFiles && resolved.availableFiles.length > 1) {
        programsToAdd = resolved.availableFiles.map((file, idx) => ({
          identifier: resolved.identifier,
          title: `${resolved.title}: ${file.displayName}`,
          seriesTitle: resolved.title,
          year: resolved.year || 'Vintage',
          description: `Episode ${idx + 1}: ${file.displayName}. ${resolved.description || ''}`,
          videoFile: file.name,
          videoUrl: file.videoUrl,
          embedUrl: resolved.embedUrl,
          thumbnailUrl: resolved.thumbnailUrl,
          duration: file.duration || resolved.duration || 1800,
          size: file.size || 0,
          availableFiles: resolved.availableFiles,
        }));
      } else {
        programsToAdd = [resolved];
      }

      let chanName = '';
      if (targetChanId === 'NEW_CHANNEL' || customChannels.length === 0) {
        const nextList = saveCustomChannel({
          name: resolved.title.slice(0, 24).toUpperCase(),
          callsign: `K-${resolved.identifier.slice(0, 4).toUpperCase()}`,
          badge: 'CUSTOM',
          description: resolved.description || 'Curated broadcast channel from Archive.org.',
          programs: programsToAdd,
        });
        setCustomChannels(nextList);
        const createdChan = nextList[nextList.length - 1];
        if (createdChan) {
          setTargetChannelId(createdChan.id);
          setSelectedChannelId(createdChan.id);
          chanName = `CH ${createdChan.number} (${createdChan.name})`;
        }
      } else {
        const nextList = addProgramToChannel(targetChanId, programsToAdd);
        setCustomChannels(nextList);
        const chan = nextList.find((c) => c.id === targetChanId);
        chanName = chan ? `CH ${chan.number}` : 'Channel';
      }

      setAllChannels(getChannelLineup());
      if (onChannelsUpdated) onChannelsUpdated();

      setAddedItemsMap((prev) => ({
        ...prev,
        [item.identifier]: `${programsToAdd.length} show${programsToAdd.length > 1 ? 's' : ''}`,
      }));

      setDropSuccessMessage(
        `✓ Added ${programsToAdd.length} broadcast item${programsToAdd.length > 1 ? 's' : ''} to ${chanName}!`
      );
      setTimeout(() => setDropSuccessMessage(null), 3500);
    } catch (err) {
      alert(`Could not add item: ${err.message || 'Stream not found'}`);
    } finally {
      setAddingId(null);
    }
  };

  const handleInspectSearchResult = (item) => {
    setUrlInput(item.identifier);
    setActiveTab('drop');
    handleInspect(item.identifier);
  };

  const handleCreateChannel = (e) => {
    e?.preventDefault();
    if (!newChannelName.trim()) return;

    audio.playSwitch(true);
    const created = saveCustomChannel({
      name: newChannelName.trim().toUpperCase(),
      callsign: newChannelCallsign.trim().toUpperCase() || `K-CUS`,
      badge: newChannelBadge,
      themeColor: newChannelColor,
      description: `User curated channel from the Internet Archive.`,
      programs: [],
    });

    setCustomChannels(created);
    setAllChannels(getChannelLineup());
    setIsCreatingNew(false);
    setNewChannelName('');
    setNewChannelCallsign('');
    if (onChannelsUpdated) onChannelsUpdated();
  };

  const handleDropIntoChannel = () => {
    if (!inspectedItem) return;

    audio.playKnobClick();
    let programsToAdd = [];

    if (addAllEpisodes && inspectedItem.availableFiles && inspectedItem.availableFiles.length > 1) {
      // Add each file as an episode program
      programsToAdd = inspectedItem.availableFiles.map((file, idx) => ({
        identifier: inspectedItem.identifier,
        title: `${inspectedItem.title}: ${file.displayName}`,
        seriesTitle: inspectedItem.title,
        year: inspectedItem.year || 'Vintage',
        description: `Episode ${idx + 1}: ${file.displayName}. ${inspectedItem.description || ''}`,
        videoFile: file.name,
        videoUrl: file.videoUrl,
        embedUrl: inspectedItem.embedUrl,
        thumbnailUrl: inspectedItem.thumbnailUrl,
        duration: file.duration || inspectedItem.duration || 1800,
        size: file.size || 0,
        availableFiles: inspectedItem.availableFiles,
      }));
    } else {
      programsToAdd = [inspectedItem];
    }

    if (targetChannelId === 'NEW_CHANNEL' || customChannels.length === 0) {
      // Create new channel with this program
      const nextList = saveCustomChannel({
        name: inspectedItem.title.slice(0, 24).toUpperCase(),
        callsign: `K-${inspectedItem.identifier.slice(0, 4).toUpperCase()}`,
        badge: 'CUSTOM',
        description: inspectedItem.description,
        programs: programsToAdd,
      });
      setCustomChannels(nextList);
    } else {
      // Add to existing custom channel
      const nextList = addProgramToChannel(targetChannelId, programsToAdd);
      setCustomChannels(nextList);
    }

    setAllChannels(getChannelLineup());
    if (onChannelsUpdated) onChannelsUpdated();

    setDropSuccessMessage(
      `Added ${programsToAdd.length} broadcast item${programsToAdd.length > 1 ? 's' : ''} to channel dial!`
    );
    setTimeout(() => {
      setDropSuccessMessage(null);
      setUrlInput('');
      setInspectedItem(null);
    }, 2800);
  };

  const handleDeleteChannel = (channelId) => {
    if (confirm('Delete this custom channel from your TV dial?')) {
      audio.playSwitch(false);
      const remaining = deleteCustomChannel(channelId);
      setCustomChannels(remaining);
      setAllChannels(getChannelLineup());
      if (selectedChannelId === channelId) {
        setSelectedChannelId(remaining[0]?.id || null);
      }
      if (onChannelsUpdated) onChannelsUpdated();
    }
  };

  const handleRemoveProgram = (channelId, progIdx) => {
    audio.playSwitch(false);
    const updated = removeProgramFromChannel(channelId, progIdx);
    setCustomChannels(updated);
    setAllChannels(getChannelLineup());
    if (onChannelsUpdated) onChannelsUpdated();
  };

  const handleMoveProgram = (channelId, fromIdx, toIdx) => {
    audio.playKnobClick();
    const updated = reorderProgramsInChannel(channelId, fromIdx, toIdx);
    setCustomChannels(updated);
    setAllChannels(getChannelLineup());
    if (onChannelsUpdated) onChannelsUpdated();
  };

  const handleCopyUrl = async (id) => {
    const url = `https://archive.org/details/${id}`;
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
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedCustomChannel = customChannels.find((c) => c.id === selectedChannelId) || customChannels[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#121117] border-4 border-teal-600/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Top Studio Header */}
        <div className="bg-gradient-to-r from-teal-950 via-[#152a28] to-teal-950 p-3 md:p-4 border-b-2 border-teal-600/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400 flex items-center justify-center shadow-inner">
              <Radio className="w-6 h-6 text-teal-300 animate-pulse" />
            </div>
            <div>
              <div className="font-pixel text-teal-300 text-lg md:text-xl font-bold">
                ANALOG BROADCAST STUDIO • CHANNEL CUSTOMIZER
              </div>
              <div className="font-mono text-teal-100/70 text-xs hidden sm:block">
                CREATE CUSTOM CHANNELS, DROP ARCHIVE.ORG URLS & ARRANGE BROADCAST SCHEDULES
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
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#181622] px-4 py-2 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto retro-scroll">
          <button
            onClick={() => setActiveTab('lineup')}
            className={`px-3.5 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'lineup'
                ? 'bg-teal-500 text-black font-bold shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>CHANNEL LINEUP ({allChannels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`px-3.5 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'search'
                ? 'bg-teal-500 text-black font-bold shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>SEARCH ARCHIVE & ADD SHOWS</span>
          </button>

          <button
            onClick={() => setActiveTab('drop')}
            className={`px-3.5 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'drop'
                ? 'bg-teal-500 text-black font-bold shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>DROP ARCHIVE URL / TAPE</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'editor'
                ? 'bg-teal-500 text-black font-bold shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SCHEDULE & PROGRAM EDITOR</span>
          </button>
        </div>

        {/* TAB 1: Channel Lineup & Manager */}
        {activeTab === 'lineup' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 retro-scroll bg-[#0e0d14] space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-pixel text-teal-400 text-lg font-bold">
                  TELEVISION CHANNEL LINEUP
                </h3>
                <p className="font-mono text-xs text-zinc-400">
                  YOUR VHF/UHF DIAL STATIONS ({allChannels.length} TOTAL • {customChannels.length} CUSTOM)
                </p>
              </div>

              <button
                onClick={() => setIsCreatingNew((v) => !v)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-pixel text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ CREATE NEW CHANNEL</span>
              </button>
            </div>

            {/* Create Channel Inline Form */}
            {isCreatingNew && (
              <form
                onSubmit={handleCreateChannel}
                className="bg-[#181622] border-2 border-teal-500/70 rounded-2xl p-4 space-y-4 shadow-xl animate-in fade-in"
              >
                <div className="font-pixel text-teal-300 text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>NEW STATION CONFIGURATION</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-pixel text-zinc-400 mb-1">
                      CHANNEL NAME
                    </label>
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="e.g. GODZILLA MARATHON"
                      className="w-full bg-black/70 border border-zinc-700 focus:border-teal-400 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-pixel text-zinc-400 mb-1">
                      CALLSIGN
                    </label>
                    <input
                      type="text"
                      value={newChannelCallsign}
                      onChange={(e) => setNewChannelCallsign(e.target.value)}
                      placeholder="e.g. K-KAIJU"
                      className="w-full bg-black/70 border border-zinc-700 focus:border-teal-400 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-pixel text-zinc-400 mb-1">
                      CATEGORY BADGE
                    </label>
                    <select
                      value={newChannelBadge}
                      onChange={(e) => setNewChannelBadge(e.target.value)}
                      className="w-full bg-black/70 border border-zinc-700 focus:border-teal-400 rounded-lg px-3 py-2 text-sm text-teal-300 font-pixel cursor-pointer"
                    >
                      {badgePresets.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-pixel text-zinc-400">THEME COLOR:</span>
                    <div className="flex items-center gap-1.5">
                      {colorPresets.map((color) => (
                        <button
                          type="button"
                          key={color}
                          onClick={() => setNewChannelColor(color)}
                          className={`w-6 h-6 rounded-full cursor-pointer transition border-2 ${
                            newChannelColor === color ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-pixel text-xs cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-pixel text-xs font-bold cursor-pointer"
                    >
                      SAVE STATION
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allChannels.map((ch) => {
                const isCustom = ch.isCustom;
                const progCount = ch.programs?.length || 0;

                return (
                  <div
                    key={ch.id || ch.number}
                    className={`rounded-2xl p-4 border-2 transition-all flex flex-col justify-between ${
                      isCustom
                        ? 'bg-[#181622] border-teal-600/70 hover:border-teal-400 shadow-md'
                        : 'bg-[#14131a] border-zinc-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-10 h-9 rounded-lg bg-black/80 border border-zinc-700 font-pixel text-amber-400 font-bold text-lg flex items-center justify-center">
                            {ch.number}
                          </span>
                          <div>
                            <h4 className="font-bold text-white text-sm md:text-base line-clamp-1">
                              {ch.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                              <span className="text-teal-400 font-bold">{ch.callsign}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-pixel">
                                {ch.badge}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isCustom ? (
                          <span className="px-2 py-0.5 rounded bg-teal-950 border border-teal-500 text-teal-300 font-pixel text-[10px]">
                            CUSTOM
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-pixel text-[10px]">
                            STANDARD
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 my-2 leading-relaxed">
                        {ch.description}
                      </p>

                      <div className="text-[11px] font-mono text-zinc-400 bg-black/50 p-2 rounded-lg border border-zinc-800/80 mb-3 flex items-center justify-between">
                        <span>{progCount} SCHEDULED BROADCAST{progCount !== 1 ? 'S' : ''}</span>
                        {progCount > 0 && ch.programs[0]?.title && (
                          <span className="text-zinc-500 truncate max-w-[180px]">
                            NOW: {ch.programs[0].title}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                      <button
                        onClick={() => {
                          audio.playKnobClick();
                          if (onTuneChannel) onTuneChannel(ch);
                          onClose();
                        }}
                        className="py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-black font-pixel text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>TUNE IN</span>
                      </button>

                      {isCustom && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setTargetChannelId(ch.id);
                              setActiveTab('search');
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-700 font-pixel text-xs flex items-center gap-1 cursor-pointer transition active:scale-95"
                            title="Search Archive to add shows to this channel"
                          >
                            <Search className="w-3 h-3" />
                            <span>+ SEARCH</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedChannelId(ch.id);
                              setActiveTab('editor');
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-pixel text-xs cursor-pointer"
                          >
                            EDIT ({progCount})
                          </button>

                          <button
                            onClick={() => handleDeleteChannel(ch.id)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-white border border-zinc-700 cursor-pointer transition"
                            title="Delete custom channel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Search Internet Archive & Add Directly */}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 retro-scroll bg-[#0e0d14] space-y-5">
            {/* Header & Target Channel Selector */}
            <div className="bg-[#181622] p-4 rounded-2xl border-2 border-zinc-800 space-y-4 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                <div>
                  <h3 className="font-pixel text-teal-400 text-lg md:text-xl font-bold flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    <span>SEARCH ARCHIVE & ADD SHOWS DIRECTLY</span>
                  </h3>
                  <p className="font-mono text-xs text-zinc-400 mt-0.5">
                    SEARCH MILLIONS OF ARCHIVE.ORG BROADCASTS AND ADD THEM TO ANY CHANNEL WITH ONE CLICK
                  </p>
                </div>

                {/* Target Channel Selector */}
                <div className="flex items-center gap-2 bg-black/60 p-2 rounded-xl border border-teal-500/50">
                  <span className="font-pixel text-[11px] text-teal-300 whitespace-nowrap">
                    TARGET DIAL:
                  </span>
                  <select
                    value={targetChannelId || 'NEW_CHANNEL'}
                    onChange={(e) => setTargetChannelId(e.target.value)}
                    className="bg-[#14121a] text-amber-400 font-pixel text-xs rounded-lg px-2.5 py-1.5 border border-zinc-700 focus:outline-none focus:border-teal-400 cursor-pointer"
                  >
                    <option value="NEW_CHANNEL">+ CREATE NEW CHANNEL</option>
                    {customChannels.map((c) => (
                      <option key={c.id} value={c.id}>
                        CH {c.number}: {c.name} ({c.programs?.length || 0} shows)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchArchive();
                }}
                className="flex flex-col sm:flex-row items-center gap-2"
              >
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search shows, cartoons, films, or series (e.g. Lone Ranger, Popeye)..."
                    className="w-full bg-black/70 border border-zinc-700 focus:border-teal-400 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono placeholder-zinc-500"
                  />
                </div>

                <select
                  value={searchCollection}
                  onChange={(e) => {
                    setSearchCollection(e.target.value);
                    handleSearchArchive(searchQuery, e.target.value);
                  }}
                  className="w-full sm:w-auto bg-black/70 border border-zinc-700 focus:border-teal-400 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono cursor-pointer"
                >
                  {searchCollectionsList.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={searchLoading}
                  className="w-full sm:w-auto px-5 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-zinc-800 text-black disabled:text-zinc-500 font-pixel text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow transition active:scale-95"
                >
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{searchLoading ? 'SEARCHING...' : 'SEARCH'}</span>
                </button>
              </form>

              {/* Quick Preset Signals */}
              <div className="flex items-center gap-1.5 overflow-x-auto retro-scroll pb-1">
                <span className="text-[10px] font-pixel text-zinc-500 shrink-0">SIGNALS:</span>
                {searchPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSearchQuery(preset);
                      handleSearchArchive(preset, searchCollection);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-teal-950 text-zinc-300 hover:text-teal-300 border border-zinc-700/80 hover:border-teal-500 text-[11px] font-mono whitespace-nowrap cursor-pointer transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop Success Message Banner */}
            {dropSuccessMessage && (
              <div className="bg-emerald-950/90 border-2 border-emerald-500 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between font-pixel text-xs shadow-lg animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{dropSuccessMessage}</span>
                </div>
                <button
                  onClick={() => setActiveTab('editor')}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg cursor-pointer transition"
                >
                  VIEW SCHEDULE →
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {searchLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
                <Radio className="w-10 h-10 text-teal-400 animate-spin" />
                <div className="font-pixel text-xs text-teal-300 animate-pulse">
                  SEARCHING INTERNET ARCHIVE DATABASE...
                </div>
              </div>
            )}

            {/* Empty or Error State */}
            {searchError && !searchLoading && (
              <div className="text-center py-12 text-zinc-500 font-pixel text-xs">
                {searchError}
              </div>
            )}

            {/* Results Grid */}
            {!searchLoading && searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((item) => {
                  const isAdding = addingId === item.identifier;
                  const addedNote = addedItemsMap[item.identifier];

                  return (
                    <div
                      key={item.identifier}
                      className="bg-[#14121c] border border-zinc-800 hover:border-teal-500/70 rounded-xl p-3 flex flex-col justify-between shadow-md transition-all group"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-zinc-800 mb-2.5">
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 border border-zinc-700">
                            {item.year || 'Vintage'}
                          </div>
                        </div>

                        {/* Info */}
                        <h4 className="font-pixel text-sm font-bold text-white group-hover:text-teal-300 line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-[11px] font-mono text-zinc-400 line-clamp-2 mt-1">
                          {item.description || 'Archive.org broadcast media item.'}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleInspectSearchResult(item)}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg font-pixel text-[10px] cursor-pointer transition"
                          title="Inspect episodes and details"
                        >
                          EPISODES
                        </button>

                        <button
                          onClick={() => handleAddSearchResultToChannel(item)}
                          disabled={isAdding}
                          className={`flex-1 py-1.5 px-3 rounded-lg font-pixel text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow transition active:scale-95 ${
                            addedNote
                              ? 'bg-emerald-600 text-white'
                              : 'bg-teal-500 hover:bg-teal-400 text-black'
                          }`}
                        >
                          {isAdding ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>ADDING...</span>
                            </>
                          ) : addedNote ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>ADDED ({addedNote})</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ ADD TO CHANNEL</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Drop Archive.org URL / Identifier */}
        {activeTab === 'drop' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 retro-scroll bg-[#0e0d14] space-y-6">
            <div>
              <h3 className="font-pixel text-teal-400 text-xl font-bold">
                DROP ANY ARCHIVE.ORG BROADCAST
              </h3>
              <p className="font-mono text-xs text-zinc-400 mt-1">
                PASTE ANY VIDEO URL OR IDENTIFIER FROM ARCHIVE.ORG TO ADD IT DIRECTLY TO A CHANNEL
              </p>
            </div>

            {/* URL Input Form */}
            <div className="bg-[#181622] p-4 rounded-2xl border-2 border-zinc-800 space-y-3">
              <label className="block font-pixel text-xs text-zinc-300">
                ENTER ARCHIVE.ORG URL OR IDENTIFIER:
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
                  placeholder="e.g. archive.org/details/theloneranger_201705 or night_of_the_living_dead"
                  className="w-full bg-black/80 border-2 border-zinc-700 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-zinc-500 focus:outline-none"
                />
                <button
                  onClick={() => handleInspect()}
                  disabled={inspecting || !urlInput.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-black font-pixel text-xs font-bold rounded-xl cursor-pointer shadow transition active:scale-95 whitespace-nowrap"
                >
                  {inspecting ? 'INSPECTING...' : 'INSPECT SIGNAL'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                <span className="font-pixel text-[10px] text-zinc-500">FORMATS SUPPORTED:</span>
                <span>archive.org/details/..., /embed/..., /download/..., or raw identifier</span>
              </div>
            </div>

            {/* Error state */}
            {inspectError && (
              <div className="p-4 bg-red-950/60 border-2 border-red-600/70 rounded-xl text-red-200 text-xs font-mono">
                {inspectError}
              </div>
            )}

            {/* Success message */}
            {dropSuccessMessage && (
              <div className="p-4 bg-teal-950/80 border-2 border-teal-500 rounded-xl text-teal-200 text-xs font-pixel flex items-center gap-2 animate-bounce">
                <Check className="w-5 h-5 text-teal-400" />
                <span>{dropSuccessMessage}</span>
              </div>
            )}

            {/* Live Preview Card */}
            {inspectedItem && (
              <div className="bg-[#1b1827] border-2 border-teal-500 rounded-2xl p-4 md:p-5 shadow-2xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping" />
                    <span className="font-pixel text-teal-300 text-sm font-bold">
                      VERIFIED ARCHIVE SIGNAL DETECTED
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyUrl(inspectedItem.identifier)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 border border-zinc-700 flex items-center gap-1.5 font-pixel text-xs cursor-pointer"
                    title="Copy Archive URL"
                  >
                    {copiedId === inspectedItem.identifier ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">COPIED URL</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY URL</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="relative w-full md:w-64 aspect-video rounded-xl overflow-hidden bg-black border border-zinc-700 shrink-0">
                    <img
                      src={inspectedItem.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 border border-zinc-700">
                      {Math.round(inspectedItem.duration / 60)} MINS
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="font-pixel text-xs text-amber-400">
                      YEAR: {inspectedItem.year || 'Vintage'} • CREATOR: {inspectedItem.creator}
                    </div>
                    <h4 className="font-bold text-white text-base md:text-lg">
                      {inspectedItem.title}
                    </h4>
                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {inspectedItem.description}
                    </p>

                    {inspectedItem.availableFiles && inspectedItem.availableFiles.length > 1 && (
                      <div className="pt-2">
                        <span className="bg-blue-950 text-blue-300 border border-blue-600/60 px-2.5 py-1 rounded font-pixel text-[11px]">
                          MULTI-EPISODE SERIES: {inspectedItem.availableFiles.length} EPISODES FOUND
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Channel Selector */}
                <div className="pt-4 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-pixel text-zinc-400 mb-1.5">
                      SELECT TARGET BROADCAST CHANNEL:
                    </label>
                    <select
                      value={targetChannelId}
                      onChange={(e) => setTargetChannelId(e.target.value)}
                      className="w-full bg-black/80 border border-zinc-700 focus:border-teal-400 rounded-xl px-3 py-2 text-sm text-teal-300 font-pixel cursor-pointer"
                    >
                      <option value="NEW_CHANNEL">+ CREATE AS BRAND NEW CHANNEL</option>
                      {customChannels.map((c) => (
                        <option key={c.id} value={c.id}>
                          CH {c.number} • {c.name} ({c.programs?.length || 0} videos)
                        </option>
                      ))}
                    </select>
                  </div>

                  {inspectedItem.availableFiles && inspectedItem.availableFiles.length > 1 && (
                    <div className="flex items-center gap-2 bg-black/50 p-2 rounded-xl border border-zinc-800">
                      <input
                        type="checkbox"
                        id="addAllCheck"
                        checked={addAllEpisodes}
                        onChange={(e) => setAddAllEpisodes(e.target.checked)}
                        className="w-4 h-4 text-teal-500 rounded cursor-pointer"
                      />
                      <label htmlFor="addAllCheck" className="text-xs font-pixel text-zinc-300 cursor-pointer">
                        ADD ALL {inspectedItem.availableFiles.length} EPISODES AS COMPLETE SERIES
                      </label>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleDropIntoChannel}
                    className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-black font-pixel text-xs font-bold rounded-xl cursor-pointer shadow-lg transition active:scale-95 flex items-center gap-2"
                  >
                    <Tv className="w-4 h-4" />
                    <span>DROP INTO CHANNEL DIAL</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Channel Program & Schedule Editor */}
        {activeTab === 'editor' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 retro-scroll bg-[#0e0d14] space-y-5">
            {customChannels.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 font-pixel text-xs space-y-3">
                <Tv className="w-12 h-12 mx-auto text-zinc-700" />
                <div>NO CUSTOM CHANNELS CREATED YET.</div>
                <button
                  onClick={() => setActiveTab('lineup')}
                  className="px-4 py-2 bg-teal-500 text-black font-pixel text-xs font-bold rounded-lg cursor-pointer"
                >
                  CREATE YOUR FIRST CHANNEL
                </button>
              </div>
            ) : (
              <>
                {/* Channel Selector Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-pixel text-[11px] text-zinc-400">EDITING CHANNEL:</span>
                    <select
                      value={selectedChannelId || ''}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      className="bg-[#181622] border-2 border-teal-500/70 text-teal-300 font-pixel text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
                    >
                      {customChannels.map((c) => (
                        <option key={c.id} value={c.id}>
                          CH {c.number} • {c.name} ({c.programs?.length || 0} programs)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTargetChannelId(selectedCustomChannel?.id || '');
                        setActiveTab('search');
                      }}
                      className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-black font-pixel text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow transition active:scale-95"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>SEARCH SHOWS</span>
                    </button>

                    <button
                      onClick={() => {
                        setUrlInput('');
                        setInspectedItem(null);
                        setTargetChannelId(selectedCustomChannel?.id || '');
                        setActiveTab('drop');
                      }}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-teal-300 font-pixel text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ADD BY URL</span>
                    </button>
                  </div>
                </div>

                {/* Programs Sequence List */}
                {selectedCustomChannel && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>SCHEDULED RUN ORDER:</span>
                      <span>
                        {selectedCustomChannel.programs?.length || 0} ITEMS •{' '}
                        {Math.round(
                          (selectedCustomChannel.programs?.reduce((a, b) => a + (b.duration || 1800), 0) || 0) /
                            60
                        )}{' '}
                        TOTAL MINUTES
                      </span>
                    </div>

                    {(!selectedCustomChannel.programs || selectedCustomChannel.programs.length === 0) && (
                      <div className="text-center py-16 bg-[#181622] rounded-2xl border border-zinc-800 text-zinc-500 font-pixel text-xs">
                        THIS CHANNEL HAS NO VIDEOS SCHEDULED YET. CLICK "ADD VIDEO BY URL" ABOVE TO ADD TAPES!
                      </div>
                    )}

                    <div className="space-y-2">
                      {selectedCustomChannel.programs?.map((prog, idx) => (
                        <div
                          key={prog.videoUrl || prog.identifier || idx}
                          className="bg-[#181622] hover:bg-[#201d2e] border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-black/60 border border-zinc-700 font-pixel text-xs text-amber-400 flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="relative w-16 h-10 rounded overflow-hidden bg-black shrink-0 border border-zinc-800">
                              <img
                                src={prog.thumbnailUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-white text-xs md:text-sm truncate">
                                {prog.title}
                              </h5>
                              <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                                <span>{Math.round((prog.duration || 1800) / 60)} MINS</span>
                                <span>•</span>
                                <span>{prog.year || 'Vintage'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCopyUrl(prog.identifier)}
                              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 border border-zinc-700 cursor-pointer"
                              title="Copy Archive URL"
                            >
                              {copiedId === prog.identifier ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveProgram(selectedCustomChannel.id, idx, idx - 1)}
                              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 border border-zinc-700 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              disabled={idx === (selectedCustomChannel.programs.length - 1)}
                              onClick={() => handleMoveProgram(selectedCustomChannel.id, idx, idx + 1)}
                              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 border border-zinc-700 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleRemoveProgram(selectedCustomChannel.id, idx)}
                              className="p-1.5 rounded bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-white border border-zinc-700 cursor-pointer transition"
                              title="Remove from channel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
