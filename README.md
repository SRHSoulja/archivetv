# ArchiveTV 📺📼

<p align="center">
  <a href="https://srhsoulja.github.io/archivetv/"><strong>📺 Launch Live TV Set (GitHub Pages) »</strong></a>
  &nbsp;·&nbsp;
  <a href="GUIDE.md"><strong>📖 How to Use It (User Guide) »</strong></a>
</p>

<p align="center">
  <a href="https://srhsoulja.github.io/archivetv/"><img src="https://img.shields.io/badge/Live_Demo-srhsoulja.github.io%2Farchivetv-amber.svg?style=flat-square&logo=github" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License: MIT" />
  <img src="https://img.shields.io/badge/React-19-blue.svg?style=flat-square" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-purple.svg?style=flat-square" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-teal.svg?style=flat-square" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" />
</p>

**ArchiveTV** is an open-source, client-side retro CRT television and VCR simulation web application. It acts as an interactive portal and dial tuner into the millions of public domain movies, classic television series, cartoons, tech documentaries, vintage commercials, and historical broadcasts preserved on the **Internet Archive (archive.org)**.

Designed to look, feel, and sound like an authentic analog TV set and hi-fi VCR deck from the 1970s–1990s.

---

> **New here?** The [**User Guide**](GUIDE.md) is the practical "how do I actually
> use this" document — switching on, building channels, the tape shelf, commercial
> breaks, every keyboard shortcut, and an honest list of what the app cannot do.
> The README below is the feature and architecture reference.

## 📖 Table of Contents
- [📖 **User Guide — how to use ArchiveTV**](GUIDE.md)
- [⚖️ Disclaimer, Fair Use & Architecture Notice](#️-disclaimer-fair-use--architecture-notice)
- [🛠️ How to Build & Customize Channels](#️-how-to-build--customize-channels)
  - [1. Opening Channel Studio](#1-opening-channel-studio)
  - [2. Creating a Brand New Channel](#2-creating-a-brand-new-channel)
  - [3. Dropping Any Archive.org URL into a Channel](#3-dropping-any-archiveorg-url-into-a-channel)
  - [4. Handling Multi-Episode Series](#4-handling-multi-episode-series-e-g-lone-ranger-twilight-zone)
  - [5. Reordering & Managing Program Schedules](#5-reordering--managing-program-schedules)
  - [6. 1-Click "Copy URL" & Quick-Add from Search](#6-1-click-copy-url--quick-add-from-search)
- [✨ Key Features](#-key-features)
  - [1. 📼 VCR Transport Deck & Precision Scrub Bar](#1--vcr-transport-deck--precision-scrub-bar)
  - [2. 🔍 Deep Archive Explorer & Search Matrix](#2--deep-archive-explorer--search-matrix)
  - [3. 📺 Authentic CRT Shaders & Picture Modes](#3--authentic-crt-shaders--picture-modes)
  - [4. 📻 Interactive Antennas & RF Reception](#4--interactive-antennas--rf-reception)
  - [5. 🎮 Handheld Infrared Remote Control](#5--handheld-infrared-remote-control)
  - [6. 📜 Prevue TV Guide & VHS Tape Shelf](#6--prevue-tv-guide--vhs-tape-shelf)
  - [7. 🖼️ Box Art Tool & Art Suggestions](#7-️-box-art-tool--art-suggestions)
- [🔬 Under the Hood & Technical Architecture](#-under-the-hood--technical-architecture)
  - [Zero Backend Streaming Architecture](#zero-backend-streaming-architecture)
  - [Procedural Web Audio Synthesizer](#procedural-web-audio-synthesizer)
  - [Synchronized Wall-Clock Broadcast Algorithm](#synchronized-wall-clock-broadcast-algorithm)
  - [Dual-Engine Playback System](#dual-engine-playback-system)
  - [Persistent LocalStorage Schema](#persistent-localstorage-schema)
- [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [❓ Frequently Asked Questions (FAQ)](#-frequently-asked-questions-faq)
- [🚀 Quick Start / Local Setup](#-quick-start--local-setup)
- [🌐 Deploying Your Own Personal Instance](#-deploying-your-own-personal-instance)
- [🤝 Contributing & Adding Default Channels](#-contributing--adding-default-channels)
- [📄 License](#-license)

---

## ⚖️ Disclaimer, Fair Use & Architecture Notice

> [!IMPORTANT]
> **ArchiveTV is strictly a client-side frontend portal and media player interface.**
> 
> - **Zero Media Hosted**: ArchiveTV does **NOT** host, store, cache, upload, scrape, or distribute any video, audio, or media files. No video data passes through any third-party server or middleman.
> - **Direct Client-to-Archive Streaming**: All video streams, audio tracks, metadata, and thumbnails are queried and streamed directly from official [Internet Archive](https://archive.org) servers (`archive.org/download/...` and `archive.org/details/...`) directly within the end-user's browser.
> - **Public Domain & Creative Commons**: Content curated on the default dial is sourced from archival collections designated as public domain, Creative Commons, or open access historical collections (e.g. *Prelinger Archives*, *Classic TV Serials*, *Universal Newsreels*, *Open Source Movies*).
> - **100% Local Storage**: All user preferences, custom channels, bookmarks, and watch history are stored solely in the user's browser `localStorage`. No analytics, telemetry, or user accounts are used.
> - **DMCA & Content Inquiries**: As this project hosts no media files, any copyright takedown requests regarding underlying media items must be directed to the designated agent of the Internet Archive per their [Digital Millennium Copyright Act (DMCA) Policy](https://archive.org/about/dmca.php).

---

## 🛠️ How to Build & Customize Channels

ArchiveTV includes a complete broadcast station manager called **Channel Studio** that allows you to turn any public domain videos or series on the Internet Archive into your own custom TV channels with scheduled lineups.

### 1. Opening Channel Studio
You can access Channel Studio at any time from anywhere in the interface:
- **Keyboard Shortcut**: Press **`U`** on your keyboard.
- **Top Header**: Click the **`[CHANNELS]`** button in the top navigation bar.
- **Remote Control**: Click the amber **`[CHANNEL STUDIO]`** button at the bottom of the infrared remote.
- **Prevue TV Guide**: Click the **`[CHANNEL STUDIO]`** button in the TV Guide header.
- **Archive Search Modal**: Click the **`[CHANNEL STUDIO]`** button in the search header or the **`+ CH`** button on any search card.

---

### 2. Creating a Brand New Channel
1. In Channel Studio, select the **CHANNEL LINEUP** tab.
2. Click **`[+ CREATE NEW CHANNEL]`**.
3. Fill in your station details:
   - **Channel Name**: Name your channel (e.g. *Kung Fu Theater*, *Saturday Morning Anime*, *Synthwave Ads*).
   - **Station Callsign**: Enter a 4–6 character callsign (e.g. `K-KUNG`, `W-RETRO`, `K-NOIR`).
   - **Genre Badge**: Choose a preset badge (`WESTERN`, `CARTOONS`, `SCI-FI`, `HORROR`, `COMMERCIALS`, `RETRO TECH`, etc.).
   - **Dial LED Color**: Pick an accent color (amber, emerald green, blue, purple, red, cyan, or yellow).
4. Click **`[SAVE & CREATE CHANNEL]`**.
5. Your custom channel will immediately be assigned the next available channel slot on your TV dial and saved to your browser's persistent `localStorage`.

---

### 3. Dropping Any Archive.org URL into a Channel
You can drop any video hosted on the Internet Archive into any channel in seconds:
1. Find any movie, show, or collection on [archive.org](https://archive.org) (or in ArchiveTV's built-in **Deep Explorer**).
2. Copy the URL (e.g., `https://archive.org/details/theloneranger_201705`) or just the item identifier (`theloneranger_201705`).
3. Open Channel Studio and go to the **`DROP ARCHIVE URL / TAPE`** tab.
4. Paste the URL into the input field and click **`[INSPECT SIGNAL]`**.
5. **Live Signal Inspection**: ArchiveTV immediately queries the Archive.org API to preview:
   - Broadcast Title and Creator/Director
   - Year and Production Metadata
   - Full Video Runtime (`HH:MM:SS`)
   - High-resolution Thumbnail / Poster
   - Direct playable video format (`.mp4`, `.webm`, `.ogv`)
6. Select your **Target Channel** from the dropdown dial list.
7. Click **`[DROP TAPE INTO CHANNEL]`**!

---

### 4. Handling Multi-Episode Series (e.g. Lone Ranger, Twilight Zone)
Many collections on the Internet Archive contain multiple episodes or multi-part reels inside a single identifier (for example, 16 episodes of *The Lone Ranger* or 30 episodes of *The Twilight Zone*).

When ArchiveTV detects multiple video files in an archive item:
- Channel Studio will display a **`MULTI-EPISODE ARCHIVE COLLECTION DETECTED`** banner showing the exact count of available episodes (e.g., *16 playable episodes detected*).
- You are given a toggle:
  - **Checked (Recommended)**: Automatically unbundles and extracts **all episodes** as individual, sequential broadcast programs in your channel schedule.
  - **Unchecked**: Adds only the primary episode/tape.
- Once dropped, each episode becomes its own scheduled program with its own title and runtime!

---

### 5. Reordering & Managing Program Schedules
Once a channel has multiple programs or episodes:
1. In Channel Studio, click the **`SCHEDULE & PROGRAM EDITOR`** tab.
2. Select your channel from the selector at the top.
3. You will see the entire sequential broadcast queue.
4. **Reorder Programs**: Click the **`▲ UP`** or **`▼ DOWN`** arrows next to any program to change its broadcast order.
5. **Delete Programs**: Click the **`🗑️`** trash button to remove any program from the lineup.
6. **Tune In**: Click **`[TUNE THIS CHANNEL NOW]`** to instantly tune your CRT television to that station and start watching!

---

### 6. 1-Click "Copy URL" & Quick-Add from Search
- **Search Result Cards**: Every search card in the Deep Archive Explorer has a dedicated **`[COPY]`** button that copies the clean `https://archive.org/details/{id}` link to your clipboard, and a **`+ CH`** button that opens Channel Studio with that item pre-loaded.
- **VHS Cassette Drawer**: Every tape in your saved cassette rack has a **`[COPY URL]`** button on the tape spine.

---

## ✨ Key Features

### 1. 📼 VCR Transport Deck & Precision Scrub Bar
- **Interactive Scrubber**: Full-width phosphor timeline directly beneath the CRT screen with green glow progress fill. Hover for exact `HH:MM:SS` tooltips; click or drag anywhere to seek.
- **Transport Controls**: Play, Pause, Rewind (-10s / -60s), Fast Forward (+10s / +60s), Restart from beginning (`[⏮ 00:00]`), and variable playback rates (0.75x to 2.0x).
- **Vacuum Fluorescent Display (VFD)**: Authentic green digital tape counter (`COUNTER [ 00 : 14 : 32 / 01 : 24 : 00 ]`).
- **Web Audio Sound Effects**: Procedural sound generation for relay clicks, TV channel zap, tape cassette insertion, motor rewind whir, and static hiss.

### 2. 🔍 Deep Archive Explorer & Search Matrix
- **Global Search**: Query millions of video items across the Internet Archive database using `mediatype:(movies OR video)`.
- **Filters & Sorting**: Sort by popularity (downloads), date, title, or decade. Filter by duration: Shorts (<15m), TV Episodes (15-45m), or Feature Films (>45m).
- **Curated Vaults**: 1-click access to curated categories: Classic TV, Saturday Cartoons, Sci-Fi & Horror, VHS Vault, Film Noir, Retro Commercials, Computer Chronicles, Prelinger Archives, Silent Films, and Newsreels.
- **VHS Cassette Shelf**: Slide-out tape rack drawer to store and eject bookmarked cassettes.

### 3. 📺 Authentic CRT Shaders & Picture Modes
- **Hardware Shaders**: High-resolution scanline simulation, subtle barrel distortion (curvature), phosphor glow, RGB aperture mask, and power beam collapse animations.
- **Cabinet Styles**: Switch between classic **Woodgrain Console**, **Brushed Aluminum**, or sleek **Retro 80s Charcoal**.
- **Picture Modes**:
  - `COLOR`: Vivid retro color broadcast.
  - `B&W`: Authentic 1950s grayscale.
  - `AMBER`: Warm amber phosphor monitor.
  - `GREEN`: Classic monochrome terminal phosphor.

### 4. 📻 Interactive Antennas & RF Reception
- **Draggable Antennas**: Click and swivel the dual rabbit-ear antennas on the television chassis to alter the analog tuning angle.
- **RF Signal Math**: Off-angle tuning calculates signal degredation, triggering an animated canvas noise layer with procedural white static snow and analog audio crackle.

### 5. 🎮 Handheld Infrared Remote Control
- **Interactive Remote**: Floating 1980s infrared remote control with top red transmitter LED that pulses when buttons are pressed.
- **Keypad Entry**: Number pad with a 2-digit buffer to dial channels directly (e.g. pressing `0` then `4` tunes to Channel 04).
- **Quick Controls**: Volume rocker, mute, power, random channel shuffle, aspect ratio (4:3 / 16:9), and instant shortcuts to TV Guide, Search, Tapes, and Channel Studio.

### 6. 📜 Prevue TV Guide & VHS Tape Shelf
- **Vintage Satellite Matrix**: 1990s Prevue-style blue cable guide listing all broadcast channels, station callsigns, genres, and current programs with live search and category pills.
- **VHS Cassette Shelf**: Pull-out tape rack displaying your bookmarked video cassettes with realistic tape spine labels, runtimes, and direct eject/play levers.

### 7. 🖼️ Box Art Tool & Art Suggestions
Sleeve art is resolved automatically — a curated map first, then Wikipedia, then the item's own Archive.org image. When a programme has no Wikipedia article of its own the lookup **declines rather than guesses**, because a confident wrong portrait is worse than a plain thumbnail. Those fall back to the item image, which always loads but is often only ~180px wide.

Anyone can improve one. Hit the **ART** chip on the sleeve artwork:
- Paste an image URL. It is validated by *actually loading it*, and reports whether it loads, its dimensions, and whether it is too small to upscale cleanly.
- It previews in the real sleeve frame, ambient backdrop and all.
- **Use this here** saves it for your browser only (nothing you do affects other viewers).
- **Copy code line** gives you the exact `CURATED_POSTERS` entry.
- **Suggest for repo** opens a prefilled GitHub issue containing the identifier, URL, measured dimensions and that same line.

---

## 🔬 Under the Hood & Technical Architecture

### Zero Backend Streaming Architecture
ArchiveTV operates **entirely client-side in the user's browser**:
```
User Browser
    │
    ├─► Queries Internet Archive API (https://archive.org/advancedsearch.php)
    ├─► Resolves item metadata & file lists (https://archive.org/metadata/{id})
    └─► Streams video chunk-by-chunk directly (https://archive.org/download/{id}/{file})
```
No proxy servers, no media transcoders, and no backend databases are used.

### Procedural Web Audio Synthesizer
ArchiveTV generates **100% of its analog audio effects procedurally** using the Web Audio API (`AudioContext`):
- **Knob Clicks & Switches**: Micro-second decaying sine waves passed through band-pass filters to create realistic physical plastic and metallic click transients.
- **Channel Zap**: High-frequency frequency-modulation chirps that simulate analog tuner heterodyne whistle when changing frequencies.
- **VCR Motor Whir**: Filtered pink-noise oscillators modulated with LFOs to create the sound of tape transport rollers spinning up.
- **Antenna Static Hiss**: Dynamic white-noise buffer generated mathematically with volume scaled inversely to the antenna signal quality.

### Synchronized Wall-Clock Broadcast Algorithm
When **LIVE AIR** mode is enabled, ArchiveTV calculates what show is currently playing and at what exact second by synchronizing to the user's local wall-clock time:
$$\text{Day Seconds} = \text{Hours} \times 3600 + \text{Minutes} \times 60 + \text{Seconds}$$
$$\text{Channel Runtime} = \sum \text{Program Durations}$$
$$\text{Current Offset} = \text{Day Seconds} \pmod{\text{Channel Runtime}}$$
This creates an authentic broadcast experience where tuning into a channel joins a movie or episode in progress, exactly like real analog television! If you prefer watching from the beginning, simply toggle off `LIVE AIR` or press `Home` / `Backspace` to restart at `00:00`.

### Dual-Engine Playback System
To achieve 100% media compatibility across the Internet Archive:
1. **Direct CRT Engine (Default)**: Plays direct `.mp4`, `.webm`, and `.ogv` files inside an HTML5 video element with custom WebGL/CSS CRT shaders, hardware scanlines, and instant timeline scrubbing.
2. **Tube Embed Engine (Automatic Fallback)**: If an item has no directly playable derivative, the official Archive.org player is rendered inside the retro CRT frame instead.

The embed is a fallback only — there is no manual switch. Because it is a cross-origin iframe its playback position cannot be read, it will not autoplay until clicked, and on a multi-file item it plays the item default rather than the selected episode. The direct engine has none of those limits, so anything that can play directly does.

### Persistent LocalStorage Schema
All user customizations are saved locally in the browser and persist indefinitely across reloads:
| LocalStorage Key | Data Stored |
|---|---|
| `archivetv_custom_channels` | Array of custom channels, callsigns, badges, and program lineups |
| `archivetv_bookmarks` | Array of bookmarked VHS tapes |
| `archivetv_volume` | Volume level (0.0 to 1.0) |
| `archivetv_muted` | Boolean mute status |
| `archivetv_cabinet_style` | Active cabinet finish (`woodgrain`, `aluminum`, `charcoal`) |
| `archivetv_color_mode` | Active picture mode (`color`, `bw`, `amber`, `green`) |
| `archivetv_aspect_ratio` | Video aspect ratio (`4:3`, `16:9`) |
| `archivetv_poster_cache_v8` | Resolved box art per item, so lookups are not repeated. Version-suffixed: bumping it discards automatically-resolved art that turned out wrong |
| `archivetv_poster_overrides_v1` | Box art you chose yourself. Deliberately a separate key, so a cache version bump never discards a human decision |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `◄` / `►` | Skip 10s backward / forward |
| `Shift` + `◄` / `►` | Skip 60s backward / forward |
| `J` / `K` / `L` | Rewind 10s / Play-Pause / Fast Forward 10s |
| `Home` / `Backspace` | Restart Video at Beginning (00:00) |
| `[` / `]` | Previous / Next programme on this channel |
| `Space` | Play / Pause Video |
| `▲` / `▼` | Channel Up / Channel Down |
| `0` – `9` | Direct Channel Number Dialing |
| `U` | Open Channel Studio & Customizer |
| `C` | Cycle Picture Mode (Color / B&W / Amber / Green) |
| `E` | Open Multi-Episode Selector |
| `+` / `-` | Volume Up / Down |
| `M` | Mute / Unmute Audio |
| `P` | Main Power On / Off |
| `G` | Open Prevue TV Guide |
| `S` | Open Deep Archive Search & Explorer |
| `T` | Open VHS Cassette Tape Shelf |
| `R` | Toggle Handheld Infrared Remote |
| `B` | Open Commercial Breaks & Reel Builder |
| `V` | Live (join in progress) / Start everything at 00:00 |
| `A` | Toggle Aspect Ratio (4:3 / 16:9) |
| `F` | Fullscreen the picture (video fills the display) |
| `Shift` + `F` | Fullscreen the whole site (cabinet, deck and all) |
| `H` | Immersive mode (hide the VCR deck) |
| `?` | Show Shortcuts Helper |
| `Esc` | Close whatever panel is on top |

---

## ❓ Frequently Asked Questions (FAQ)

#### Q: Why does a video occasionally take a few seconds to start playing?
**A:** Because ArchiveTV streams directly from the Internet Archive, videos are loaded from the Archive's global non-profit servers. Older or less frequently requested archival reels may take 2–4 seconds to spin up on their CDN before streaming.

#### Q: Are my custom channels and bookmarked tapes private?
**A:** Yes, 100%. All custom stations, program schedules, and bookmarks live solely in your browser's `localStorage`. No data is ever sent to any remote server.

#### Q: Can I run ArchiveTV completely offline?
**A:** The application interface and CRT shaders can run offline, but streaming video playback requires an active internet connection to communicate with Archive.org's servers.

#### Q: Can I share a custom channel with a friend?
**A:** You can copy any Archive.org URL using the 1-click `[COPY]` button and send the link to your friend. They can paste it directly into their Channel Studio to add the exact same show or multi-episode series.

---

## 🚀 Quick Start / Local Setup

You can run ArchiveTV locally using [Bun](https://bun.sh), [Node.js / npm](https://nodejs.org), [pnpm](https://pnpm.io), or [Yarn](https://yarnpkg.com).

### Using Bun (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/SRHSoulja/archivetv.git
cd archivetv

# 2. Install dependencies
bun install

# 3. Start development server
bun run dev
```

### Using npm / Node.js

```bash
# 1. Clone the repository
git clone https://github.com/SRHSoulja/archivetv.git
cd archivetv

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🌐 Deploying Your Own Personal Instance

Because ArchiveTV is a pure static single-page web app with zero backend servers required, it can be deployed for free on any static hosting provider:

### GitHub Pages (Automated via GitHub Actions)
This repository includes a pre-configured GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
1. Fork or push this repository to your GitHub account.
2. In your repo, navigate to **Settings** → **Pages** → **Build and deployment**.
3. Under **Source**, select **GitHub Actions**.
4. Every push to `main` will build and publish your site automatically.

### Vercel / Netlify / Cloudflare Pages
1. Link your GitHub repository to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Set build configuration:
   - **Build Command**: `bun run build` (or `npm run build`)
   - **Output Directory**: `dist`
3. Deploy!

---

## 🤝 Contributing & Adding Default Channels

To add new permanent curated public domain stations to the default dial:
1. Open [`src/data/curatedChannels.json`](src/data/curatedChannels.json).
2. Add a new channel object specifying `number`, `name`, `callsign`, `badge`, `color`, and an array of `programs` with their Archive.org `identifier`, `title`, and `videoUrl`.
3. Alternatively, inspect items using the helper script:
   ```bash
   python3 scripts/build_channels.py
   ```
4. Test locally with `bun run dev` and submit a Pull Request!

### Suggesting Box Art
You do not need to clone anything to fix a bad sleeve. Click the **ART** chip on the artwork, paste a URL, and use **Suggest for repo** — it opens an issue already containing the verified URL and the exact line to add. Accepting one is a single-line paste into [`src/services/posterService.js`](src/services/posterService.js).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
