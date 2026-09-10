// Movie & TV Box Art / Theatrical Poster Service
// Fetches authentic posters from Wikimedia Commons / Wikipedia API & Archive.org image files,
// with persistent localStorage caching to minimize network lookups and avoid rate limits.

const POSTER_CACHE_KEY = 'archivetv_poster_cache_v6';
const posterMemoryCache = new Map();

// Known authentic posters for classic public domain and archive masterpieces
const CURATED_POSTERS = {
  // Teenage Mutant Ninja Turtles (1987 Classic Animated Series)
  'tmnt-season-1-2': 'https://thumb.wikimedia.org/wikipedia/en/thumb/1/12/TMNT1987Series.png/500px-TMNT1987Series.png',
  'Teenage_Mutant_Ninja_Turtles_1987_TV_series': 'https://thumb.wikimedia.org/wikipedia/en/thumb/1/12/TMNT1987Series.png/500px-TMNT1987Series.png',
  'Teenage_Mutant_Ninja_Turtles_1987': 'https://thumb.wikimedia.org/wikipedia/en/thumb/1/12/TMNT1987Series.png/500px-TMNT1987Series.png',
  'Teenage_Mutant_Ninja_Turtles': 'https://thumb.wikimedia.org/wikipedia/en/thumb/1/12/TMNT1987Series.png/500px-TMNT1987Series.png',
  'tmnt_1987': 'https://thumb.wikimedia.org/wikipedia/en/thumb/1/12/TMNT1987Series.png/500px-TMNT1987Series.png',
  'tmnt': 'https://thumb.wikimedia.org/wikipedia/en/thumb/1/12/TMNT1987Series.png/500px-TMNT1987Series.png',

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
  'teenagers_from_outerspace': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Teenagers_from_Outer_Space_poster.jpg/500px-Teenagers_from_Outer_Space_poster.jpg',
  'horror_express_ipod': 'https://upload.wikimedia.org/wikipedia/en/a/a2/Horror_Express.jpg',

  // Film Noir & Westerns
  'suddenly': 'https://upload.wikimedia.org/wikipedia/en/8/82/Suddenly_%281954_movie_poster%29.jpg',
  'TheStranger_0': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/The_Stranger_%281946_film_poster%29.jpg/500px-The_Stranger_%281946_film_poster%29.jpg',
  'ScarletStreet': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Edward_G._Robinson_and_Joan_Bennett_in_%27Scarlet_Street%27%2C_1946.jpg/500px-Edward_G._Robinson_and_Joan_Bennett_in_%27Scarlet_Street%27%2C_1946.jpg',
  'impact': 'https://upload.wikimedia.org/wikipedia/en/9/91/Impact_1949_poster.jpg',
  'AngelAndTheBadman': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Angel_badman.jpg/500px-Angel_badman.jpg',
  'his_girl_friday': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/His_Girl_Friday_%281940_poster%29_crop.jpg/500px-His_Girl_Friday_%281940_poster%29_crop.jpg',
  'mclintok_widescreen': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/McLintock%21_theatrical_poster.jpg/500px-McLintock%21_theatrical_poster.jpg',
  'Santa_Fe_Trail_movie': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Santa_Fe_Trail_poster.jpg/500px-Santa_Fe_Trail_poster.jpg',
  'Charade': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Charade_%281963%29_poster.jpg/500px-Charade_%281963%29_poster.jpg',
  'A_Star_Is_Born': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/A_Star_Is_Born_%281937_poster%29.jpg/500px-A_Star_Is_Born_%281937_poster%29.jpg',
};

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
 * Searches Wikipedia / Wikimedia Commons for authentic theatrical poster / VHS cover art
 */
export async function fetchTheatricalPoster(title, year = '', identifier = '') {
  const cacheKey = identifier || `${title}_${year}`;
  
  // 1. Check in-memory / localStorage cache
  if (posterMemoryCache.has(cacheKey)) {
    return posterMemoryCache.get(cacheKey);
  }

  // 2. Check curated dictionary by identifier
  if (identifier && CURATED_POSTERS[identifier]) {
    saveLocalPosterCache(cacheKey, CURATED_POSTERS[identifier]);
    return CURATED_POSTERS[identifier];
  }

  // 3. Direct substring checks for known series to guarantee authentic artwork
  const lowerTitle = (title || '').toLowerCase();
  const lowerId = (identifier || '').toLowerCase();
  if (lowerTitle.includes('lone ranger') || lowerId.includes('lone_ranger') || lowerId.includes('theloneranger')) {
    const lrPoster = CURATED_POSTERS['The_Lone_Ranger'];
    saveLocalPosterCache(cacheKey, lrPoster);
    return lrPoster;
  }
  if (lowerTitle.includes('teenage mutant ninja turtles') || lowerTitle.includes('tmnt') || lowerId.includes('tmnt') || lowerId.includes('teenage-mutant-ninja-turtles')) {
    const tmntPoster = CURATED_POSTERS['Teenage_Mutant_Ninja_Turtles_1987'];
    saveLocalPosterCache(cacheKey, tmntPoster);
    return tmntPoster;
  }
  if (lowerTitle.includes('elephants dream') || lowerId.includes('elephantsdream')) {
    const edPoster = CURATED_POSTERS['ElephantsDream'];
    saveLocalPosterCache(cacheKey, edPoster);
    return edPoster;
  }
  if (lowerTitle === 'sintel' || lowerTitle.startsWith('sintel') || lowerId === 'sintel') {
    const sintelPoster = CURATED_POSTERS['Sintel'];
    saveLocalPosterCache(cacheKey, sintelPoster);
    return sintelPoster;
  }

  const clean = cleanTitleForSearch(title);
  const normalizedKey = clean.replace(/[^a-zA-Z0-9]/g, '_');
  if (CURATED_POSTERS[normalizedKey]) {
    saveLocalPosterCache(cacheKey, CURATED_POSTERS[normalizedKey]);
    return CURATED_POSTERS[normalizedKey];
  }

  for (const [k, v] of Object.entries(CURATED_POSTERS)) {
    if (k.toLowerCase() === normalizedKey.toLowerCase()) {
      saveLocalPosterCache(cacheKey, v);
      return v;
    }
  }

  if (!clean || clean.length < 3) return null;

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
            if (matched?.thumbnail?.source) {
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
        // Find first page that actually contains a valid thumbnail
        for (const page of Object.values(pages)) {
          const posterUrl = page?.thumbnail?.source;
          if (posterUrl) {
            saveLocalPosterCache(cacheKey, posterUrl);
            return posterUrl;
          }
        }
      }
    } catch {}
  }

  return null;
}
