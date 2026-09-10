import urllib.request
import urllib.parse
import json
import time
import os

channels_def = [
    {
        'id': 'ch02',
        'number': '02',
        'name': 'SATURDAY MORNING TOONS',
        'callsign': 'W-TOON',
        'badge': 'CARTOONS',
        'themeColor': '#f59e0b',
        'query': 'collection:(animationandcartoons) AND mediatype:(movies)',
        'description': 'Classic Golden Age animation, Popeye, Betty Boop, Superman, and vintage theatrical shorts.'
    },
    {
        'id': 'ch03',
        'number': '03',
        'name': 'THE TWILIGHT & SCI-FI ZONE',
        'callsign': 'W-SCIFI',
        'badge': 'SCI-FI',
        'themeColor': '#06b6d4',
        'query': 'subject:(sci-fi) AND mediatype:(movies) AND (collection:(SciFi_Horror) OR collection:(feature_films))',
        'description': 'Vintage sci-fi anthologies, 1950s space expeditions, UFO thrillers, and cosmic mystery teleplays.'
    },
    {
        'id': 'ch04',
        'number': '04',
        'name': 'GOLDEN SITCOMS & PRIMETIME',
        'callsign': 'W-RETRO',
        'badge': 'CLASSIC TV',
        'themeColor': '#ec4899',
        'query': 'collection:(classic_tv) AND mediatype:(movies)',
        'description': 'Mid-century family sitcoms, variety hours, and iconic black-and-white television comedies.'
    },
    {
        'id': 'ch05',
        'number': '05',
        'name': 'DRIVE-IN HORROR THEATER',
        'callsign': 'W-FRGHT',
        'badge': 'HORROR',
        'themeColor': '#ef4444',
        'query': 'subject:(horror) AND mediatype:(movies) AND (collection:(SciFi_Horror) OR collection:(feature_films))',
        'description': 'Late-night creature features, haunted manors, B-movie shocks, and midnight cinema.'
    },
    {
        'id': 'ch06',
        'number': '06',
        'name': 'RETRO COMMERCIAL BREAK',
        'callsign': 'W-ADVT',
        'badge': 'COMMERCIALS',
        'themeColor': '#84cc16',
        'query': 'collection:(classic_tv_commercials) AND mediatype:(movies)',
        'description': 'Nostalgic 1950s through 1990s television commercials, toy pitches, cereal promos, and vintage ads.'
    },
    {
        'id': 'ch07',
        'number': '07',
        'name': 'FILM NOIR & DETECTIVE',
        'callsign': 'W-NOIR',
        'badge': 'FILM NOIR',
        'themeColor': '#8b5cf6',
        'query': 'collection:(Film_Noir) AND mediatype:(movies)',
        'description': 'Shadowy streets, gritty gumshoes, hard-boiled crime mysteries, and classic cinematic suspense.'
    },
    {
        'id': 'ch08',
        'number': '08',
        'name': 'WILD WEST CHRONICLES',
        'callsign': 'W-WEST',
        'badge': 'WESTERN',
        'themeColor': '#d97706',
        'query': 'subject:(western) AND mediatype:(movies) AND (collection:(feature_films) OR collection:(classic_tv))',
        'description': 'Frontier justice, six-shooters, horse chases, and dusty western adventure serials.'
    },
    {
        'id': 'ch09',
        'number': '09',
        'name': 'COMPUTER CHRONICLES & TECH',
        'callsign': 'W-BYTE',
        'badge': 'RETRO TECH',
        'themeColor': '#10b981',
        'query': 'collection:(computerchronicles) AND mediatype:(movies)',
        'description': 'Silicon Valley in its golden age, vintage microcomputers, Stewart Cheifet, Steve Jobs, and retro tech.'
    },
    {
        'id': 'ch10',
        'number': '10',
        'name': 'SLAPSTICK & COMEDY CLUB',
        'callsign': 'W-LAFF',
        'badge': 'COMEDY',
        'themeColor': '#f97316',
        'query': 'subject:(comedy) AND mediatype:(movies) AND (collection:(classic_tv) OR collection:(feature_films))',
        'description': 'Physical slapstick, pratfalls, silent comedy pioneers, and early talkie humor.'
    },
    {
        'id': 'ch11',
        'number': '11',
        'name': 'MID-CENTURY NEWS & SPACE RACE',
        'callsign': 'W-NEWS',
        'badge': 'NEWSREELS',
        'themeColor': '#3b82f6',
        'query': 'collection:(universal_newsreels) AND mediatype:(movies)',
        'description': 'Universal Newsreel cinema dispatches, NASA Apollo missions, and 20th century world history as it happened.'
    },
    {
        'id': 'ch12',
        'number': '12',
        'name': 'SILENT CINEMA MASTERPIECES',
        'callsign': 'W-SILNT',
        'badge': 'SILENT ERA',
        'themeColor': '#a855f7',
        'query': 'collection:(silent_films) AND mediatype:(movies)',
        'description': 'Expressionist silent masterpieces, early visual effects, and silver-screen origins.'
    },
    {
        'id': 'ch13',
        'number': '13',
        'name': 'VINTAGE EDUCATIONAL & SHORTS',
        'callsign': 'W-SCHL',
        'badge': 'VINTAGE SHORTS',
        'themeColor': '#0ea5e9',
        'query': 'collection:(prelinger) AND mediatype:(movies) AND (subject:(guidance) OR subject:(educational))',
        'description': 'Classic Prelinger Archives mid-century classroom hygiene, social guidance, and safety films.'
    }
]

def search_ia(query, rows=12):
    url = f'https://archive.org/advancedsearch.php?q={urllib.parse.quote(query)}&fl[]=identifier,title,year,description,downloads&sort[]=downloads+desc&rows={rows}&output=json'
    req = urllib.request.Request(url, headers={'User-Agent': 'ArchiveTV/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode())
            return data.get('response', {}).get('docs', [])
    except Exception as e:
        print(f"Error searching '{query}': {e}")
        return []

def get_item_video(identifier):
    url = f'https://archive.org/metadata/{identifier}'
    req = urllib.request.Request(url, headers={'User-Agent': 'ArchiveTV/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode())
            files = data.get('files', [])
            meta = data.get('metadata', {})
            mp4s = [f for f in files if f.get('name', '').lower().endswith('.mp4')]
            if not mp4s:
                return None
            # filter out ia.mp4 unless needed
            clean_mp4s = [f for f in mp4s if not f.get('name', '').lower().endswith('.ia.mp4')] or mp4s
            # pick best file by size
            best = sorted(clean_mp4s, key=lambda x: int(x.get('size', 0)), reverse=True)[0]
            filename = best['name']
            length_str = best.get('length')
            try:
                duration = int(float(length_str)) if length_str else 1800
            except:
                duration = 1800
            
            raw_desc = meta.get('description', '')
            if isinstance(raw_desc, list):
                raw_desc = ' '.join(raw_desc)
            # clean html tags
            clean_desc = raw_desc.replace('<p>', '').replace('</p>', ' ').replace('<br>', ' ').replace('<br/>', ' ').strip()
            if len(clean_desc) > 280:
                clean_desc = clean_desc[:277] + '...'

            return {
                'identifier': identifier,
                'title': meta.get('title') or identifier.replace('_', ' '),
                'year': meta.get('year') or meta.get('date', '')[:4] or 'Vintage',
                'description': clean_desc or f"Classic presentation from Internet Archive.",
                'videoFile': filename,
                'videoUrl': f"https://archive.org/download/{identifier}/{urllib.parse.quote(filename)}",
                'thumbnailUrl': f"https://archive.org/services/img/{identifier}",
                'duration': duration,
                'size': int(best.get('size', 0))
            }
    except Exception as e:
        print(f"Error getting metadata for '{identifier}': {e}")
        return None

results = []

for ch in channels_def:
    print(f"Fetching channel {ch['number']}: {ch['name']}...")
    docs = search_ia(ch['query'], rows=8)
    items = []
    for doc in docs:
        if len(items) >= 4:
            break
        ident = doc.get('identifier')
        if not ident:
            continue
        vdata = get_item_video(ident)
        if vdata and vdata['duration'] > 15:
            items.append(vdata)
            print(f"  + Added [{len(items)}/4]: {vdata['title'][:40]} ({vdata['duration']}s)")
        time.sleep(0.15)
    
    ch_result = dict(ch)
    ch_result['programs'] = items
    results.append(ch_result)

os.makedirs('src/data', exist_ok=True)
with open('src/data/curatedChannels.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"\nDone! Successfully generated curatedChannels.json with {len(results)} channels.")
