// Internet Archive API Client, Global Explorer, and Channel Manager
import curatedData from '../data/curatedChannels.json';

const CUSTOM_CHANNELS_KEY = 'archivetv_custom_channels_v1';
const BOOKMARKS_KEY = 'archivetv_bookmarks_v1';
const METADATA_CACHE_PREFIX = 'archivetv_meta_';
const metadataMemoryCache = new Map();

/**
 * Extracts a clean archive.org item identifier from URLs or raw strings
 */
export function extractIdentifier(input) {
  if (!input) return '';
  let s = input.trim();

  const prefixes = [
    'https://archive.org/details/',
    'http://archive.org/details/',
    'archive.org/details/',
    'https://archive.org/embed/',
    'http://archive.org/embed/',
    'archive.org/embed/',
    'https://archive.org/download/',
    'http://archive.org/download/',
    'archive.org/download/',
    'https://archive.org/metadata/',
    'http://archive.org/metadata/',
    'archive.org/metadata/',
  ];

  for (const p of prefixes) {
    if (s.includes(p)) {
      s = s.split(p)[1].split('/')[0].split('?')[0].split('#')[0];
      break;
    }
  }

  return s.replace(/^\/+|\/+$/g, '').trim();
}

/**
 * Searches the entire Internet Archive video database with rich filtering,
 * pagination, decade filters, and collections.
 */
export async function searchArchive(query, options = {}) {
  const {
    rows = 30,
    sort = 'relevance',
    page = 1,
    collection = '',
    decade = '',
    durationCategory = '',
  } = options;

  const raw = (query || '').trim();

  // 1. Check if user pasted a direct URL or bare identifier
  if (raw && page === 1 && !collection && !decade) {
    const cleanId = extractIdentifier(raw);
    const isDirectIdCandidate = cleanId && !cleanId.includes(' ') && cleanId.length > 2;

    if (isDirectIdCandidate) {
      try {
        const resolved = await resolvePlayableItem(cleanId);
        if (resolved && resolved.title) {
          const directItem = {
            identifier: resolved.identifier,
            title: resolved.title,
            year: resolved.year,
            description: resolved.description,
            descriptionSnippet: '',
            downloads: resolved.downloads || 99999,
            creator: resolved.creator || 'Archive Item',
            thumbnailUrl: resolved.thumbnailUrl,
            directResolved: resolved,
            availableFiles: resolved.availableFiles || [],
            matchType: 'exact_title',
            score: 99999,
            filesCount: (resolved.availableFiles || []).length || 1,
          };
          return { total: 1, items: [directItem] };
        }
      } catch (err) {
        console.warn('Direct resolve skipped, fallback to search:', err);
      }
    }
  }

  // 2. Build Intelligent Solr Query
  const queryParts = ['(mediatype:(movies) OR mediatype:(video))'];

  if (collection) {
    queryParts.push(`collection:(${collection})`);
  }

  if (decade) {
    const startYear = parseInt(decade, 10);
    const endYear = startYear + 9;
    queryParts.push(`year:[${startYear} TO ${endYear}]`);
  }

  let cleanKeywords = [];
  if (raw) {
    const clean = raw.replace(/["[\]^~:()]/g, ' ').replace(/\s+/g, ' ').trim();
    const stopWords = new Set([
      'of', 'the', 'a', 'an', 'in', 'on', 'and', 'or', 'to', 'for', 'with', 'at', 'by', 'from',
    ]);
    const allWords = clean.split(' ').filter(Boolean);
    cleanKeywords = allWords.filter((w) => !stopWords.has(w.toLowerCase()));
    if (cleanKeywords.length === 0) cleanKeywords = allWords;

    // Targeted query structure:
    // 1. Quoted exact phrase in title
    // 2. All significant words in title
    // 3. Quoted phrase in description or subject
    // 4. Identifier keyword search
    const titleAndWords = cleanKeywords.map((w) => `title:${w}`).join(' AND ');
    queryParts.push(
      `(title:"${clean}" OR (${titleAndWords}) OR description:"${clean}" OR subject:"${clean}" OR identifier:*${allWords.join('_')}*)`
    );
  }

  const finalQuery = queryParts.join(' AND ');
  const solrSort = sort === 'relevance' || !sort ? 'downloads desc' : sort;

  try {
    const res = await executeSearch(finalQuery, rows, solrSort, page);
    const qLower = raw.toLowerCase().trim();

    let items = res.docs.map((doc) => {
      const tLower = (doc.title || doc.identifier || '').toLowerCase();
      const rawDesc = Array.isArray(doc.description) ? doc.description.join(' ') : (doc.description || '');
      const cleanDescText = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      const descLower = cleanDescText.toLowerCase();

      // Determine match quality & calculate relevance score
      let score = 0;
      let matchType = 'collection';

      if (qLower) {
        if (tLower === qLower) {
          score += 10000;
          matchType = 'exact_title';
        } else if (tLower.startsWith(qLower)) {
          score += 5000;
          matchType = 'title_starts';
        } else if (tLower.includes(qLower)) {
          score += 3000;
          matchType = 'title_contains';
        } else if (
          cleanKeywords.length > 0 &&
          cleanKeywords.every((w) => tLower.includes(w.toLowerCase()))
        ) {
          score += 1000;
          matchType = 'title_words';
        } else if (descLower.includes(qLower)) {
          score += 200;
          matchType = 'collection_mention';
        } else {
          score += 50;
        }

        // Add logarithmic download factor to order within the same tier
        score += Math.log10((doc.downloads || 1) + 1) * 10;
      } else {
        score = doc.downloads || 0;
      }

      // Extract matching snippet if matched in description/episodes
      let snippet = '';
      if (qLower && (matchType === 'collection_mention' || matchType === 'collection')) {
        const idx = descLower.indexOf(qLower);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(cleanDescText.length, idx + qLower.length + 65);
          snippet =
            (start > 0 ? '...' : '') +
            cleanDescText.slice(start, end).trim() +
            (end < cleanDescText.length ? '...' : '');
        }
      }

      const filesCount = parseInt(doc.files_count, 10) || 1;

      return {
        identifier: doc.identifier,
        title: doc.title || doc.identifier.replace(/[-_]/g, ' '),
        year: doc.year || 'Vintage',
        description: cleanDescription(doc.description),
        descriptionSnippet: snippet,
        downloads: doc.downloads || 0,
        creator: doc.creator || 'Archive Contributor',
        thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
        collection: doc.collection
          ? Array.isArray(doc.collection)
            ? doc.collection[0]
            : doc.collection
          : '',
        matchType,
        score,
        filesCount,
      };
    });

    // If sorting by relevance or default, sort items by calculated score
    if (!sort || sort === 'relevance') {
      items.sort((a, b) => b.score - a.score);
    }

    if (durationCategory && durationCategory !== 'all') {
      items = items.filter((item) => {
        if (!item.duration) return true;
        const mins = item.duration / 60;
        if (durationCategory === 'short') return mins <= 15;
        if (durationCategory === 'medium') return mins > 15 && mins <= 45;
        if (durationCategory === 'long') return mins > 45;
        return true;
      });
    }

    return { total: res.total, items };
  } catch (err) {
    console.error('Archive search error:', err);
    throw err;
  }
}

async function executeSearch(q, rows, sort, page) {
  const params = new URLSearchParams({
    q,
    'fl[]': 'identifier,title,year,description,downloads,creator,mediatype,collection,files_count',
    rows: String(rows),
    page: String(page),
    output: 'json',
  });

  if (sort && sort !== 'relevance') {
    params.append('sort[]', sort);
  } else {
    params.append('sort[]', 'downloads desc');
  }

  const url = `https://archive.org/advancedsearch.php?${params.toString()}`;

  // 12s timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Search error HTTP ${res.status}`);
    const data = await res.json();
    return {
      docs: data?.response?.docs || [],
      total: data?.response?.numFound || 0,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function scoreVideoFile(f, identifier) {
  const name = (f?.name || '').toLowerCase();
  const format = (f?.format || '').toLowerCase();
  const size = parseInt(f?.size, 10) || 0;
  let score = 1000;

  // Prefer standard web MP4
  if (name.endsWith('.mp4')) score += 300;
  if (name.endsWith('.ia.mp4')) score += 260; // Official Archive.org web-optimized derivative
  if (name.endsWith('.m4v')) score += 180;
  if (name.endsWith('.webm')) score += 150;

  // Format bonuses
  if (format.includes('h.264') || format.includes('h.264 hd')) score += 200;
  if (format.includes('512kb')) score += 150;
  if (format.includes('webm')) score += 120;

  // Quality keywords in filename
  if (name.includes('720p') || name.includes('h264') || name.includes('h.264')) score += 250;
  if (name.includes('1080p')) score += 200;
  if (name.includes('512kb')) score += 180;
  if (name.includes('web') || name.includes('hd')) score += 120;

  // Clean title match (e.g. identifier.mp4)
  const cleanId = (identifier || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanName = name.replace(/[^a-z0-9]/g, '');
  if (cleanId && cleanName.startsWith(cleanId)) score += 100;

  // Penalties for legacy console/device rips or unoptimized raw files
  if (name.includes('_ps3') || name.includes('.ps3.')) score -= 500;
  if (name.includes('_psp') || name.includes('.psp.')) score -= 500;
  if (name.includes('_ipod') || name.includes('.ipod.')) score -= 400;
  if (name.includes('_iphone') || name.includes('.iphone.')) score -= 250;
  if (name.includes('sample') || name.includes('trailer') || name.includes('preview')) score -= 700;
  if (name.includes('_raw') || name.includes('unrestored') || name.includes('master')) score -= 400;

  // File size sweet spot: 30MB to 1.5GB
  if (size >= 30 * 1024 * 1024 && size <= 1500 * 1024 * 1024) {
    score += 250;
  } else if (size > 1500 * 1024 * 1024 && size <= 2500 * 1024 * 1024) {
    score += 50;
  } else if (size > 2500 * 1024 * 1024) {
    score -= 400; // Over 2.5GB often hits buffering timeouts on slow nodes
  } else if (size > 0 && size < 5 * 1024 * 1024) {
    score -= 400; // Under 5MB is likely an intro bumper or corrupt
  }

  return score;
}

/**
 * Universally inspects any Archive.org item and resolves playable video formats.
 * Cached in memory and sessionStorage for instant zero-latency channel tuning.
 */
export async function resolvePlayableItem(inputIdentifier) {
  const identifier = extractIdentifier(inputIdentifier);
  if (!identifier) {
    throw new Error('Invalid Internet Archive identifier.');
  }

  // 1. Check memory cache
  if (metadataMemoryCache.has(identifier)) {
    return metadataMemoryCache.get(identifier);
  }

  // 2. Check session storage cache
  try {
    const cachedStr = sessionStorage.getItem(METADATA_CACHE_PREFIX + identifier);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (parsed && parsed.videoUrl) {
        metadataMemoryCache.set(identifier, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }

  const embedUrl = `https://archive.org/embed/${identifier}?autoplay=1`;
  const defaultThumbnail = `https://archive.org/services/img/${identifier}`;

  try {
    const url = `https://archive.org/metadata/${identifier}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const fallbackItem = {
        identifier,
        title: identifier.replace(/[-_]/g, ' '),
        year: 'Vintage',
        description: 'Internet Archive broadcast stream.',
        videoFile: null,
        videoUrl: null,
        candidateStreamUrls: [],
        embedUrl,
        thumbnailUrl: defaultThumbnail,
        duration: 3600,
        availableFiles: [],
        playerEngine: 'embed',
      };
      metadataMemoryCache.set(identifier, fallbackItem);
      return fallbackItem;
    }

    const data = await res.json();
    const files = data?.files || [];
    const meta = data?.metadata || {};

    const allVideoExts = ['.mp4', '.m4v', '.webm', '.ogv', '.mov', '.mkv', '.avi', '.flv', '.wmv'];
    const candidateFiles = files.filter((f) => {
      if (!f?.name) return false;
      const lower = f.name.toLowerCase();
      const hasExt = allVideoExts.some((ext) => lower.endsWith(ext));
      const formatStr = (f.format || '').toLowerCase();
      const hasFormat = /mpeg4|h\.264|webm|video|512kb/i.test(formatStr);
      return (hasExt || hasFormat) && !lower.endsWith('_thumb.jpg') && !lower.endsWith('.xml');
    });

    // Filter strictly for browser-playable HTML5 video formats
    // HTML5 <video> can only natively play MP4 (H.264/AAC) and WebM.
    // Non-browser containers (.mkv, .avi, .mov, .flv, .wmv) fail immediately.
    const browserPlayableFiles = candidateFiles.filter((f) => {
      const lower = f.name.toLowerCase();
      if (
        lower.endsWith('.mkv') ||
        lower.endsWith('.avi') ||
        lower.endsWith('.mov') ||
        lower.endsWith('.flv') ||
        lower.endsWith('.wmv')
      ) {
        return false;
      }
      return (
        lower.endsWith('.mp4') ||
        lower.endsWith('.m4v') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.ia.mp4')
      );
    });

    let primaryVideo = null;
    let candidateStreamUrls = [];

    if (browserPlayableFiles.length > 0) {
      const sortedPlayable = [...browserPlayableFiles].sort(
        (a, b) => scoreVideoFile(b, identifier) - scoreVideoFile(a, identifier)
      );
      primaryVideo = sortedPlayable[0];
      candidateStreamUrls = sortedPlayable.map(
        (f) => `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
      );
    }

    const sortedCandidates = [...candidateFiles].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const availableFiles = sortedCandidates.map((f) => ({
      name: f.name,
      displayName: cleanFileName(f.name, identifier),
      format: f.format || 'Video',
      size: parseInt(f.size, 10) || 0,
      duration: parseLength(f.length),
      videoUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`,
      isBrowserPlayable: browserPlayableFiles.some((b) => b.name === f.name),
    }));

    const title = meta.title || identifier.replace(/[-_]/g, ' ');
    const desc = cleanDescription(meta.description || '');
    const duration = primaryVideo ? parseLength(primaryVideo.length) : 3600;

    const resolved = {
      identifier,
      title,
      year: meta.year || meta.date?.slice(0, 4) || 'Vintage',
      description: desc || 'Public domain broadcast from the Internet Archive.',
      videoFile: primaryVideo ? primaryVideo.name : null,
      videoUrl: primaryVideo
        ? `https://archive.org/download/${identifier}/${encodeURIComponent(primaryVideo.name)}`
        : null,
      candidateStreamUrls,
      embedUrl,
      thumbnailUrl: defaultThumbnail,
      duration,
      size: primaryVideo ? parseInt(primaryVideo.size, 10) || 0 : 0,
      availableFiles,
      downloads: parseInt(meta.downloads, 10) || 0,
      creator: meta.creator || 'Internet Archive',
      playerEngine: primaryVideo ? 'direct' : 'embed',
    };

    cacheItem(identifier, resolved);
    return resolved;
  } catch (err) {
    console.warn('Resolve item network fallback to embed:', err);
    const guaranteed = {
      identifier,
      title: identifier.replace(/[-_]/g, ' '),
      year: 'Vintage',
      description: 'Streamed directly from Internet Archive.',
      videoFile: null,
      videoUrl: null,
      candidateStreamUrls: [],
      embedUrl,
      thumbnailUrl: defaultThumbnail,
      duration: 3600,
      availableFiles: [],
      playerEngine: 'embed',
    };
    metadataMemoryCache.set(identifier, guaranteed);
    return guaranteed;
  }
}

function cacheItem(identifier, item) {
  metadataMemoryCache.set(identifier, item);
  if (!item?.videoUrl) return; // Don't persist empty videoUrl fallbacks to sessionStorage
  try {
    sessionStorage.setItem(METADATA_CACHE_PREFIX + identifier, JSON.stringify(item));
  } catch {
    // sessionStorage full or disabled
  }
}

function cleanFileName(filename, identifier) {
  let name = filename.replace(/\.(mp4|webm|ogv|m4v|mov|mkv)$/i, '');
  name = name.replace(new RegExp(`^${identifier}[_\\-\\.]?`, 'i'), '');
  name = name.replace(/[-_]/g, ' ').trim();
  return name || filename;
}

function parseLength(val) {
  if (!val) return 1800;
  if (typeof val === 'number') return Math.round(val);
  const parsed = parseFloat(val);
  if (!isNaN(parsed) && parsed > 0) return Math.round(parsed);
  return 1800;
}

/**
 * Saved Bookmarks & Tape Rack Favorites
 */
export function getBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmark(item) {
  const current = getBookmarks();
  if (current.some((b) => b.identifier === item.identifier)) return current;
  const updated = [
    {
      identifier: item.identifier,
      title: item.title,
      year: item.year,
      duration: item.duration,
      thumbnailUrl: item.thumbnailUrl,
      description: item.description,
      videoUrl: item.videoUrl,
      embedUrl: item.embedUrl,
      addedAt: Date.now(),
    },
    ...current,
  ];
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function removeBookmark(identifier) {
  const current = getBookmarks();
  const updated = current.filter((b) => b.identifier !== identifier);
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function isBookmarked(identifier) {
  const current = getBookmarks();
  return current.some((b) => b.identifier === identifier);
}

export function cleanDescription(desc) {
  if (!desc) return '';
  if (Array.isArray(desc)) desc = desc.join(' ');
  const clean = String(desc)
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > 300 ? clean.slice(0, 297) + '...' : clean;
}

/**
 * Sanitizes program items to prevent storage bloat (e.g. strips duplicated availableFiles arrays).
 */
export function sanitizeProgram(prog) {
  if (!prog) return null;
  return {
    identifier: prog.identifier || '',
    title: prog.title || 'Untitled Broadcast',
    seriesTitle: prog.seriesTitle || prog.title || '',
    year: prog.year || 'Vintage',
    description: cleanDescription(prog.description || ''),
    videoFile: prog.videoFile || null,
    videoUrl: prog.videoUrl || null,
    candidateStreamUrls: Array.isArray(prog.candidateStreamUrls) ? prog.candidateStreamUrls.slice(0, 3) : [],
    embedUrl: prog.embedUrl || (prog.identifier ? `https://archive.org/embed/${prog.identifier}?autoplay=1` : null),
    thumbnailUrl:
      prog.thumbnailUrl || (prog.identifier ? `https://archive.org/services/img/${prog.identifier}` : ''),
    duration: typeof prog.duration === 'number' && !isNaN(prog.duration) ? prog.duration : 1800,
    size: prog.size || 0,
    playerEngine: prog.videoUrl ? 'direct' : (prog.playerEngine || 'embed'),
  };
}

/**
 * Sanitizes a custom channel object.
 */
export function sanitizeChannel(channel) {
  if (!channel) return null;
  const programs = (channel.programs || []).map(sanitizeProgram).filter(Boolean);
  return {
    id: channel.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    number: String(channel.number || '14').padStart(2, '0'),
    name: String(channel.name || 'CUSTOM BROADCAST').toUpperCase(),
    callsign: String(channel.callsign || `K-${(channel.name || 'CUS').slice(0, 4)}`).toUpperCase(),
    badge: String(channel.badge || 'CUSTOM').toUpperCase(),
    themeColor: channel.themeColor || '#14b8a6',
    description: cleanDescription(channel.description || 'User curated channel from the Internet Archive.'),
    programs,
    isCustom: true,
  };
}

/**
 * Safely writes custom channels to localStorage with quota-exceeded fallback.
 */
export function safeSetCustomChannels(channels) {
  if (!Array.isArray(channels)) return [];
  const sanitized = channels.map(sanitizeChannel).filter(Boolean);
  try {
    localStorage.setItem(CUSTOM_CHANNELS_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('LocalStorage quota error while saving custom channels:', err);
    try {
      // Clear non-critical session caches if quota exceeded
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('archivetv_')) {
          sessionStorage.removeItem(k);
        }
      }
      localStorage.setItem(CUSTOM_CHANNELS_KEY, JSON.stringify(sanitized));
    } catch (retryErr) {
      console.error('CRITICAL: LocalStorage save failed after cache purge:', retryErr);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(
          'Browser storage limit reached! Your channels could not be saved to browser storage. Please export your channel lineup to JSON to keep a backup.'
        );
      }
    }
  }
  return sanitized;
}

/**
 * Channel lineup management
 */
export function getChannelLineup() {
  const custom = getCustomChannels();
  return [...curatedData, ...custom];
}

export function getCustomChannels() {
  try {
    const raw = localStorage.getItem(CUSTOM_CHANNELS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    let needsMigration = false;
    const sanitizedList = list
      .map((c) => {
        if (!c) return null;
        // Check if bloated fields like availableFiles exist in stored channels
        const hasBloat = (c.programs || []).some(
          (p) => p && ('availableFiles' in p || (p.description && p.description.length > 500))
        );
        if (hasBloat) needsMigration = true;

        const validPrograms = (c.programs || [])
          .filter((p) => p && p.identifier !== 'classic_commercials_vol_1')
          .map(sanitizeProgram)
          .filter(Boolean);

        return sanitizeChannel({
          ...c,
          programs: validPrograms,
        });
      })
      .filter(Boolean);

    if (needsMigration) {
      console.info('Optimized legacy custom channels into lightweight format.');
      safeSetCustomChannels(sanitizedList);
    }
    return sanitizedList;
  } catch (err) {
    console.error('Error reading custom channels from localStorage:', err);
    return [];
  }
}

export function saveCustomChannel(channel) {
  const current = getCustomChannels();

  if (channel.id) {
    const existingIdx = current.findIndex((c) => c.id === channel.id);
    if (existingIdx !== -1) {
      const updatedList = [...current];
      updatedList[existingIdx] = sanitizeChannel({ ...updatedList[existingIdx], ...channel });
      return safeSetCustomChannels(updatedList);
    }
  }

  const nextNum =
    current.length > 0
      ? String(Math.max(...current.map((c) => parseInt(c.number, 10))) + 1).padStart(2, '0')
      : '14';

  const newChan = sanitizeChannel({
    id: channel.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    number: channel.number || nextNum,
    name: (channel.name || 'CUSTOM BROADCAST').toUpperCase(),
    callsign: channel.callsign || `K-CUS${nextNum}`,
    badge: channel.badge || 'CUSTOM',
    themeColor: channel.themeColor || '#14b8a6',
    description: channel.description || 'User curated channel from the Internet Archive.',
    programs: Array.isArray(channel.programs) ? channel.programs : [],
    isCustom: true,
  });

  const updated = [...current, newChan];
  return safeSetCustomChannels(updated);
}

export function updateCustomChannel(channelId, patch) {
  const current = getCustomChannels();
  const idx = current.findIndex((c) => c.id === channelId);
  if (idx === -1) return current;

  const updated = [...current];
  updated[idx] = sanitizeChannel({ ...updated[idx], ...patch });
  return safeSetCustomChannels(updated);
}

export function addProgramToChannel(channelId, programOrPrograms) {
  const current = getCustomChannels();
  const idx = current.findIndex((c) => c.id === channelId);
  if (idx === -1) return current;

  const newPrograms = (
    Array.isArray(programOrPrograms) ? programOrPrograms : [programOrPrograms]
  )
    .map(sanitizeProgram)
    .filter(Boolean);

  const targetChannel = current[idx];
  const updatedPrograms = [...(targetChannel.programs || []), ...newPrograms];

  const updated = [...current];
  updated[idx] = sanitizeChannel({ ...targetChannel, programs: updatedPrograms });
  return safeSetCustomChannels(updated);
}

export function removeProgramFromChannel(channelId, programIndex) {
  const current = getCustomChannels();
  const idx = current.findIndex((c) => c.id === channelId);
  if (idx === -1) return current;

  const targetChannel = current[idx];
  const updatedPrograms = (targetChannel.programs || []).filter((_, i) => i !== programIndex);

  const updated = [...current];
  updated[idx] = sanitizeChannel({ ...targetChannel, programs: updatedPrograms });
  return safeSetCustomChannels(updated);
}

export function reorderProgramsInChannel(channelId, fromIndex, toIndex) {
  const current = getCustomChannels();
  const idx = current.findIndex((c) => c.id === channelId);
  if (idx === -1) return current;

  const targetChannel = current[idx];
  const programs = [...(targetChannel.programs || [])];
  if (fromIndex < 0 || fromIndex >= programs.length || toIndex < 0 || toIndex >= programs.length) {
    return current;
  }

  const [moved] = programs.splice(fromIndex, 1);
  programs.splice(toIndex, 0, moved);

  const updated = [...current];
  updated[idx] = sanitizeChannel({ ...targetChannel, programs });
  return safeSetCustomChannels(updated);
}

export function deleteCustomChannel(channelId) {
  const current = getCustomChannels();
  const updated = current.filter((c) => c.id !== channelId);
  return safeSetCustomChannels(updated);
}

/**
 * Export custom channels (or all channels) to formatted JSON.
 */
export function exportChannelsToJson(customOnly = true) {
  const channelsToExport = customOnly ? getCustomChannels() : getChannelLineup();
  return JSON.stringify(channelsToExport.map(sanitizeChannel), null, 2);
}

/**
 * Import custom channels from a JSON string or parsed array/object.
 */
export function importChannelsFromJson(input) {
  try {
    let data = input;
    if (typeof input === 'string') {
      data = JSON.parse(input);
    }
    const incomingList = Array.isArray(data) ? data : [data];
    const validIncoming = incomingList
      .filter((c) => c && (c.name || c.title))
      .map((c) =>
        sanitizeChannel({
          ...c,
          name: c.name || c.title,
        })
      )
      .filter(Boolean);

    if (validIncoming.length === 0) {
      throw new Error('No valid channel definitions found in JSON.');
    }

    const current = getCustomChannels();
    const updated = [...current];

    for (const newChan of validIncoming) {
      const existingIdx = updated.findIndex(
        (c) => c.id === newChan.id || (c.number === newChan.number && c.name === newChan.name)
      );
      if (existingIdx !== -1) {
        updated[existingIdx] = newChan;
      } else {
        let num = parseInt(newChan.number, 10);
        if (isNaN(num) || num < 2) num = 14;
        while (updated.some((c) => parseInt(c.number, 10) === num)) {
          num += 1;
        }
        updated.push({
          ...newChan,
          number: String(num).padStart(2, '0'),
          id: newChan.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        });
      }
    }

    return safeSetCustomChannels(updated);
  } catch (err) {
    console.error('Import channels failed:', err);
    throw err;
  }
}

/**
 * Encodes a channel into a compact URL-safe string for 1-click sharing.
 */
export function encodeChannelForShare(channel) {
  try {
    const clean = sanitizeChannel(channel);
    const compact = {
      n: clean.name,
      num: clean.number,
      c: clean.callsign,
      b: clean.badge,
      d: (clean.description || '').slice(0, 160),
      p: (clean.programs || []).map((p) => ({
        i: p.identifier,
        t: p.title,
        y: p.year,
        d: p.duration,
        vf: p.videoFile,
        vu: p.videoUrl,
      })),
    };
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(compact)))));
  } catch {
    return null;
  }
}

/**
 * Decodes a shared channel from a URL parameter.
 */
export function decodeSharedChannel(encoded) {
  try {
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const compact = JSON.parse(jsonStr);
    if (!compact || !compact.n) return null;

    const programs = (compact.p || []).map((p) => ({
      identifier: p.i || '',
      title: p.t || 'Untitled Broadcast',
      seriesTitle: p.t || '',
      year: p.y || 'Vintage',
      description: 'Shared broadcast via ArchiveTV community link.',
      videoFile: p.vf || null,
      videoUrl:
        p.vu || (p.i && p.vf ? `https://archive.org/download/${p.i}/${encodeURIComponent(p.vf)}` : null),
      embedUrl: p.i ? `https://archive.org/embed/${p.i}?autoplay=1` : null,
      thumbnailUrl: p.i ? `https://archive.org/services/img/${p.i}` : '',
      duration: p.d || 1800,
      size: 0,
      playerEngine: p.vu ? 'direct' : 'embed',
    }));

    return sanitizeChannel({
      id: `shared_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: compact.n,
      number: compact.num || '14',
      callsign: compact.c || `K-CUS`,
      badge: compact.b || 'CUSTOM',
      description: compact.d || 'Shared broadcast channel from the Internet Archive.',
      programs,
    });
  } catch (err) {
    console.error('Failed to decode shared channel:', err);
    return null;
  }
}

export function calculateLiveTvSlot(channel, currentTimeMs = Date.now()) {
  const progs = channel?.programs || [];
  if (progs.length === 0) {
    return { programIndex: 0, seekSeconds: 0 };
  }

  const totalScheduleSeconds = progs.reduce((acc, p) => acc + (p.duration || 1800), 0);
  if (totalScheduleSeconds <= 0) {
    return { programIndex: 0, seekSeconds: 0 };
  }

  const channelHash = parseInt(channel.number, 10) * 3600;
  const epochSeconds = Math.floor(currentTimeMs / 1000) + channelHash;
  const cycleTime = epochSeconds % totalScheduleSeconds;

  let accumulated = 0;
  for (let i = 0; i < progs.length; i++) {
    const dur = progs[i].duration || 1800;
    if (accumulated + dur > cycleTime) {
      const seekSeconds = cycleTime - accumulated;
      return { programIndex: i, seekSeconds };
    }
    accumulated += dur;
  }

  return { programIndex: 0, seekSeconds: 0 };
}
