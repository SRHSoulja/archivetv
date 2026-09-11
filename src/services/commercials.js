// Commercial breaks.
//
// A "set" is a curated playlist of spots, usually pulled from a single
// archive.org compilation that breaks down into one file per advert. Sets are
// bring-your-own and live in this browser; nothing ships with the app.
//
// Breaks only run on the direct player. The Tube embed is a cross-origin
// iframe whose position cannot be read, so a programme interrupted there could
// never be resumed at the right place -- see the engine guards.

const SETS_KEY = 'archivetv_ad_sets_v1';
const CONFIG_KEY = 'archivetv_ad_config_v1';

// A break inside a short cartoon is absurd; below this a programme is left alone.
export const MIN_PROGRAMME_SECONDS = 600;
// Never interrupt this close to either end.
export const EDGE_GUARD_SECONDS = 90;

export function getAdSets() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETS_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveAdSet(set) {
  if (!set?.id) return getAdSets();
  const current = getAdSets();
  const idx = current.findIndex((s) => s.id === set.id);
  const next = idx === -1 ? [...current, set] : current.map((s) => (s.id === set.id ? set : s));
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

// A reel is built the way a channel is: created empty, then filled from as many
// tapes as you like. Spots are deduped on identifier + file so adding the same
// tape twice does not double up.
export function createAdSet(name) {
  const set = { id: `set_${Date.now()}`, name: (name || 'New reel').trim(), spots: [] };
  saveAdSet(set);
  return set;
}

export function addSpotsToSet(setId, spots) {
  const sets = getAdSets();
  const target = sets.find((s) => s.id === setId);
  if (!target) return sets;

  const seen = new Set((target.spots || []).map((s) => `${s.identifier}::${s.videoFile}`));
  const additions = (spots || []).filter((s) => {
    const key = `${s.identifier}::${s.videoFile}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return saveAdSet({ ...target, spots: [...(target.spots || []), ...additions] });
}

export function removeSpotFromSet(setId, index) {
  const target = getAdSets().find((s) => s.id === setId);
  if (!target) return getAdSets();
  const spots = (target.spots || []).filter((_, i) => i !== index);
  return saveAdSet({ ...target, spots });
}

export function renameAdSet(setId, name) {
  const target = getAdSets().find((s) => s.id === setId);
  if (!target) return getAdSets();
  return saveAdSet({ ...target, name: (name || '').trim() || target.name });
}

// Parity with channels: a reel you have curated is worth as much as a line-up
// you have curated, so it can be reordered, exported, imported and shared the
// same way. Spots are stored in play order, and pickSpots shuffles within it,
// so the order is what you reach for when a break should open on a particular
// advert.
export function reorderSpotsInSet(setId, fromIdx, toIdx) {
  const target = getAdSets().find((s) => s.id === setId);
  if (!target) return getAdSets();
  const spots = [...(target.spots || [])];
  if (fromIdx < 0 || fromIdx >= spots.length || toIdx < 0 || toIdx >= spots.length) {
    return getAdSets();
  }
  spots.splice(toIdx, 0, spots.splice(fromIdx, 1)[0]);
  return saveAdSet({ ...target, spots });
}

/** The stored shape, minus the id, which is minted fresh on the way back in. */
export function exportAdSet(set) {
  if (!set) return null;
  return {
    kind: 'archivetv-reel',
    version: 1,
    name: set.name || 'Reel',
    spots: (set.spots || []).map((sp) => ({
      identifier: sp.identifier,
      title: sp.title,
      year: sp.year || '',
      videoFile: sp.videoFile,
      videoUrl: sp.videoUrl,
      duration: sp.duration || 0,
    })),
  };
}

export function importAdSet(payload) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!data || !Array.isArray(data.spots)) return null;
  const spots = data.spots
    .filter((sp) => sp && sp.identifier && (sp.videoUrl || sp.videoFile))
    .map((sp) => ({
      identifier: String(sp.identifier),
      title: sp.title || sp.videoFile || 'Spot',
      year: sp.year || '',
      videoFile: sp.videoFile || '',
      videoUrl:
        sp.videoUrl ||
        `https://archive.org/download/${sp.identifier}/${encodeURIComponent(sp.videoFile || '')}`,
      duration: Number(sp.duration) || 0,
    }));
  if (spots.length === 0) return null;

  const set = {
    id: `set_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: (data.name || 'Imported reel').trim(),
    spots,
  };
  saveAdSet(set);
  return set;
}

// Same scheme the channel share links use: base64 of a compact payload, with a
// stable id derived from the contents so opening a link twice does not mint two
// reels. Channel links learned that the hard way.
export function encodeReelForShare(set) {
  try {
    const payload = exportAdSet(set);
    if (!payload) return null;
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
  } catch {
    return null;
  }
}

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function decodeSharedReel(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.spots)) return null;
    const id = `shared_${hashString(json)}`;
    const existing = getAdSets().find((s) => s.id === id);
    if (existing) return existing;
    const imported = importAdSet(data);
    if (!imported) return null;
    // Re-key it to the stable id so a second open updates rather than duplicates.
    deleteAdSet(imported.id);
    return saveAdSet({ ...imported, id }).find((s) => s.id === id) || null;
  } catch {
    return null;
  }
}

export function deleteAdSet(id) {
  const next = getAdSets().filter((s) => s.id !== id);
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

const DEFAULT_CONFIG = {
  enabled: false,
  setId: null,
  everyMinutes: 12,
  spotsPerBreak: 2,
  byChannel: {},
};

export function getAdConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setAdConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {}
  return config;
}

// A channel may override which set it uses, or opt out entirely.
export function resolveChannelAds(config, channelId) {
  const override = channelId ? config.byChannel?.[channelId] : null;
  return {
    enabled: override?.enabled ?? config.enabled,
    setId: override?.setId ?? config.setId,
  };
}

/**
 * When should the next break land?
 *
 * Jittered rather than exact: a break every twelve minutes on the dot reads as
 * a spreadsheet, whereas a little irregularity reads as television. Returns
 * null when the programme is too short, or when the whole playable window sits
 * inside the edge guards.
 */
export function scheduleNextBreak(fromSeconds, duration, everyMinutes) {
  if (!duration || duration < MIN_PROGRAMME_SECONDS) return null;

  const latest = duration - EDGE_GUARD_SECONDS;
  const earliest = Math.max(fromSeconds, EDGE_GUARD_SECONDS);
  if (earliest >= latest) return null;

  const base = Math.max(60, (Number(everyMinutes) || 12) * 60);
  const jitter = base * (Math.random() * 0.4 - 0.2); // +/- 20%
  const target = earliest + base + jitter;

  if (target >= latest) return null;
  return target;
}

export function formatSpotLength(seconds) {
  const s = Math.round(Number(seconds) || 0);
  if (!s) return '';
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}

export function pickSpots(set, count, lastPlayedName = null) {
  const spots = (set?.spots || []).filter(Boolean);
  if (spots.length === 0) return [];

  const pool = spots.length > 1 ? spots.filter((s) => s.videoFile !== lastPlayedName) : spots;
  const shuffled = [...(pool.length ? pool : spots)];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.max(1, Math.min(count || 2, shuffled.length)));
}
