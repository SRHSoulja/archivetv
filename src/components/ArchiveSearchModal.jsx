import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Radio,
  Play,
  PlusCircle,
  Download,
  AlertCircle,
  Tv,
  Check,
  Calendar,
  Star,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  FolderOpen,
  Copy,
  Sliders,
} from 'lucide-react';
import {
  searchArchive,
  resolvePlayableItem,
  getBookmarks,
  saveBookmark,
  removeBookmark,
  isBookmarked,
  fetchUploader,
} from '../services/archiveApi';
import { audio } from '../services/soundEffects';

function formatRuntime(seconds) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return m > 0 ? `${m}m` : `${s}s`;
}

export default function ArchiveSearchModal({
  isOpen,
  onClose,
  onPlayDirectItem,
  onOpenChannelStudio,
}) {
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [bookmarksList, setBookmarksList] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // Filters
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedDecade, setSelectedDecade] = useState('');
  const [durationCategory, setDurationCategory] = useState('all');
  const [selectedUploader, setSelectedUploader] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [uploaderLookupId, setUploaderLookupId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  // archive.org does not list a length for every item; the LENGTH filter has to
  // hide those, so say how many rather than leaving a silently short page.
  const [hiddenNoLength, setHiddenNoLength] = useState(0);

  // Curated Collections
  const collectionsList = [
    { id: 'classic_tv', name: 'Classic Television', icon: '📺', desc: 'Vintage 50s-70s network TV shows, sitcoms & serials' },
    { id: 'animationandcartoons', name: 'Saturday Cartoons', icon: '🐰', desc: 'Golden Age theatrical shorts, Popeye, Superman & funnies' },
    { id: 'SciFi_Horror', name: 'Sci-Fi & Horror', icon: '🛸', desc: '1950s space expeditions, UFOs, monsters & drive-in shocks' },
    { id: 'vhsvault', name: 'VHS Vault', icon: '📼', desc: 'Nostalgic 80s & 90s home video captures, broadcasts & tapes' },
    { id: 'feature_films', name: 'Feature Films', icon: '🎬', desc: 'Public domain silver screen movies, westerns & dramas' },
    { id: 'Film_Noir', name: 'Film Noir & Crime', icon: '🕵️', desc: 'Shadowy detectives, murder mysteries & suspense classics' },
    { id: 'classic_tv_commercials', name: 'Retro Commercials', icon: '🥣', desc: 'Vintage cereal promos, toy pitches & 60s-90s TV ads' },
    { id: 'computerchronicles', name: 'Computer Chronicles', icon: '💾', desc: 'Silicon Valley history, Commodore, Amiga, Macintosh & early Web' },
    { id: 'prelinger', name: 'Prelinger Archives', icon: '🏫', desc: 'Mid-century educational guidance, social hygiene & school films' },
    { id: 'silent_films', name: 'Silent Masterpieces', icon: '🎞️', desc: 'Early cinema pioneers, Chaplin, Keaton & German Expressionism' },
    { id: 'universal_newsreels', name: 'Universal Newsreels', icon: '📰', desc: 'Authentic cinema news dispatches & Apollo Moon landing history' },
    { id: 'opensource_movies', name: 'Open Community Cinema', icon: '🌍', desc: 'Independent community uploads, documentaries & restorations' },
  ];

  // Decades
  const decadesList = [
    { year: '1920', label: '1920s', desc: 'The Silent Era' },
    { year: '1930', label: '1930s', desc: 'Early Talkies & Golden Age' },
    { year: '1940', label: '1940s', desc: 'Wartime & Noir Origins' },
    { year: '1950', label: '1950s', desc: 'Birth of Sitcoms & Sci-Fi' },
    { year: '1960', label: '1960s', desc: 'Color Television & Space' },
    { year: '1970', label: '1970s', desc: 'Drive-In & Cult Classics' },
    { year: '1980', label: '1980s', desc: 'The VHS & Synth Wave Era' },
    { year: '1990', label: '1990s', desc: 'Cable Television Boom' },
  ];

  // Search Presets
  const quickSignals = [
    'The Twilight Zone',
    'Godzilla',
    'Saturday Morning Cartoons',
    '1980s Commercials',
    'Three Stooges',
    'Sherlock Holmes',
    'Buster Keaton',
    'Computer Chronicles',
    'NASA Apollo',
    'Night of the Living Dead',
    'MST3K',
  ];

  const refreshBookmarks = useCallback(() => {
    setBookmarksList(getBookmarks());
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshBookmarks();
    }
  }, [isOpen, refreshBookmarks]);

  const doSearch = async (newQuery = null, newPage = 1, append = false, overrides = {}) => {
    const q = newQuery !== null ? newQuery : query;
    if (newPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const data = await searchArchive(q, {
        rows: 24,
        page: newPage,
        sort: overrides.sort ?? sortBy,
        collection: overrides.collection ?? selectedCollection,
        decade: overrides.decade ?? selectedDecade,
        durationCategory: overrides.durationCategory ?? durationCategory,
        uploader: overrides.uploader ?? selectedUploader,
        creator: overrides.creator ?? selectedCreator,
      });

      if (append) {
        setResults((prev) => {
          const seen = new Set(prev.map((i) => i.identifier));
          const uniqueIncoming = data.items.filter((i) => !seen.has(i.identifier));
          return [...prev, ...uniqueIncoming];
        });
      } else {
        setResults(data.items);
      }
      setTotalResults(data.total);
      setHiddenNoLength((prev) => (append ? prev + (data.hiddenNoLength || 0) : data.hiddenNoLength || 0));
      setPage(newPage);

      if (data.items.length === 0 && newPage === 1) {
        setError('No archive broadcasts found matching your search. Try different keywords or filters.');
      }
    } catch (err) {
      console.error(err);
      setError('Error reaching Internet Archive servers. Please try again.');
      // Otherwise the previous search's results stay on screen under the error,
      // reading as if they answered the query that just failed.
      if (!append) {
        setResults([]);
        setTotalResults(0);
        setHiddenNoLength(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    doSearch(query, 1, false);
  };

  const handlePresetClick = (preset) => {
    setQuery(preset);
    setSelectedCollection('');
    setSelectedDecade('');
    setActiveTab('search');
    doSearch(preset, 1, false, { collection: '', decade: '' });
  };

  const handleCollectionSelect = (collId) => {
    setSelectedCollection(collId);
    setActiveTab('search');
    doSearch(query, 1, false, { collection: collId });
  };

  const handleDecadeSelect = (dec) => {
    setSelectedDecade(dec);
    setActiveTab('search');
    doSearch(query, 1, false, { decade: dec });
  };

  const handleLoadMore = () => {
    doSearch(query, page + 1, true);
  };

  const handlePlayItem = async (item) => {
    setResolvingId(item.identifier);
    audio.playKnobClick();
    try {
      const resolved = item.directResolved || (await resolvePlayableItem(item.identifier));
      onPlayDirectItem(resolved);
      onClose();
    } catch (err) {
      console.warn('Fallback embed play:', err);
      onPlayDirectItem({
        identifier: item.identifier,
        title: item.title,
        year: item.year,
        description: item.description,
        embedUrl: `https://archive.org/embed/${item.identifier}?autoplay=1`,
        playerEngine: 'embed',
      });
      onClose();
    } finally {
      setResolvingId(null);
    }
  };

  const handleBookmarkItem = (item) => {
    audio.playSwitch(true);
    if (isBookmarked(item.identifier)) {
      removeBookmark(item.identifier);
    } else {
      saveBookmark(item);
    }
    refreshBookmarks();
  };

  const handleCopyUrl = async (item) => {
    const url = `https://archive.org/details/${item.identifier}`;
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
    setCopiedId(item.identifier);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenStudio = (item) => {
    audio.playKnobClick();
    if (onOpenChannelStudio) {
      onOpenChannelStudio(item ? item.identifier : '');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#121117] border-4 border-amber-600/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#dedede]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-950 via-[#211712] to-amber-950 p-3 md:p-4 border-b-2 border-amber-600/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500 flex items-center justify-center">
              <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="font-pixel text-amber-400 text-lg md:text-xl font-bold">
                INTERNET ARCHIVE DEEP BROADCAST EXPLORER
              </div>
              <div className="font-mono text-amber-200/70 text-xs hidden sm:block">
                STREAM ANY MOVIE, SERIES, OR TAPE FROM THE ARCHIVE.ORG DATABASE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenStudio()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-950 hover:bg-teal-900 border border-teal-500 text-teal-300 font-pixel text-xs cursor-pointer shadow transition"
              title="Open Channel Studio & Customizer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>CHANNEL STUDIO</span>
            </button>

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
        </div>

        {/* Tab Selector Navigation */}
        <div className="bg-[#18161f] px-4 py-2 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto retro-scroll">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'search'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>GLOBAL SEARCH</span>
          </button>

          <button
            onClick={() => setActiveTab('collections')}
            className={`px-3 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'collections'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>CURATED COLLECTIONS</span>
          </button>

          <button
            onClick={() => setActiveTab('decades')}
            className={`px-3 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'decades'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>BROWSE BY ERA</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-lg font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'saved'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>MY SAVED TAPES ({bookmarksList.length})</span>
          </button>
        </div>

        {/* Tab 1: Global Search & Filter Controls */}
        {activeTab === 'search' && (
          <div className="bg-[#14121a] p-3 md:p-4 border-b border-zinc-800 flex flex-col gap-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type any show title, actor, topic or paste archive.org URL (e.g. archive.org/details/ShinGodzilla_201811)..."
                  className="w-full bg-black/70 border-2 border-zinc-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-pixel text-xs font-bold rounded-xl cursor-pointer shadow transition active:scale-95 whitespace-nowrap"
              >
                {loading ? 'SCANNING...' : 'SCAN ARCHIVE'}
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1.5 rounded-lg border border-zinc-700">
                  <span className="text-zinc-400 text-[10px] font-pixel">SORT:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      doSearch(query, 1, false, { sort: e.target.value });
                    }}
                    className="bg-transparent text-amber-300 focus:outline-none cursor-pointer"
                  >
                    <option value="relevance">⭐ Best Match & Title (Recommended)</option>
                    <option value="downloads desc">Most Popular (Downloads)</option>
                    <option value="date desc">Recently Uploaded</option>
                    <option value="year desc">Release Year (Newest First)</option>
                    <option value="year asc">Release Year (Oldest First)</option>
                    <option value="titleSorter asc">Title (A–Z)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1.5 rounded-lg border border-zinc-700">
                  <span className="text-zinc-400 text-[10px] font-pixel">LENGTH:</span>
                  <select
                    value={durationCategory}
                    onChange={(e) => {
                      setDurationCategory(e.target.value);
                      doSearch(query, 1, false, { durationCategory: e.target.value });
                    }}
                    className="bg-transparent text-amber-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Durations</option>
                    <option value="short">Shorts (&lt; 15 mins)</option>
                    <option value="medium">Episodes (15–45 mins)</option>
                    <option value="long">Feature Length (&gt; 45 mins)</option>
                  </select>
                </div>

                {selectedCollection && (
                  <span className="bg-blue-950 text-blue-300 px-2 py-1 rounded border border-blue-700 flex items-center gap-1">
                    <span>COLLECTION: {selectedCollection}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => {
                        setSelectedCollection('');
                        doSearch(query, 1, false, { collection: '' });
                      }}
                    />
                  </span>
                )}

                {selectedUploader && (
                  <span className="bg-emerald-950 text-emerald-300 px-2 py-1 rounded border border-emerald-700 flex items-center gap-1 max-w-[260px]">
                    <span className="truncate">UPLOADER: {selectedUploader}</span>
                    {query && (
                      <button
                        type="button"
                        title="Drop the search words and show everything from this uploader"
                        onClick={() => {
                          setQuery('');
                          doSearch('', 1, false, { uploader: selectedUploader, creator: '' });
                        }}
                        className="shrink-0 px-1 rounded border border-emerald-600/70 hover:bg-emerald-800/70 hover:text-white text-[9px] tracking-wider cursor-pointer transition"
                      >
                        ALL
                      </button>
                    )}
                    <X
                      className="w-3 h-3 shrink-0 cursor-pointer hover:text-white"
                      onClick={() => {
                        setSelectedUploader('');
                        doSearch(query, 1, false, { uploader: '' });
                      }}
                    />
                  </span>
                )}

                {selectedCreator && (
                  <span className="bg-cyan-950 text-cyan-300 px-2 py-1 rounded border border-cyan-700 flex items-center gap-1 max-w-[260px]">
                    <span className="truncate">CREATOR: {selectedCreator}</span>
                    {query && (
                      <button
                        type="button"
                        title="Drop the search words and show everything from this creator"
                        onClick={() => {
                          setQuery('');
                          doSearch('', 1, false, { creator: selectedCreator, uploader: '' });
                        }}
                        className="shrink-0 px-1 rounded border border-cyan-600/70 hover:bg-cyan-800/70 hover:text-white text-[9px] tracking-wider cursor-pointer transition"
                      >
                        ALL
                      </button>
                    )}
                    <X
                      className="w-3 h-3 shrink-0 cursor-pointer hover:text-white"
                      onClick={() => {
                        setSelectedCreator('');
                        doSearch(query, 1, false, { creator: '' });
                      }}
                    />
                  </span>
                )}

                {selectedDecade && (
                  <span className="bg-purple-950 text-purple-300 px-2 py-1 rounded border border-purple-700 flex items-center gap-1">
                    <span>ERA: {selectedDecade}s</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => {
                        setSelectedDecade('');
                        doSearch(query, 1, false, { decade: '' });
                      }}
                    />
                  </span>
                )}
              </div>

              {totalResults > 0 && (
                <div className="text-right">
                  <div className="text-zinc-400 font-pixel text-[11px]">
                    SHOWING {results.length} OF {totalResults.toLocaleString()} SIGNALS
                  </div>
                  {durationCategory !== 'all' && (
                    <div className="text-amber-400/90 font-pixel text-[10px] mt-0.5">
                      ONLY ITEMS THAT STATE A LENGTH
                      {hiddenNoLength > 0 ? ` • ${hiddenNoLength} UNREADABLE` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 retro-scroll">
              <span className="font-pixel text-[10px] text-zinc-400 whitespace-nowrap">
                HOT SIGNALS:
              </span>
              {quickSignals.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className="px-2.5 py-0.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 hover:border-amber-500/60 rounded text-[11px] font-mono text-zinc-300 whitespace-nowrap cursor-pointer transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Curated Collections Explorer */}
        {activeTab === 'collections' && (
          <div className="p-4 md:p-6 overflow-y-auto retro-scroll flex-1 bg-[#0e0d14]">
            <div className="text-center mb-6">
              <h3 className="font-pixel text-amber-400 text-xl font-bold">
                EXPLORE ARCHIVE.ORG COLLECTIONS
              </h3>
              <p className="font-mono text-xs text-zinc-400 mt-1">
                SELECT A SPECIALIZED HISTORICAL VAULT TO BROWSE VERIFIED BROADCASTS
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectionsList.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleCollectionSelect(c.id)}
                  className="bg-[#181622] hover:bg-[#201d2e] border-2 border-zinc-800 hover:border-amber-400 rounded-xl p-4 cursor-pointer transition-all duration-200 shadow hover:shadow-amber-500/10 group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{c.icon}</span>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-amber-300 text-sm">
                        {c.name}
                      </h4>
                      <span className="font-mono text-[10px] text-amber-500/80">
                        {c.id}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Browse by Decade */}
        {activeTab === 'decades' && (
          <div className="p-4 md:p-6 overflow-y-auto retro-scroll flex-1 bg-[#0e0d14]">
            <div className="text-center mb-6">
              <h3 className="font-pixel text-amber-400 text-xl font-bold">
                TELEVISION TIME MACHINE • BROWSE BY ERA
              </h3>
              <p className="font-mono text-xs text-zinc-400 mt-1">
                JUMP TO SPECIFIC DECADES OF 20TH CENTURY BROADCAST HISTORY
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {decadesList.map((d) => (
                <div
                  key={d.year}
                  onClick={() => handleDecadeSelect(d.year)}
                  className="bg-[#181622] hover:bg-[#221f30] border-2 border-zinc-800 hover:border-amber-400 rounded-xl p-5 text-center cursor-pointer transition-all duration-200 group"
                >
                  <div className="font-pixel text-2xl font-bold text-amber-400 group-hover:scale-105 transition-transform">
                    {d.label}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{d.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: My Saved Tapes & Bookmarks */}
        {activeTab === 'saved' && (
          <div className="p-4 md:p-6 overflow-y-auto retro-scroll flex-1 bg-[#0e0d14]">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-pixel text-amber-400 text-xl font-bold">
                  MY SAVED TAPES & BOOKMARKS
                </h3>
                <p className="font-mono text-xs text-zinc-400">
                  YOUR PERSONAL VCR CASSETTE LIBRARY
                </p>
              </div>
              <span className="font-pixel text-xs text-amber-400 bg-amber-950/80 px-2 py-1 rounded border border-amber-600">
                {bookmarksList.length} TAPES SAVED
              </span>
            </div>

            {bookmarksList.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 font-pixel text-xs">
                <Bookmark className="w-12 h-12 mx-auto text-zinc-700 mb-2" />
                <span>NO TAPES BOOKMARKED YET. CLICK THE BOOKMARK ICON ON ANY VIDEO TO SAVE IT!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookmarksList.map((item) => (
                  <div
                    key={item.identifier}
                    className="bg-[#181622] border-2 border-zinc-800 hover:border-amber-400 rounded-xl p-3 flex flex-col justify-between shadow"
                  >
                    <div>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-zinc-800 mb-2">
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="font-pixel text-amber-400 text-xs mb-1">
                        YEAR: {item.year || 'Vintage'}
                      </div>
                      <h4 className="font-bold text-white text-sm line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => handlePlayItem(item)}
                        className="py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-pixel text-xs font-bold rounded flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>PLAY</span>
                      </button>

                      <button
                        onClick={() => handleCopyUrl(item)}
                        className="py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 border border-zinc-700 font-pixel text-xs rounded flex items-center justify-center gap-1 cursor-pointer"
                        title="Copy Archive URL"
                      >
                        {copiedId === item.identifier ? (
                          <span className="text-green-400 font-bold">COPIED</span>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>COPY URL</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenStudio(item)}
                        className="py-1.5 bg-teal-950/80 hover:bg-teal-900 border border-teal-600/60 text-teal-300 font-pixel text-xs rounded flex items-center justify-center gap-1 cursor-pointer"
                        title="Drop into custom channel"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>+ CH</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results Display Area */}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-y-auto p-4 retro-scroll bg-[#0e0d14]">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Radio className="w-12 h-12 text-amber-400 animate-spin" />
                <div className="font-vcr text-phosphor-amber text-2xl animate-pulse">
                  TUNING ANTENNA TO ARCHIVE.ORG SATELLITE...
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-2" />
                <div className="font-pixel text-amber-400 text-sm">{error}</div>
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <div className="text-center py-20 text-zinc-400 font-pixel text-xs flex flex-col items-center gap-2">
                <Tv className="w-12 h-12 text-zinc-700 mb-1" />
                <span>SEARCH ANY MOVIE, SHOW, ACTOR OR CLICK A HOT SIGNAL PRESET ABOVE</span>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((item) => {
                    const isResolving = resolvingId === item.identifier;
                    const bookmarked = isBookmarked(item.identifier);

                    return (
                      <div
                        key={item.identifier}
                        className="bg-[#181622] border border-zinc-800 hover:border-amber-500/70 rounded-xl p-3 flex flex-col justify-between shadow transition-all duration-200 hover:shadow-amber-500/10 group"
                      >
                        <div>
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-zinc-800 mb-2.5">
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 flex items-center gap-1 border border-zinc-700">
                              <Download className="w-3 h-3 text-amber-400" />
                              <span>{item.downloads.toLocaleString()}</span>
                            </div>

                            <div className="absolute top-2 left-2 flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookmarkItem(item);
                                }}
                                className="p-1 rounded bg-black/70 hover:bg-black text-amber-400 border border-zinc-700 cursor-pointer"
                                title={bookmarked ? 'Remove Bookmark' : 'Bookmark Tape'}
                              >
                                {bookmarked ? (
                                  <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Bookmark className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyUrl(item);
                                }}
                                className="p-1 rounded bg-black/70 hover:bg-black text-zinc-300 hover:text-amber-400 border border-zinc-700 cursor-pointer"
                                title="Copy Archive.org URL"
                              >
                                {copiedId === item.identifier ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            {item.matchType === 'exact_title' && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-pixel text-[9px] shadow-sm">
                                🎯 EXACT TITLE MATCH
                              </span>
                            )}
                            {(item.matchType === 'title_starts' || item.matchType === 'title_contains') && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 font-pixel text-[9px]">
                                📺 TITLE MATCH
                              </span>
                            )}
                            {item.matchType === 'collection_mention' && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500 text-amber-300 font-pixel text-[9px]">
                                📁 IN ANTHOLOGY / EPISODES
                              </span>
                            )}
                            {item.durationSeconds > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 text-zinc-300 font-pixel text-[9px]">
                                ⏱ {formatRuntime(item.durationSeconds)}
                              </span>
                            )}
                            {item.filesCount > 1 && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/80 text-blue-300 font-pixel text-[9px]">
                                📺 {item.filesCount} EPISODES
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] font-pixel text-amber-500 mb-1">
                            <span className="shrink-0">YEAR: {item.year}</span>
                            <span className="flex items-center gap-1.5 min-w-0">
                              <button
                                type="button"
                                title="Show everything this contributor uploaded"
                                disabled={uploaderLookupId === item.identifier}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setUploaderLookupId(item.identifier);
                                  const up = await fetchUploader(item.identifier);
                                  setUploaderLookupId(null);
                                  if (!up) return;
                                  setSelectedCreator('');
                                  setSelectedUploader(up);
                                  doSearch(query, 1, false, { uploader: up, creator: '' });
                                }}
                                className="shrink-0 px-1.5 py-0.5 rounded border border-emerald-700/70 bg-emerald-950/60 text-emerald-300 hover:text-white hover:border-emerald-500 text-[9px] tracking-wider cursor-pointer transition disabled:opacity-50"
                              >
                                {uploaderLookupId === item.identifier ? '...' : 'UPLOADER'}
                              </button>
                              <button
                                type="button"
                                title={`Show only items credited to ${item.creator}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUploader('');
                                  setSelectedCreator(item.creator);
                                  doSearch(query, 1, false, { creator: item.creator, uploader: '' });
                                }}
                                className="truncate max-w-[120px] text-zinc-400 font-mono hover:text-amber-300 cursor-pointer transition"
                              >
                                {item.creator}
                              </button>
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-amber-300 transition">
                            {item.title}
                          </h4>

                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                            {item.description || 'Public domain broadcast material from the Internet Archive.'}
                          </p>

                          {item.descriptionSnippet && (
                            <div className="text-[10px] font-mono text-amber-200/90 bg-black/60 p-2 rounded-lg border border-amber-500/40 mt-2 italic leading-tight">
                              <span className="text-amber-400 not-italic font-bold">MATCH: </span>"{item.descriptionSnippet}"
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t border-zinc-800">
                          <button
                            onClick={() => handlePlayItem(item)}
                            disabled={isResolving}
                            className="py-1.5 px-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-pixel text-xs font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition active:scale-95 shadow"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span className="truncate">{isResolving ? 'TUNING...' : 'PLAY'}</span>
                          </button>

                          <button
                            onClick={() => handleCopyUrl(item)}
                            className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 border border-zinc-700 font-pixel text-xs rounded flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                            title="Copy Archive URL"
                          >
                            {copiedId === item.identifier ? (
                              <span className="text-green-400 font-bold truncate">COPIED</span>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-amber-400" />
                                <span className="truncate">COPY</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenStudio(item)}
                            className="py-1.5 px-2 font-pixel text-xs rounded flex items-center justify-center gap-1 cursor-pointer transition bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-600/60"
                            title="Add or drop into a custom channel"
                          >
                            <PlusCircle className="w-3 h-3 text-teal-400" />
                            <span className="truncate">+ CH</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {results.length < totalResults && (
                  <div className="flex justify-center pt-4 pb-2">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 border-2 border-amber-600/60 text-amber-300 font-pixel text-xs font-bold rounded-xl cursor-pointer shadow transition active:scale-95 flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <Radio className="w-4 h-4 animate-spin text-amber-400" />
                          <span>FETCHING MORE SIGNALS...</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>LOAD MORE VIDEOS (+24)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
