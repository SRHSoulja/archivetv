import React, { useState } from 'react';
import { X, Play, Tv, Search, Sliders } from 'lucide-react';
import { audio } from '../services/soundEffects';
import { useDialog } from '../hooks/useDialog';

export default function TvGuideModal({
  isOpen,
  onClose,
  channels = [],
  currentChannel,
  onSelectChannel,
  onOpenChannelStudio,
}) {
  const dialogRef = useDialog(isOpen);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');

  if (!isOpen) return null;

  const genres = ['ALL', 'CARTOONS', 'SCI-FI', 'CLASSIC TV', 'HORROR', 'COMMERCIALS', 'FILM NOIR', 'WESTERN', 'RETRO TECH', 'COMEDY'];

  const filteredChannels = channels.filter((ch) => {
    const matchesGenre = selectedGenre === 'ALL' || ch.badge === selectedGenre;
    const matchesSearch =
      searchTerm === '' ||
      ch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.number.includes(searchTerm) ||
      ch.programs?.some((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesGenre && matchesSearch;
  });

  const handleTuneChannel = (channel, programIndex = 0) => {
    audio.playKnobClick();
    onSelectChannel(channel, programIndex);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in duration-200">
      <div ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="TV guide"
        className="relative w-full max-w-5xl h-[85vh] bg-[#0c142c] border-4 border-[#2b4c8f] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        {/* Vintage Prevue Guide Blue Header */}
        <div className="bg-gradient-to-r from-[#17306b] via-[#214b9c] to-[#17306b] p-3 md:p-4 border-b-2 border-[#3d6ec7] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900/90 border border-blue-400 flex items-center justify-center shadow-inner">
              <Tv className="w-6 h-6 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <div className="font-pixel text-yellow-400 text-lg md:text-xl tracking-wider font-bold drop-shadow">
                PREVUE TV GUIDE • CHANNEL MATRIX
              </div>
              <div className="font-mono text-blue-200 text-xs">
                INTERNET ARCHIVE SATELLITE BROADCAST NETWORK • 24/7 DIAL
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChannelStudio && (
              <button
                onClick={() => {
                  audio.playKnobClick();
                  onClose();
                  onOpenChannelStudio();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-pixel font-bold text-xs shadow cursor-pointer transition active:scale-95"
                title="Open Channel Studio to customize dials and drop Archive videos"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CHANNEL STUDIO</span>
                <span className="sm:hidden">STUDIO</span>
              </button>
            )}

            <button
            aria-label="Close TV guide"
              onClick={() => {
                audio.playKnobClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-blue-900/80 hover:bg-blue-800 border border-blue-400/50 text-blue-200 hover:text-white cursor-pointer transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-[#0e1c3f] p-3 border-b border-blue-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search channels, series, or movie titles..."
              className="w-full bg-[#070e24] border border-blue-600/50 rounded-lg pl-9 pr-3 py-1.5 text-sm text-blue-100 placeholder-blue-400/50 focus:outline-none focus:border-yellow-400 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 retro-scroll">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`px-2.5 py-1 rounded text-xs font-pixel whitespace-nowrap cursor-pointer transition ${
                  selectedGenre === g
                    ? 'bg-yellow-500 text-black font-bold shadow'
                    : 'bg-blue-950/80 text-blue-300 border border-blue-800 hover:bg-blue-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Channels Schedule Grid */}
        <div className="flex-1 overflow-y-auto retro-scroll p-3 space-y-3 bg-[#080f24]">
          {filteredChannels.length === 0 ? (
            <div className="text-center py-16 text-blue-300/70 font-vcr text-2xl">
              NO BROADCAST SIGNALS MATCHING YOUR SEARCH
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isCurrent = currentChannel?.number === channel.number;
              const currentProg = channel.programs?.[0];
              const upNextProg = channel.programs?.[1];

              return (
                <div
                  key={channel.id || channel.number}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isCurrent
                      ? 'bg-blue-900/50 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                      : 'bg-[#0f1d42]/80 border-blue-800/60 hover:border-blue-500/80 hover:bg-[#132454]'
                  }`}
                >
                  <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-12 rounded-lg bg-gradient-to-b from-yellow-400 to-yellow-600 text-black font-pixel font-bold text-2xl flex items-center justify-center shadow">
                        {channel.number}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base md:text-lg text-yellow-300">
                            {channel.name}
                          </span>
                          <span className="font-pixel text-xs text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-700">
                            {channel.callsign}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-800/60 text-blue-200 font-pixel">
                            {channel.badge}
                          </span>
                        </div>
                        <div className="text-xs text-blue-300/80 line-clamp-1 mt-0.5">
                          {channel.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTuneChannel(channel, 0)}
                        className={`px-4 py-2 rounded-lg font-pixel text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition active:scale-95 ${
                          isCurrent
                            ? 'bg-yellow-400 text-black hover:bg-yellow-300 animate-pulse'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isCurrent ? 'NOW PLAYING' : 'TUNE IN'}</span>
                      </button>
                    </div>
                  </div>

                  {channel.programs && channel.programs.length > 0 && (
                    <div className="bg-black/30 border-t border-blue-900/40 p-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {currentProg && (
                        <div
                          onClick={() => handleTuneChannel(channel, 0)}
                          className="flex items-center gap-2 p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 hover:border-yellow-400/50 cursor-pointer group"
                        >
                          <img
                            src={currentProg.thumbnailUrl}
                            alt=""
                            className="w-12 h-10 object-cover rounded bg-zinc-800 shrink-0 border border-blue-700"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-yellow-400 font-pixel text-[10px]">
                              <span>● NOW AIRING</span>
                              <span>•</span>
                              <span>{Math.round(currentProg.duration / 60)} MIN</span>
                            </div>
                            <div className="font-bold text-white truncate group-hover:text-yellow-300">
                              {currentProg.title} {currentProg.year ? `(${currentProg.year})` : ''}
                            </div>
                          </div>
                        </div>
                      )}

                      {upNextProg && (
                        <div
                          onClick={() => handleTuneChannel(channel, 1)}
                          className="flex items-center gap-2 p-2 rounded-lg bg-blue-950/40 border border-blue-900/40 hover:border-yellow-400/50 cursor-pointer group"
                        >
                          <img
                            src={upNextProg.thumbnailUrl}
                            alt=""
                            className="w-12 h-10 object-cover rounded bg-zinc-800 shrink-0 border border-blue-900"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-blue-400 font-pixel text-[10px]">
                              UP NEXT • {Math.round(upNextProg.duration / 60)} MIN
                            </div>
                            <div className="font-semibold text-blue-200 truncate group-hover:text-yellow-300">
                              {upNextProg.title} {upNextProg.year ? `(${upNextProg.year})` : ''}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Vintage Scrolling Ticker Footer */}
        <div className="bg-[#050b1a] border-t-2 border-[#2b4c8f] p-2 flex items-center gap-3 overflow-hidden font-pixel text-xs text-yellow-400">
          <span className="bg-red-700 text-white px-2 py-0.5 rounded shrink-0 animate-pulse font-bold">
            PREVUE NEWS
          </span>
          <div className="whitespace-nowrap overflow-hidden text-yellow-300/90 font-mono tracking-wide">
            WELCOME TO ARCHIVETV • STREAMING THOUSANDS OF CLASSIC SHOWS, MOVIES & COMMERCIALS FROM ARCHIVE.ORG • USE CHANNELS 02-13 ON THE DIAL • CLICK ARCHIVE SEARCH TO ADD ANY RETRO MOVIE OR SHOW
          </div>
        </div>
      </div>
    </div>
  );
}
