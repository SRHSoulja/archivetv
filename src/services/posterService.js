// Movie & TV Box Art / Theatrical Poster Service
// Fetches authentic posters from Wikimedia Commons / Wikipedia API & Archive.org image files,
// with persistent localStorage caching to minimize network lookups and avoid rate limits.

const POSTER_CACHE_KEY = 'archivetv_poster_cache_v8';
const posterMemoryCache = new Map();

// Known authentic posters for classic public domain and archive masterpieces
const CURATED_POSTERS = {
  // Teenage Mutant Ninja Turtles (1987 Classic Animated Series - True 2:3 Vertical Slipcase Poster)
  'tmnt-season-1-2': 'https://upload.wikimedia.org/wikipedia/en/8/8f/TMNT_The_Cowabunga_Collection_cover_art.jpg',
  'Teenage_Mutant_Ninja_Turtles_1987_TV_series': 'https://upload.wikimedia.org/wikipedia/en/8/8f/TMNT_The_Cowabunga_Collection_cover_art.jpg',
  'Teenage_Mutant_Ninja_Turtles_1987': 'https://upload.wikimedia.org/wikipedia/en/8/8f/TMNT_The_Cowabunga_Collection_cover_art.jpg',
  'Teenage_Mutant_Ninja_Turtles': 'https://upload.wikimedia.org/wikipedia/en/8/8f/TMNT_The_Cowabunga_Collection_cover_art.jpg',
  'tmnt_1987': 'https://upload.wikimedia.org/wikipedia/en/8/8f/TMNT_The_Cowabunga_Collection_cover_art.jpg',
  'tmnt': 'https://upload.wikimedia.org/wikipedia/en/8/8f/TMNT_The_Cowabunga_Collection_cover_art.jpg',

  // The Lone Ranger (1949 TV Series starring Clayton Moore & Jay Silverheels)
  'theloneranger_201705': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Lone_ranger_silver_1965.JPG/500px-Lone_ranger_silver_1965.JPG',
  'The_Lone_Ranger_1949_TV_series': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Lone_ranger_silver_1965.JPG/500px-Lone_ranger_silver_1965.JPG',
  'The_Lone_Ranger': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Lone_ranger_silver_1965.JPG/500px-Lone_ranger_silver_1965.JPG',
  'Lone_Ranger': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Lone_ranger_silver_1965.JPG/500px-Lone_ranger_silver_1965.JPG',
  'The_Lone_Ranger__Enter_the_Lone_Ranger': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Lone_ranger_silver_1965.JPG/500px-Lone_ranger_silver_1965.JPG',

  // Curated Animations & Open Cinema (Theatrical High-Res Posters)
  'ElephantsDream': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/ElephantsDreamPoster.jpg/500px-ElephantsDreamPoster.jpg',
  'Elephants_Dream': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/ElephantsDreamPoster.jpg/500px-ElephantsDreamPoster.jpg',
  'Sintel': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/500px-Sintel_poster.jpg',
  'Popeye_forPresident': 'https://archive.org/services/img/Popeye_forPresident',
  'popeye_patriotic_popeye': 'https://archive.org/services/img/popeye_patriotic_popeye',

  // Horror & Sci-Fi Masterpieces
  'TheNakedWitch': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/The_Naked_Witch_%281964%29_-_Title.jpg/500px-The_Naked_Witch_%281964%29_-_Title.jpg',
  'The_Naked_Witch': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/The_Naked_Witch_%281964%29_-_Title.jpg/500px-The_Naked_Witch_%281964%29_-_Title.jpg',
  'Night_of_the_Living_Dead': 'https://upload.wikimedia.org/wikipedia/en/9/91/Night_of_the_Living_Dead_%281968%29_poster.jpg',
  'Night.Of.The.Living.Dead_1080p': 'https://upload.wikimedia.org/wikipedia/en/9/91/Night_of_the_Living_Dead_%281968%29_poster.jpg',
  'night_of_the_living_dead_dvd': 'https://upload.wikimedia.org/wikipedia/en/9/91/Night_of_the_Living_Dead_%281968%29_poster.jpg',
  'NightOfTheLivingDeadTrailer': 'https://upload.wikimedia.org/wikipedia/en/9/91/Night_of_the_Living_Dead_%281968%29_poster.jpg',
  'house_on_haunted_hill_ipod': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/House_on_Haunted_Hill.jpg/500px-House_on_Haunted_Hill.jpg',
  'BloodyPitOfHorror': 'https://upload.wikimedia.org/wikipedia/en/f/f7/Bloodypitofhorror.jpg',
  'ThePhantomoftheOpera': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Phantom_of_the_opera_1925_poster.jpg/500px-Phantom_of_the_opera_1925_poster.jpg',
  'Carnival_of_Souls': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Carnival_of_Souls_%281962_pressbook_cover%29.jpg/500px-Carnival_of_Souls_%281962_pressbook_cover%29.jpg',
  'Nosferatu': 'https://thumb.wikimedia.org/wikipedia/en/thumb/9/90/Nosferatu_poster_%28Albin_Grau%2C_1922%29_1.jpg/500px-Nosferatu_poster_%28Albin_Grau%2C_1922%29_1.jpg',
  'Plan_9_from_Outer_Space': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Plan_9_Alternative_poster.jpg/500px-Plan_9_Alternative_poster.jpg',
  'The_Little_Shop_of_Horrors': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/The_Little_Shop_of_Horrors_%281960%29_-_Half-Sheet_poster.webp/500px-The_Little_Shop_of_Horrors_%281960%29_-_Half-Sheet_poster.webp',
  'The_Last_Man_on_Earth': 'https://upload.wikimedia.org/wikipedia/en/3/36/The_Last_Man_on_Earth_poster.jpg',
  'White_Zombie': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/White_Zombie_poster.jpg/500px-White_Zombie_poster.jpg',
  'Dementia_13': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Dementia_13_theatrical_poster.jpg/500px-Dementia_13_theatrical_poster.jpg',
  'The_Cabinet_of_Dr__Caligari': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Das_Cabinet_des_Dr._Caligari.JPG/500px-Das_Cabinet_des_Dr._Caligari.JPG',
  'Santa_Claus_Conquers_the_Martians': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Santa_Claus_Conquers_the_Martians_1.jpg/500px-Santa_Claus_Conquers_the_Martians_1.jpg',

  // Film Noir & Westerns
  'suddenly': 'https://upload.wikimedia.org/wikipedia/en/8/82/Suddenly_%281954_movie_poster%29.jpg',
  'TheStranger_0': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/The_Stranger_%281946_film_poster%29.jpg/500px-The_Stranger_%281946_film_poster%29.jpg',
  'ScarletStreet': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Edward_G._Robinson_and_Joan_Bennett_in_%27Scarlet_Street%27%2C_1946.jpg/500px-Edward_G._Robinson_and_Joan_Bennett_in_%27Scarlet_Street%27%2C_1946.jpg',
  'impact': 'https://upload.wikimedia.org/wikipedia/en/9/91/Impact_1949_poster.jpg',
  'AngelAndTheBadman': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Angel_badman.jpg/500px-Angel_badman.jpg',
  'his_girl_friday': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/His_Girl_Friday_%281940_poster%29_crop.jpg/500px-His_Girl_Friday_%281940_poster%29_crop.jpg',
  // CC0 on Wikimedia Commons. This is the 1946 French printing ("Le festival
  // Charlie Chaplin"), not the 1938 US one-sheet -- chosen because it is freely
  // licensed and durably hosted, where the US poster copies in circulation are
  // hotlinks to commercial CDNs whose paths rotate.
  'charlie_chaplin_film_fest': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Le_festival_Charlie_Chaplin_affiche%2C_non_identifi%C3%A9.jpg/500px-Le_festival_Charlie_Chaplin_affiche%2C_non_identifi%C3%A9.jpg',
  // Both public domain on Wikimedia Commons. Curated by hand rather than found
  // automatically: Commons file titles carry qualifiers the programme title does
  // not ("1920 Poster") or drop words it has ("The Pawnshop" vs "Charlie
  // Chaplin's The Pawnshop"), so no single subset rule catches both without
  // letting topical junk back in -- which is the bug the strict gate just fixed.
  'DasKabinettdesDoktorCaligariTheCabinetofDrCaligari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Das_Kabinett_des_Doktor_Caligari_1920_Poster.jpg/500px-Das_Kabinett_des_Doktor_Caligari_1920_Poster.jpg',
  'CC_1916_10_02_ThePawnshop': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/The_Pawnshop.jpg',
  'Charade': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Charade_%281963%29_poster.jpg/500px-Charade_%281963%29_poster.jpg',
  'A_Star_Is_Born': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/A_Star_Is_Born_%281937_poster%29.jpg/500px-A_Star_Is_Born_%281937_poster%29.jpg',
};

// Viewer-supplied art. Kept in its own key so it survives POSTER_CACHE_KEY
// version bumps (those exist to flush bad automatic results, which is exactly
// what a deliberate override is not) and always outranks lookup and curation.
const OVERRIDE_KEY = 'archivetv_poster_overrides_v1';

function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY)) || {};
  } catch {
    return {};
  }
}

let posterOverrides = loadOverrides();

export function getPosterOverride(identifier) {
  return identifier ? posterOverrides[identifier] || null : null;
}

export function setPosterOverride(identifier, url) {
  if (!identifier || !url) return;
  posterOverrides = { ...posterOverrides, [identifier]: url };
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(posterOverrides));
  } catch {}
  posterMemoryCache.set(identifier, url);
}

export function clearPosterOverride(identifier) {
  if (!identifier) return;
  const next = { ...posterOverrides };
  delete next[identifier];
  posterOverrides = next;
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
  } catch {}
  posterMemoryCache.delete(identifier);
}

// Initialize persistent storage cache
function loadLocalPosterCache() {
  try {
    const raw = localStorage.getItem(POSTER_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        posterMemoryCache.set(k, v);
      }
    }
  } catch {}
}
loadLocalPosterCache();

function saveLocalPosterCache(key, url) {
  posterMemoryCache.set(key, url);
  try {
    const obj = {};
    const entries = Array.from(posterMemoryCache.entries()).slice(-400);
    for (const [k, v] of entries) {
      obj[k] = v;
    }
    localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

/**
 * Normalizes title strings for encyclopedia search (removes resolution tags, episode numbers, etc.)
 */
// A Wikipedia hit is only usable if the article really is this programme.
// Without this, a search for a title with no article of its own returns the
// lead image of whatever loosely-related page came back -- a portrait, a
// festival attendee, an unrelated person -- and reports success.
function normalizeForMatch(value) {
  return (value || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isStrongMatch(articleTitle, cleanTitle) {
  const a = normalizeForMatch(articleTitle);
  const c = normalizeForMatch(cleanTitle);
  return Boolean(a) && a === c;
}

export function cleanTitleForSearch(title) {
  if (!title) return '';
  return title
    .replace(/[_]/g, ' ')
    .replace(/^(the\s+)?lone\s+ranger\b.*$/i, 'The Lone Ranger 1949 TV series')
    .replace(/.*(teenage\s+mutant\s+ninja\s+turtles|tmnt)\b.*$/i, 'Teenage Mutant Ninja Turtles 1987 TV series')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\b(1080p|720p|480p|dvd|bluray|vhs|remastered|restored|rip|complete|full movie|hd|season\s*\d+|upscale)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Synchronously retrieves a cached poster URL if already known or memory-cached
 */
export function getCachedPosterSync(title, year = '', identifier = '') {
  if (identifier && posterOverrides[identifier]) return posterOverrides[identifier];

  const cacheKey = identifier || `${title}_${year}`;
  if (posterMemoryCache.has(cacheKey)) return posterMemoryCache.get(cacheKey);
  if (identifier && CURATED_POSTERS[identifier]) return CURATED_POSTERS[identifier];

  const lowerTitle = (title || '').toLowerCase();
  const lowerId = (identifier || '').toLowerCase();
  if (lowerTitle.includes('lone ranger') || lowerId.includes('lone_ranger') || lowerId.includes('theloneranger')) {
    return CURATED_POSTERS['The_Lone_Ranger'];
  }
  if (lowerTitle.includes('teenage mutant ninja turtles') || lowerTitle.includes('tmnt') || lowerId.includes('tmnt') || lowerId.includes('teenage-mutant-ninja-turtles')) {
    return CURATED_POSTERS['Teenage_Mutant_Ninja_Turtles_1987'];
  }
  if (lowerTitle.includes('elephants dream') || lowerId.includes('elephantsdream')) {
    return CURATED_POSTERS['ElephantsDream'];
  }
  if (lowerTitle === 'sintel' || lowerTitle.startsWith('sintel') || lowerId === 'sintel') {
    return CURATED_POSTERS['Sintel'];
  }

  const clean = cleanTitleForSearch(title);
  const normalizedKey = clean.replace(/[^a-zA-Z0-9]/g, '_');
  if (CURATED_POSTERS[normalizedKey]) return CURATED_POSTERS[normalizedKey];

  for (const [k, v] of Object.entries(CURATED_POSTERS)) {
    if (k.toLowerCase() === normalizedKey.toLowerCase()) return v;
  }

  return null;
}

/**
 * Searches Wikipedia / Wikimedia Commons for authentic theatrical poster / VHS cover art
 */
export async function fetchTheatricalPoster(title, year = '', identifier = '') {
  const cacheKey = identifier || `${title}_${year}`;

  const instant = getCachedPosterSync(title, year, identifier);
  if (instant) {
    saveLocalPosterCache(cacheKey, instant);
    return instant;
  }

  const clean = cleanTitleForSearch(title);
  if (!clean || clean.length < 3) return null;

  // 4a0. Wikipedia disambiguates film and TV articles as "Title (1940 film)".
  // Asking for those explicitly first stops a same-named topic article winning:
  // a plain search for "Santa Fe Trail" returns the historic trail (and its
  // map) rather than the 1940 film, and reports success while doing it.
  const yearNum = parseInt(year, 10);
  const disambiguated = [];
  if (yearNum > 1900) {
    disambiguated.push(`${clean} (${yearNum} film)`, `${clean} (${yearNum} TV series)`);
  }
  disambiguated.push(`${clean} (film)`, `${clean} (TV series)`);
  try {
    const disUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      disambiguated.join('|')
    )}&prop=pageimages&pilicense=any&pithumbsize=500&format=json&origin=*`;
    const disRes = await fetch(disUrl);
    if (disRes.ok) {
      const disData = await disRes.json();
      const pages = disData?.query?.pages || {};
      for (const cand of disambiguated) {
        const hit = Object.values(pages).find(
          (p) => p.title && p.title.toLowerCase() === cand.toLowerCase() && p.thumbnail?.source
        );
        if (hit) {
          saveLocalPosterCache(cacheKey, hit.thumbnail.source);
          return hit.thumbnail.source;
        }
      }
    }
  } catch {}

  // 4a. Try opensearch to find exact Wikipedia article title first
  try {
    const openSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      clean
    )}&limit=3&format=json&origin=*`;
    const openRes = await fetch(openSearchUrl);
    if (openRes.ok) {
      const openData = await openRes.json();
      const articleTitles = openData[1] || [];
      if (articleTitles.length > 0) {
        // Query thumbnail for the matched article titles
        const titlesQuery = articleTitles.slice(0, 3).join('|');
        const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
          titlesQuery
        )}&prop=pageimages&pilicense=any&pithumbsize=500&format=json&origin=*`;
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const pages = imgData?.query?.pages || {};
          // Preserve the original order of articleTitles from the search results
          for (const artTitle of articleTitles) {
            const matched = Object.values(pages).find(
              (p) => p.title && p.title.toLowerCase() === artTitle.toLowerCase()
            );
            if (matched?.thumbnail?.source && isStrongMatch(matched.title, clean)) {
              saveLocalPosterCache(cacheKey, matched.thumbnail.source);
              return matched.thumbnail.source;
            }
          }
        }
      }
    }
  } catch {}

  // 3b. Fallback generator search
  const isYearValid = year && year !== 'Vintage' && parseInt(year, 10) > 1900;
  const searchQueries = isYearValid
    ? [
        `${clean} ${year} TV series`,
        `${clean} ${year} film`,
        `${clean} (${year})`,
        `${clean} film`,
      ]
    : [`${clean} TV series`, `${clean} film`, clean];

  for (const q of searchQueries) {
    try {
      const endpoint = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        q
      )}&gsrlimit=5&prop=pageimages&pilicense=any&pithumbsize=500&format=json&origin=*`;

      const res = await fetch(endpoint, {
        headers: {
          'Api-User-Agent': 'ArchiveTV/2.0 (Retro TV Simulator; github.com/SRHSoulja/archivetv)',
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        const ranked = Object.values(pages).sort(
          (a, b) => (a.index ?? 999) - (b.index ?? 999)
        );
        for (const page of ranked) {
          const posterUrl = page?.thumbnail?.source;
          if (posterUrl && isStrongMatch(page.title, clean)) {
            saveLocalPosterCache(cacheKey, posterUrl);
            return posterUrl;
          }
        }
      }
    } catch {}
  }

  return null;
}
