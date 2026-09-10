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
