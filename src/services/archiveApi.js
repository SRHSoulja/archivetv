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
 * Length metadata on archive.org is free-form and inconsistently populated.
 * The same index holds `runtime` as "00:04:59", `duration` as a string of
 * seconds, and `length` as anything from "06:41 (MM:SS)" to "82 min". Parses
 * what it can and returns null rather than guessing.
 */
export function parseArchiveDuration(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;

  const clock = str.match(/(\d+):(\d{1,2})(?::(\d{1,2}))?/);
  if (clock) {
    const [, a, b, c] = clock;
    const secs =
      c === undefined
        ? Number(a) * 60 + Number(b)
        : Number(a) * 3600 + Number(b) * 60 + Number(c);
    return secs > 0 ? secs : null;
  }

  const minutes = str.match(/^([\d.]+)\s*(?:min|minutes?|m)\b/i);
  if (minutes) {
    const secs = Math.round(parseFloat(minutes[1]) * 60);
    return secs > 0 ? secs : null;
  }

  const bare = Number(str);
  return Number.isFinite(bare) && bare > 0 ? bare : null;
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
    uploader = '',
    creator = '',
  } = options;

  const raw = (query || '').trim();

  // 1. Check if user pasted a direct URL or bare identifier
  if (raw && page === 1 && !collection && !decade && !uploader && !creator) {
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

  // archive.org indexes both: uploader is the account that put the item up
  // (usually an email), creator is who made the work. "A contributor who has
  // more of what we want" is nearly always the former.
  if (uploader) {
    queryParts.push(`uploader:("${uploader.replace(/"/g, '')}")`);
  }

  if (creator) {
    queryParts.push(`creator:("${creator.replace(/"/g, '')}")`);
  }

  if (decade) {
    const startYear = parseInt(decade, 10);
    const endYear = startYear + 9;
    queryParts.push(`year:[${startYear} TO ${endYear}]`);
  }

  // Filtering by length has to happen over items that actually state one.
  // Roughly one archive.org item in twenty does, and the value is a free-form
  // string in one of three fields, so the range check itself stays client-side
  // -- but requiring the field up front is what stops the filter returning an
  // empty page. Searching by length genuinely means searching a smaller corpus.
  if (durationCategory && durationCategory !== 'all') {
    queryParts.push('(runtime:[* TO *] OR duration:[* TO *] OR length:[* TO *])');
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

      // NOT an episode count. `files_count` is every file in the item --
      // thumbnails, subtitle tracks, torrents, metadata, derivatives. The Bee
      // and PuppyCat item reports 82 of them and contains exactly one
      // programme, so the card was promising 62 episodes that do not exist.
      // Kept only as a hint that an item is worth opening; the real count comes
      // from resolvePlayableItem, which reads the actual file list.
      const filesCount = parseInt(doc.files_count, 10) || 1;

      const title = doc.title || doc.identifier.replace(/[-_]/g, ' ');
      const year = extractYearFromMetadata(doc.year, title, doc.identifier);

      return {
        identifier: doc.identifier,
        title,
        year,
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
        durationSeconds:
          parseArchiveDuration(doc.runtime) ??
          parseArchiveDuration(doc.duration) ??
          parseArchiveDuration(doc.length),
      };
    });

    // If sorting by relevance or default, sort items by calculated score
    if (!sort || sort === 'relevance') {
      items.sort((a, b) => b.score - a.score);
    }

    // Applied here rather than in the Solr query: length lives in three fields
    // with three formats, none of them range-queryable. Items with no length
    // listed are hidden rather than passed through, or "SHORT" would still be
    // showing feature films -- the count is reported so that is not a mystery.
    let hiddenNoLength = 0;
    if (durationCategory && durationCategory !== 'all') {
      items = items.filter((item) => {
        if (!item.durationSeconds) {
          hiddenNoLength += 1;
          return false;
        }
        const mins = item.durationSeconds / 60;
        if (durationCategory === 'short') return mins <= 15;
        if (durationCategory === 'medium') return mins > 15 && mins <= 45;
        if (durationCategory === 'long') return mins > 45;
        return true;
      });
    }

    return { total: res.total, items, hiddenNoLength };
  } catch (err) {
    console.error('Archive search error:', err);
    throw err;
  }
}

async function executeSearch(q, rows, sort, page) {
  const params = new URLSearchParams({
    q,
    'fl[]':
      'identifier,title,year,description,downloads,creator,mediatype,collection,files_count,runtime,length,duration',
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

/**
 * Normalizes filenames to identify canonical episode groups.
 * Strips container extensions (.mp4, .ia.mp4, .mkv, .avi, etc.) and
 * automated Archive.org derivative tags (_512kb, _h264, _vbr, .ia, etc.),
 * while preserving genuine distinct episode titles, cuts, parts, and numbers.
 */
export function getCanonicalEpisodeKey(filename) {
  if (!filename) return '';
  let stem = filename.toLowerCase().trim();

  // 1. Strip file extension
  stem = stem.replace(/\.(ia\.mp4|mp4|m4v|webm|ogv|mov|mkv|avi|flv|wmv|mpg|mpeg|ts)$/i, '');

  // 2. Strip standard Archive.org derivative/transcode suffixes at end of stem
  stem = stem.replace(/(\.ia|_ia|_512kb|_h264|_h264_hd|_vbr|_sd|_hd|_lores|_archive)$/i, '');

  // 3. Normalize whitespace and delimiters
  stem = stem.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();

  return stem;
}

function scoreVideoFile(f, identifier) {
  const name = (f?.name || '').toLowerCase();
  const format = (f?.format || '').toLowerCase();
  const size = parseInt(f?.size, 10) || 0;
  let score = 1000;

  // Prefer original standard web MP4 over derivative
  if (name.endsWith('.mp4') && !name.endsWith('.ia.mp4')) score += 400;
  if (name.endsWith('.ia.mp4')) score += 180; // Secondary fallback
  if (name.endsWith('.m4v')) score += 200;
  if (name.endsWith('.webm')) score += 160;

  // Format bonuses
  if (format.includes('h.264') || format.includes('h.264 hd')) {
    score += name.endsWith('.ia.mp4') ? 50 : 200;
  }
  if (format.includes('mpeg4')) score += 200;
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

    // Everything here is a sidecar, never a programme. This list exists because
    // the format test below used to match a bare "video", and archive.org labels
    // a .vtt subtitle track "Web Video Text Tracks" -- so every subtitle in an
    // item was offered as an episode. One Bee and PuppyCat item has 82 files:
    // two real videos (the same programme as .mp4 and .webm) and five subtitle
    // tracks, and the picker listed six things to watch.
    const NON_VIDEO_EXTS = [
      '.vtt', '.srt', '.sub', '.ass', '.ssa', '.smil', '.txt', '.json', '.xml',
      '.torrent', '.sqlite', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
      '.pdf', '.epub', '.zip', '.gz', '.md5', '.sha1', '.nfo', '.cue', '.log',
      '.csv', '.mp3', '.flac', '.wav', '.ogg', '.m4a', '.m3u', '.srt.txt',
    ];
    const NON_VIDEO_FORMATS = /text track|subtitle|caption|thumb|metadata|torrent|json|item tile|spectrogram|waveform|archive bittorrent/i;

    const candidateFiles = files.filter((f) => {
      if (!f?.name) return false;
      const lower = f.name.toLowerCase();
      const formatStr = (f.format || '').toLowerCase();

      // Hard rejects first, so nothing gets in on a loose format match.
      if (NON_VIDEO_EXTS.some((ext) => lower.endsWith(ext))) return false;
      if (NON_VIDEO_FORMATS.test(formatStr)) return false;

      const hasExt = allVideoExts.some((ext) => lower.endsWith(ext));
      // No bare `video` here either: the word turns up in plenty of formats that
      // are not one. A real container name or a known derivative tag only.
      const hasFormat = /mpeg4|mpeg2|h\.264|h264|webm|matroska|quicktime|windows media|divx|xvid|ogg video|512kb/i.test(
        formatStr
      );
      return hasExt || hasFormat;
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
        lower.endsWith('.ogv') ||
        lower.endsWith('.ia.mp4')
      );
    });

    // Group candidate files into canonical episodes to collapse automated IA derivatives (.ia.mp4, _512kb.mp4, etc.)
    // while preserving genuine distinct episodes, parts, and cuts.
    const episodeGroups = new Map();
    for (const f of candidateFiles) {
      const key = getCanonicalEpisodeKey(f.name);
      if (!episodeGroups.has(key)) {
        episodeGroups.set(key, []);
      }
      episodeGroups.get(key).push(f);
    }

    const availableFiles = [];
    for (const [key, filesInGroup] of episodeGroups.entries()) {
      const playable = filesInGroup.filter((f) => browserPlayableFiles.includes(f));
      const sorted = (playable.length > 0 ? playable : filesInGroup).sort(
        (a, b) => scoreVideoFile(b, identifier) - scoreVideoFile(a, identifier)
      );
      const primary = sorted[0];
      const sortedPlayable = playable.sort(
        (a, b) => scoreVideoFile(b, identifier) - scoreVideoFile(a, identifier)
      );
      const groupCandidateUrls = sortedPlayable.map(
        (f) => `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
      );

      availableFiles.push({
        name: primary.name,
        displayName: cleanFileName(primary.name, identifier),
        canonicalKey: key,
        format: primary.format || 'Video',
        size: parseInt(primary.size, 10) || 0,
        duration: parseLength(primary.length),
        videoUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(primary.name)}`,
        candidateStreamUrls:
          groupCandidateUrls.length > 0
            ? groupCandidateUrls
            : [`https://archive.org/download/${identifier}/${encodeURIComponent(primary.name)}`],
        isBrowserPlayable: browserPlayableFiles.some((b) => b.name === primary.name),
      });
    }

    // Sort available files naturally by name / episode number
    availableFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    let primaryVideo = null;
    let candidateStreamUrls = [];

    if (availableFiles.length > 0) {
      // Primary video is the first episode's primary file, or highest-scored playable file
      const firstPlayable = availableFiles.find((f) => f.isBrowserPlayable) || availableFiles[0];
      primaryVideo = files.find((f) => f.name === firstPlayable.name) || null;
      candidateStreamUrls = firstPlayable.candidateStreamUrls || [];
    } else if (browserPlayableFiles.length > 0) {
      const sortedPlayable = [...browserPlayableFiles].sort(
        (a, b) => scoreVideoFile(b, identifier) - scoreVideoFile(a, identifier)
      );
      primaryVideo = sortedPlayable[0];
      candidateStreamUrls = sortedPlayable.map(
        (f) => `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
      );
    }

    const title = meta.title || identifier.replace(/[-_]/g, ' ');
    const desc = cleanDescription(meta.description || '');
    const duration = primaryVideo ? parseLength(primaryVideo.length) : 3600;

    const year = extractYearFromMetadata(meta.year || meta.date, title, identifier);

    const resolved = {
      identifier,
      title,
      year,
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
  let name = filename.replace(/\.(ia\.mp4|mp4|webm|ogv|m4v|mov|mkv|avi|flv)$/i, '');
  name = name.replace(/\.ia$/i, '');
  name = name.replace(new RegExp(`^${identifier}[_\\-\\.]?`, 'i'), '');
  name = name.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
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
// Read far more often than it is written: getCustomTitle falls through to it
// for every item that has no custom label, and isBookmarked is called once per
// result card per render. Measured before this cache, one search of 24 results
// re-read and re-parsed the whole bookmark list 26 times. Held in memory and
// invalidated on write instead; the app is the only writer in this tab, and
// another tab's write is picked up through the `storage` event.
let bookmarksCache = null;

export function getBookmarks() {
  if (bookmarksCache) return bookmarksCache;
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    bookmarksCache = raw ? JSON.parse(raw) : [];
  } catch {
    bookmarksCache = [];
  }
  return bookmarksCache;
}

function writeBookmarks(updated) {
  bookmarksCache = updated;
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === BOOKMARKS_KEY || e.key === null) bookmarksCache = null;
  });
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
  return writeBookmarks(updated);
}

export function removeBookmark(identifier) {
  const current = getBookmarks();
  const updated = current.filter((b) => b.identifier !== identifier);
  return writeBookmarks(updated);
}

// Personal labels, keyed by identifier and kept separate from the item itself
// so poster lookup still has the real name to work with, and so anything can be
// relabelled -- not just saved tapes.
const CUSTOM_TITLES_KEY = 'archivetv_custom_titles_v1';

function loadCustomTitles() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TITLES_KEY)) || {};
  } catch {
    return {};
  }
}

let customTitles = loadCustomTitles();

export function getCustomTitle(identifier) {
  if (!identifier) return '';
  if (customTitles[identifier]) return customTitles[identifier];
  // Labels written before this moved off the bookmark record.
  const legacy = getBookmarks().find((b) => b.identifier === identifier);
  return legacy?.customTitle || '';
}

export function setCustomTitle(identifier, title) {
  if (!identifier) return;
  const clean = (title || '').trim();
  const next = { ...customTitles };
  if (clean) next[identifier] = clean;
  else delete next[identifier];
  customTitles = next;
  try {
    localStorage.setItem(CUSTOM_TITLES_KEY, JSON.stringify(next));
  } catch {}
}

// Local year corrections. Archive.org's year is often the upload date rather
// than the broadcast/release date, and it is not ours to fix upstream.
const CUSTOM_YEARS_KEY = 'archivetv_custom_years_v1';

function loadCustomYears() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_YEARS_KEY)) || {};
  } catch {
    return {};
  }
}

let customYears = loadCustomYears();

export function getCustomYear(identifier) {
  return identifier ? customYears[identifier] || '' : '';
}

export function setCustomYear(identifier, year) {
  if (!identifier) return;
  const clean = String(year || '').trim();
  const next = { ...customYears };
  if (clean) next[identifier] = clean;
  else delete next[identifier];
  customYears = next;
  try {
    localStorage.setItem(CUSTOM_YEARS_KEY, JSON.stringify(next));
  } catch {}
}

// Hand-arranged shelf order, as a list of identifiers. Anything not listed
// sorts to the end, so a newly saved tape appears without disturbing the rest.
const TAPE_ORDER_KEY = 'archivetv_tape_order_v1';

export function getTapeOrder() {
  try {
    const raw = JSON.parse(localStorage.getItem(TAPE_ORDER_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function setTapeOrder(identifiers) {
  try {
    localStorage.setItem(TAPE_ORDER_KEY, JSON.stringify(identifiers || []));
  } catch {}
}

const TAPE_SORT_KEY = 'archivetv_tape_sort_v1';

export function getTapeSort() {
  try {
    return localStorage.getItem(TAPE_SORT_KEY) || 'default';
  } catch {
    return 'default';
  }
}

export function setTapeSort(mode) {
  try {
    localStorage.setItem(TAPE_SORT_KEY, mode || 'default');
  } catch {}
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

// uploader is queryable but never returned by advancedsearch -- it is an email
// address, and only the item metadata endpoint exposes it. So resolve it on
// demand for the one item someone clicked, and cache it.
const uploaderCache = new Map();

// The uploader and the full synopsis both live in the same metadata document,
// and both used to fetch it separately with no timeout and no abort -- so
// opening one item pulled the same file down twice, and a stalled connection
// hung until the browser gave up on its own. One fetch, deduplicated while it
// is in flight, cached after, and abandoned after twelve seconds.
const metadataDocCache = new Map();
const metadataInFlight = new Map();

async function fetchItemMetadata(identifier) {
  if (metadataDocCache.has(identifier)) return metadataDocCache.get(identifier);
  if (metadataInFlight.has(identifier)) return metadataInFlight.get(identifier);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const pending = fetch(`https://archive.org/metadata/${identifier}`, {
    signal: controller.signal,
  })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null)
    .finally(() => {
      clearTimeout(timer);
      metadataInFlight.delete(identifier);
    });

  metadataInFlight.set(identifier, pending);
  const data = await pending;
  if (data) metadataDocCache.set(identifier, data);
  return data;
}

export async function fetchUploader(identifier) {
  if (!identifier) return '';
  if (uploaderCache.has(identifier)) return uploaderCache.get(identifier);
  const data = await fetchItemMetadata(identifier);
  if (!data) return '';
  let up = data?.metadata?.uploader || '';
  if (Array.isArray(up)) up = up[0] || '';
  uploaderCache.set(identifier, up);
  return up;
}

// cleanDescription() caps at 300 chars, and build_channels.py bakes an even
// tighter 280-char cap into curatedChannels.json -- 25 of 60 curated synopses
// arrive already ending in "...". The rest of the text is simply not in the
// app, so recover it from the item's metadata on demand.
const fullDescriptionCache = new Map();

export async function fetchFullDescription(identifier) {
  if (!identifier) return '';
  if (fullDescriptionCache.has(identifier)) return fullDescriptionCache.get(identifier);
  const data = await fetchItemMetadata(identifier);
  if (!data) return '';
  let desc = data?.metadata?.description || '';
  if (Array.isArray(desc)) desc = desc.join(' ');
  const clean = String(desc)
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  fullDescriptionCache.set(identifier, clean);
  return clean;
}

export function extractYearFromMetadata(rawYear, title = '', identifier = '') {
  // If title or identifier has an explicit vintage release year (e.g. "1987" in "TMNT 1987"),
  // that represents the original production/broadcast era, whereas Archive.org's rawYear
  // often records the year the VHS/DVD was ripped and uploaded (e.g. 2023, 2025).
  for (const text of [title, identifier]) {
    if (!text) continue;
    const match = text.match(/\b(19\d\d)\b/);
    if (match) {
      const y = parseInt(match[1], 10);
      if (y >= 1900 && y <= 2035) {
        return String(y);
      }
    }
  }

  if (rawYear && String(rawYear).trim() !== 'Vintage') {
    const parsed = parseInt(String(rawYear).slice(0, 4), 10);
    if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2035) {
      return String(parsed);
    }
  }

  // Fallback scan for modern 2000s years
  for (const text of [title, identifier]) {
    if (!text) continue;
    const match = text.match(/\b(20[0-2]\d)\b/);
    if (match) {
      const y = parseInt(match[1], 10);
      if (y >= 1900 && y <= 2035) {
        return String(y);
      }
    }
  }

  return 'Vintage';
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
    // set when this record is an editable copy of a channel that ships with
    // the app; the original is hidden from the line-up while it exists
    ...(channel.forkedFrom ? { forkedFrom: channel.forkedFrom } : {}),
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
      // The quota that just blew is localStorage's. This used to clear
      // sessionStorage, a separate area with its own budget, so the retry was
      // guaranteed to fail exactly as the first attempt had. Drop the largest
      // rebuildable thing in localStorage instead -- the poster cache, which is
      // recovered from the network -- and only then the session metadata.
      localStorage.removeItem('archivetv_poster_cache_v8');
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
  const forked = new Set(custom.map((c) => c.forkedFrom).filter(Boolean));
  // A forked channel replaces the one it came from rather than sitting beside it.
  return [...curatedData.filter((c) => !forked.has(c.id)), ...custom];
}

/**
 * Channels that ship with the app are read-only records in a JSON file. Editing
 * one copies it into the custom store, and the original drops out of the
 * line-up. Deleting the copy restores the shipped version, which is what makes
 * this reversible.
 */
export function forkCuratedChannel(channelId) {
  const existing = getCustomChannels().find((c) => c.forkedFrom === channelId);
  if (existing) return existing;

  const source = curatedData.find((c) => c.id === channelId);
  if (!source) return null;

  const clone = sanitizeChannel({
    ...source,
    id: `fork_${channelId}_${Date.now()}`,
    forkedFrom: channelId,
  });
  safeSetCustomChannels([...getCustomChannels(), clone]);
  return clone;
}

/**
 * Returns the id edits should be written against, forking first when this is a
 * channel that ships with the app.
 */
export function ensureEditableChannel(channelId) {
  const custom = getCustomChannels();
  if (custom.some((c) => c.id === channelId)) return channelId;
  const already = custom.find((c) => c.forkedFrom === channelId);
  if (already) return already.id;
  return forkCuratedChannel(channelId)?.id || channelId;
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
      // Deferred: this function is called from useState initialisers, so writing
      // here happens during React's render phase, which is not allowed to have
      // side effects and can run more than once.
      const toWrite = sanitizedList;
      setTimeout(() => safeSetCustomChannels(toWrite), 0);
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
      // Carried so re-opening the same link updates the channel instead of
      // minting a second copy of it. See decodeSharedChannel.
      sid: clean.id,
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

// djb2. Only needs to be deterministic and collision-resistant enough to tell
// two shared channels apart.
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// A shared copy of a channel keeps its own dial number where it can, but must
// not land on a number something else already occupies -- two channels reading
// "CH 04" makes digit tuning ambiguous. Re-importing an updated link keeps the
// number already assigned rather than walking further up the dial each time.
function resolveSharedNumber(sharedId, wanted) {
  const lineup = getChannelLineup();
  const mine = lineup.find((c) => c.id === sharedId);
  if (mine) return mine.number;
  const taken = new Set(lineup.map((c) => String(c.number).padStart(2, '0')));
  let num = String(wanted).padStart(2, '0');
  let n = parseInt(num, 10) || 14;
  while (taken.has(num) && n < 99) {
    n += 1;
    num = String(n).padStart(2, '0');
  }
  return num;
}

/**
 * Decodes a shared channel from a URL parameter.
 */
export function decodeSharedChannel(encoded) {
  try {
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const compact = JSON.parse(jsonStr);
    if (!compact || !compact.n) return null;

    // Stable, derived from the link rather than the clock: opening the same
    // share link twice used to add the channel twice. Links minted before
    // `sid` existed fall back to a hash of their own contents, which is
    // equally stable for a given link.
    const sharedId = `shared_${compact.sid || hashString(jsonStr)}`;

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
      id: sharedId,
      name: compact.n,
      number: resolveSharedNumber(sharedId, compact.num || '14'),
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
