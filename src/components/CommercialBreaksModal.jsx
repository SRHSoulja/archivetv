import React, { useState, useEffect } from 'react';
import { X, Radio, Plus, Trash2, Check } from 'lucide-react';
import { audio } from '../services/soundEffects';
import { resolvePlayableItem } from '../services/archiveApi';
import {
  getAdSets,
  createAdSet,
  addSpotsToSet,
  removeSpotFromSet,
  renameAdSet,
  deleteAdSet,
  getAdConfig,
  setAdConfig,
  MIN_PROGRAMME_SECONDS,
} from '../services/commercials';

export default function CommercialBreaksModal({ isOpen, onClose, currentChannel, onConfigChange }) {
  const [sets, setSets] = useState([]);
  const [config, setConfig] = useState(() => getAdConfig());
  const [sourceId, setSourceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [setName, setSetName] = useState('');
  const [targetSetId, setTargetSetId] = useState('NEW');
  const [expandedSetId, setExpandedSetId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSets(getAdSets());
    setConfig(getAdConfig());
  }, [isOpen]);

  if (!isOpen) return null;

  const push = (next) => {
    setConfig(next);
    setAdConfig(next);
    onConfigChange?.(next);
  };

  const loadSource = async () => {
    const id = sourceId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setCandidate(null);
    try {
      const resolved = await resolvePlayableItem(id);
      const files = (resolved?.availableFiles || []).filter((f) => f.videoUrl);
      if (files.length === 0) {
        setError('No playable files on that item.');
      } else {
        setCandidate({ resolved, files });
        setPicked(new Set(files.map((_, i) => i)));
        setSetName(resolved.title || id);
      }
    } catch {
      setError('Could not load that identifier.');
    }
    setLoading(false);
  };

  const commitSet = () => {
    if (!candidate || picked.size === 0) return;
    audio.playKnobClick();
    const spots = [...picked]
      .sort((a, b) => a - b)
      .map((i) => {
        const f = candidate.files[i];
        return {
          identifier: candidate.resolved.identifier,
          videoFile: f.name,
          title: f.displayName || f.name,
          duration: f.duration || 30,
          videoUrl: f.videoUrl,
          candidateStreamUrls: f.candidateStreamUrls || [f.videoUrl],
        };
      });

    let destinationId = targetSetId;
    if (destinationId === 'NEW') {
      destinationId = createAdSet(setName.trim() || 'Untitled reel').id;
    }
    const next = addSpotsToSet(destinationId, spots);

    setSets(next);
    setCandidate(null);
    setSourceId('');
    setTargetSetId(destinationId);
    setExpandedSetId(destinationId);
    if (!config.setId) push({ ...config, setId: destinationId });
  };

  const channelOverride = currentChannel?.id ? config.byChannel?.[currentChannel.id] : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto retro-scroll bg-[#141211] border-2 border-amber-600/70 rounded-2xl p-5 shadow-2xl text-zinc-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-pixel text-amber-400 text-sm font-bold tracking-wide">
                COMMERCIAL BREAKS
              </h3>
              <p className="text-[10px] text-zinc-500 leading-tight">
                Build a reel, then let it interrupt the programme
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white cursor-pointer p-1"
            aria-label="Close commercial breaks"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* master switch */}
        <button
          type="button"
          onClick={() => {
            audio.playSwitch(!config.enabled);
            push({ ...config, enabled: !config.enabled });
          }}
          className={`mt-4 w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 cursor-pointer transition ${
            config.enabled ? 'bg-green-950/50 border-green-600/60' : 'bg-zinc-900/70 border-zinc-700'
          }`}
        >
          <span
            className={`font-pixel text-[11px] tracking-wider ${
              config.enabled ? 'text-green-300' : 'text-zinc-400'
            }`}
          >
            BREAKS {config.enabled ? 'ON' : 'OFF'}
          </span>
          <span
            className={`w-9 h-5 rounded-full border-2 flex items-center transition ${
              config.enabled
                ? 'bg-green-600/40 border-green-500 justify-end'
                : 'bg-zinc-800 border-zinc-600 justify-start'
            }`}
          >
            <span className={`w-3 h-3 rounded-full mx-0.5 ${config.enabled ? 'bg-green-300' : 'bg-zinc-500'}`} />
          </span>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">
              ROUGHLY EVERY
            </span>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={2}
                max={60}
                value={config.everyMinutes}
                onChange={(e) => push({ ...config, everyMinutes: Number(e.target.value) || 12 })}
                className="w-16 bg-black/60 border-2 border-zinc-700 focus:border-amber-500/70 rounded px-2 py-1 text-xs text-zinc-100 outline-none"
              />
              <span className="text-[10px] text-zinc-500">min</span>
            </div>
          </label>
          <label className="block">
            <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">SPOTS PER BREAK</span>
            <input
              type="number"
              min={1}
              max={5}
              value={config.spotsPerBreak}
              onChange={(e) => push({ ...config, spotsPerBreak: Number(e.target.value) || 2 })}
              className="mt-1 w-16 bg-black/60 border-2 border-zinc-700 focus:border-amber-500/70 rounded px-2 py-1 text-xs text-zinc-100 outline-none block"
            />
          </label>
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
          Timing is jittered by up to 20% so breaks do not land like clockwork, and never within 90
          seconds of either end. Programmes under {Math.round(MIN_PROGRAMME_SECONDS / 60)} minutes
          are left alone, and breaks are skipped entirely on the Tube embed, whose position cannot
          be read well enough to resume.
        </p>

        {/* reels */}
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">YOUR REELS</span>
          {sets.length === 0 && (
            <p className="mt-1 text-[11px] text-zinc-600">
              None yet. Paste an archive.org identifier below to build one.
            </p>
          )}
          <div className="mt-1.5 flex flex-col gap-1.5">
            {sets.map((s) => (
              <div
                key={s.id}
                className={`rounded-lg border-2 ${
                  config.setId === s.id
                    ? 'bg-amber-950/40 border-amber-600/60'
                    : 'bg-zinc-900/70 border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  {renamingId === s.id ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => {
                        setSets(renameAdSet(s.id, renameDraft));
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="flex-1 min-w-0 bg-black/60 border border-zinc-600 rounded px-2 py-1 text-[11px] text-zinc-100 outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => push({ ...config, setId: s.id })}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span className="block font-pixel text-[11px] text-zinc-200 truncate">
                        {s.name}
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        {s.spots.length} spots
                        {s.spots.length > 0 &&
                          ` \u00b7 ${new Set(s.spots.map((x) => x.identifier)).size} tapes`}
                      </span>
                    </button>
                  )}
                  {config.setId === s.id && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(s.id);
                      setRenameDraft(s.name);
                    }}
                    className="shrink-0 text-zinc-500 hover:text-amber-300 cursor-pointer font-pixel text-[9px]"
                  >
                    RENAME
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedSetId(expandedSetId === s.id ? null : s.id)}
                    className="shrink-0 text-zinc-500 hover:text-white cursor-pointer font-pixel text-[9px]"
                  >
                    {expandedSetId === s.id ? 'HIDE' : 'SPOTS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = deleteAdSet(s.id);
                      setSets(next);
                      if (config.setId === s.id) push({ ...config, setId: next[0]?.id || null });
                    }}
                    className="shrink-0 text-red-400 hover:text-red-300 cursor-pointer"
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {expandedSetId === s.id && (
                  <div className="px-3 pb-2 max-h-40 overflow-y-auto retro-scroll">
                    {s.spots.length === 0 && (
                      <p className="text-[10px] text-zinc-600">
                        Empty. Load a tape below and add spots to it.
                      </p>
                    )}
                    {s.spots.map((spot, i) => (
                      <div
                        key={`${spot.identifier}_${spot.videoFile}_${i}`}
                        className="flex items-center gap-2 py-1 border-t border-zinc-800/70 first:border-0"
                      >
                        <span className="flex-1 min-w-0 truncate text-[10px] text-zinc-400">
                          {spot.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSets(removeSpotFromSet(s.id, i))}
                          className="shrink-0 text-zinc-600 hover:text-red-400 cursor-pointer"
                          aria-label={`Remove ${spot.title}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* per-channel */}
        {currentChannel?.id && (
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">
              THIS CHANNEL &middot; {currentChannel.callsign || currentChannel.name}
            </span>
            <div className="flex gap-1.5 mt-1.5">
              {['inherit', 'on', 'off'].map((mode) => {
                const active =
                  mode === 'inherit'
                    ? !channelOverride
                    : channelOverride?.enabled === (mode === 'on');
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      const byChannel = { ...(config.byChannel || {}) };
                      if (mode === 'inherit') delete byChannel[currentChannel.id];
                      else byChannel[currentChannel.id] = { enabled: mode === 'on' };
                      push({ ...config, byChannel });
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-pixel text-[10px] tracking-wider border-2 cursor-pointer transition ${
                      active
                        ? 'bg-amber-500 text-black border-yellow-300 font-bold'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* builder */}
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">BUILD A REEL</span>
          <div className="flex gap-2 mt-1.5">
            <input
              type="text"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="archive.org identifier or URL"
              spellCheck={false}
              className="flex-1 min-w-0 bg-black/60 border-2 border-zinc-700 focus:border-amber-500/70 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none font-mono"
            />
            <button
              type="button"
              onClick={loadSource}
              disabled={loading}
              className="shrink-0 px-3 rounded font-pixel text-[10px] tracking-wider bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer disabled:opacity-50"
            >
              {loading ? '...' : 'LOAD'}
            </button>
          </div>
          {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}

          {candidate && (
            <div className="mt-3">
              <span className="font-pixel text-[10px] text-zinc-400 tracking-wider">ADD TO</span>
              <select
                value={targetSetId}
                onChange={(e) => setTargetSetId(e.target.value)}
                className="w-full mt-1 bg-black/60 border-2 border-zinc-700 focus:border-amber-500/70 rounded px-2 py-1.5 text-xs text-zinc-100 outline-none cursor-pointer"
              >
                <option value="NEW">+ New reel</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.spots.length})
                  </option>
                ))}
              </select>
              {targetSetId === 'NEW' && (
                <input
                  type="text"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="New reel name"
                  className="w-full mt-2 bg-black/60 border-2 border-zinc-700 focus:border-amber-500/70 rounded px-2 py-1.5 text-xs text-zinc-100 outline-none"
                />
              )}
              <div className="mt-2 max-h-44 overflow-y-auto retro-scroll border border-zinc-800 rounded-lg divide-y divide-zinc-800/70">
                {candidate.files.map((f, i) => (
                  <label
                    key={f.name}
                    className="flex items-center gap-2 px-2 py-1.5 text-[11px] cursor-pointer hover:bg-zinc-900/70"
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(i)}
                      onChange={() => {
                        const next = new Set(picked);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        setPicked(next);
                      }}
                      className="accent-amber-500 cursor-pointer"
                    />
                    <span className="truncate text-zinc-300">{f.displayName || f.name}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={commitSet}
                disabled={picked.size === 0}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-pixel text-[10px] tracking-wider border-2 bg-green-900/60 hover:bg-green-800/70 border-green-600/60 text-green-200 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> ADD {picked.size} SPOTS
                {targetSetId === 'NEW'
                  ? ' TO A NEW REEL'
                  : ` TO ${(sets.find((x) => x.id === targetSetId)?.name || 'REEL').toUpperCase()}`}
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 pt-3 border-t border-zinc-800 text-[10px] leading-relaxed text-zinc-600">
          Reels are stored in this browser only. Build them from public domain or openly licensed
          material on archive.org &mdash; the same standard the rest of the dial holds to.
        </p>
      </div>
    </div>
  );
}
