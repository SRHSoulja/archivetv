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
// Same treatment as channel links: a reel is repetitive too -- one identifier
// across dozens of spots -- so the payload is deflated before it goes into the
// URL. Links minted before this are plain base64 and carry no `z`.
const COMPRESSED_PREFIX = 'z';

async function deflateToBase64(text) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  for (let i = 0; i < buf.length; i += 1) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

async function inflateFromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

export async function encodeReelForShare(set) {
  try {
    const payload = exportAdSet(set);
    if (!payload) return null;
    const json = JSON.stringify(payload);
    const packed = await deflateToBase64(json);
    return packed
      ? encodeURIComponent(COMPRESSED_PREFIX + packed)
      : encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  } catch {
    return null;
  }
}

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export async function decodeSharedReel(encoded) {
  try {
    const raw = decodeURIComponent(encoded);
    const json = raw.startsWith(COMPRESSED_PREFIX)
      ? await inflateFromBase64(raw.slice(COMPRESSED_PREFIX.length))
      : decodeURIComponent(escape(atob(raw)));
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

// How long to stay in a compilation before moving on, when nothing else is
// asked for. Roughly the length of two or three adverts.
export const DEFAULT_CLIP_SECONDS = 42;
export const CLIP_SECONDS_MIN = 10;
export const CLIP_SECONDS_MAX = 180;

const DEFAULT_CONFIG = {
  enabled: false,
  setId: null,
  everyMinutes: 12,
  spotsPerBreak: 2,
  // How much of a long compilation block to play when one comes up.
  clipSeconds: DEFAULT_CLIP_SECONDS,
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
 * Where the breaks go in a programme.
 *
 * Not a timer. Television broke at act boundaries -- a half-hour show in the
 * middle, an hour into quarters, a feature into five or six parts -- which
 * means placement is a *fraction of the programme*, not a fixed number of
 * minutes since the last one. A 22 minute cartoon block and a 95 minute
 * feature both interrupted every twelve minutes on the dot read as a
 * spreadsheet running; interrupted at their own act joins they read as
 * scheduling.
 *
 * `everyMinutes` still means something -- it decides how many acts the
 * programme is cut into -- but it no longer decides where a cut lands. Each
 * join is then jittered by up to 15% of an act either way, so two viewings of
 * the same programme do not break in the same place.
 *
 * Returns ascending seconds, empty when the programme is too short to carry a
 * break at all.
 */
export function planBreakPoints(duration, everyMinutes) {
  if (!duration || duration < MIN_PROGRAMME_SECONDS) return [];

  const act = Math.max(60, (Number(everyMinutes) || 12) * 60);
  // One fewer join than the programme has acts, rounded: this keeps the acts
  // that result close to the length asked for, where flooring would cut a 24
  // minute programme into three 8 minute acts. Nothing shorter than about one
  // and a half acts gets a break at all, which is what leaves a short cartoon
  // uninterrupted.
  const breaks = Math.round(duration / act) - 1;
  if (breaks < 1) return [];

  const earliest = EDGE_GUARD_SECONDS;
  const latest = duration - EDGE_GUARD_SECONDS;
  if (earliest >= latest) return [];

  // Acts of equal length, so the joins sit at 1/(n+1), 2/(n+1) ... of the run.
  const span = duration / (breaks + 1);
  const points = [];
  for (let i = 1; i <= breaks; i += 1) {
    const jitter = span * (Math.random() * 0.3 - 0.15);
    const at = Math.round(span * i + jitter);
    points.push(Math.min(latest, Math.max(earliest, at)));
  }
  return points.sort((a, b) => a - b);
}

/**
 * The next act join after the current position, or null if the programme has
 * none left.
 *
 * Called again after each break, which re-rolls the jitter on the joins still
 * to come. That is harmless -- they are drawn off the same act grid either way
 * -- and the guard below stops a re-roll landing a second break on top of the
 * one just finished.
 */
export function scheduleNextBreak(fromSeconds, duration, everyMinutes) {
  const from = Math.max(0, Number(fromSeconds) || 0);
  const next = planBreakPoints(duration, everyMinutes).find((t) => t > from + 45);
  return next == null ? null : next;
}

export function formatSpotLength(seconds) {
  const s = Math.round(Number(seconds) || 0);
  if (!s) return '';
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}

// Anything longer than this is a recorded block of adverts rather than one
// advert, and is played by dropping into it rather than from the top.
export const COMPILATION_SECONDS = 240;

export function isCompilationSpot(spot) {
  return !!spot && (spot.compilation === true || (spot.duration || 0) > COMPILATION_SECONDS);
}

/**
 * Where to drop into a compilation, and how long to stay.
 *
 * Properly separated commercial items barely exist on archive.org — of roughly
 * forty-five likely-looking ones, two split into a file per advert. The rest are
 * half-hour blocks taped off air, which are *nothing but* adverts back to back.
 * So rather than refuse them, join one at a random point and leave after a spot
 * or two. The edges land mid-advert sometimes, which is roughly what happens
 * when a channel joins a break late anyway.
 */
export function planCompilationClip(spot, targetSeconds) {
  const total = spot?.duration || 0;
  const target = Math.min(
    CLIP_SECONDS_MAX,
    Math.max(CLIP_SECONDS_MIN, Math.round(Number(targetSeconds) || DEFAULT_CLIP_SECONDS))
  );
  // Jittered a quarter either way around the length asked for, so successive
  // breaks are not all identically long, and never more than most of the
  // recording in case someone asks for three minutes of a four minute block.
  const clip = Math.min(
    Math.max(5, total * 0.8),
    target * 0.75 + Math.random() * target * 0.5
  );
  // Stay clear of the very start and end, where these recordings tend to carry
  // the tail of a programme or a blank run-out.
  const earliest = Math.min(30, total * 0.05);
  const latest = Math.max(earliest, total - clip - 20);
  const startAt = earliest + Math.random() * Math.max(0, latest - earliest);
  return { startAt: Math.round(startAt), clipSeconds: Math.max(5, Math.round(clip)) };
}

export function pickSpots(set, count, lastPlayedName = null, clipSeconds = undefined) {
  const spots = (set?.spots || []).filter(Boolean);
  if (spots.length === 0) return [];

  const pool = spots.length > 1 ? spots.filter((s) => s.videoFile !== lastPlayedName) : spots;
  const shuffled = [...(pool.length ? pool : spots)];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.max(1, Math.min(count || 2, shuffled.length))).map((spot) =>
    isCompilationSpot(spot) ? { ...spot, ...planCompilationClip(spot, clipSeconds) } : spot
  );
}
