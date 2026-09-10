# ArchiveTV 📺📼

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-amber.svg?style=flat-square" alt="License: MIT" />
  <img src="https://img.shields.io/badge/React-19-blue.svg?style=flat-square" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-purple.svg?style=flat-square" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-teal.svg?style=flat-square" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" />
</p>

**ArchiveTV** is an open-source, client-side retro CRT television and VCR simulation web application. It acts as an interactive portal and dial tuner into the millions of public domain movies, classic television series, cartoons, tech documentaries, vintage commercials, and historical broadcasts preserved on the **Internet Archive (archive.org)**.

Designed to look, feel, and sound like an authentic analog TV set and hi-fi VCR deck from the 1970s–1990s.

---

## ⚖️ Disclaimer, Fair Use & Architecture Notice

> [!IMPORTANT]
> **ArchiveTV is strictly a client-side frontend portal and media player interface.**
> 
> - **Zero Media Hosted**: ArchiveTV does **NOT** host, store, cache, upload, scrape, or distribute any video, audio, or media files. No video data passes through any third-party server or middleman.
> - **Direct Client-to-Archive Streaming**: All video streams, audio tracks, metadata, and thumbnails are queried and streamed directly from the official [Internet Archive](https://archive.org) servers (`archive.org/download/...` and `archive.org/details/...`) directly within the end-user's browser.
> - **Public Domain & Creative Commons**: Content curated on the default dial is sourced from archival collections designated as public domain, Creative Commons, or open access historical collections (e.g. *Prelinger Archives*, *Classic TV Serials*, *Universal Newsreels*, *Open Source Movies*).
> - **100% Local Storage**: All user preferences, custom channels, bookmarks, and watch history are stored solely in the user's browser `localStorage`. No analytics, telemetry, or user accounts are used.
> - **DMCA & Content Inquiries**: As this project hosts no media files, any copyright takedown requests regarding underlying media items must be directed to the designated agent of the Internet Archive per their [Digital Millennium Copyright Act (DMCA) Policy](https://archive.org/about/dmca.php).

---

## ✨ Features

### 1. 📼 VCR Transport Deck & Precision Scrub Bar
- **Interactive Scrubber**: Full-width phosphor timeline directly beneath the CRT screen with green glow progress fill. Hover for exact `HH:MM:SS` tooltips; click or drag anywhere to seek.
- **Transport Controls**: Play, Pause, Rewind (-10s / -60s), Fast Forward (+10s / +60s), Restart from beginning (`[⏮ 00:00]`), and variable playback rates (0.75x to 2.0x).
- **Vacuum Fluorescent Display (VFD)**: Authentic green digital tape counter (`COUNTER [ 00 : 14 : 32 / 01 : 24 : 00 ]`).
- **Web Audio Sound Effects**: Procedural sound generation for relay clicks, TV channel zap, tape cassette insertion, motor rewind whir, and static hiss.

### 2. 🎛️ Channel Studio & Lineup Customizer
- **Create Custom Channels**: Set custom channel numbers, callsigns (`K-RETRO`, `W-NOIR`), genre badges, and LED accent colors.
- **Drop Archive URL / Tape**: Paste any Internet Archive URL (e.g., `https://archive.org/details/theloneranger_201705`) or bare identifier.
  - **Live Signal Inspection**: Inspects the archive item for metadata, runtimes, formats, and multi-file collections.
  - **Multi-Episode Unbundler**: Automatically detects series with multiple episodes and gives you the choice to add all episodes as a sequential broadcast schedule or as a single tape.
- **Schedule & Program Reordering**: Sequential broadcast queue with ▲ UP / ▼ DOWN reordering and 🗑️ program deletion.
- **1-Click "Copy URL" Everywhere**: Dedicated copy buttons on all search cards, VHS cassette cases, and channel studios to copy the archive URL directly to your clipboard.

### 3. 🔍 Deep Archive Explorer & Search Matrix
- **Global Search**: Query millions of video items across the Internet Archive database using `mediatype:(movies OR video)`.
- **Filters & Sorting**: Sort by popularity (downloads), date, title, or decade. Filter by duration: Shorts (<15m), TV Episodes (15-45m), or Feature Films (>45m).
- **Curated Vaults**: 1-click access to curated categories: Classic TV, Saturday Cartoons, Sci-Fi & Horror, VHS Vault, Film Noir, Retro Commercials, Computer Chronicles, Prelinger Archives, Silent Films, and Newsreels.
- **VHS Cassette Shelf**: Slide-out tape rack drawer to store and eject bookmarked cassettes.

### 4. 📺 Authentic CRT Shaders & Picture Modes
- **Hardware Shaders**: High-resolution scanline simulation, subtle barrel distortion (curvature), phosphor glow, RGB aperture mask, and power beam collapse animations.
- **Cabinet Styles**: Switch between classic **Woodgrain Console**, **Brushed Aluminum**, or sleek **Retro 80s Charcoal**.
- **Picture Modes**:
  - `COLOR`: Vivid retro color broadcast.
  - `B&W`: Authentic 1950s grayscale.
  - `AMBER`: Warm amber phosphor monitor.
  - `GREEN`: Classic monochrome terminal phosphor.
- **Interactive Rabbit Ear Antennas**: Drag or swivel antennas to adjust reception; off-angle tuning synthesizes analog TV static snow and audio noise.
- **Universal Dual-Engine Playback**: Switch between direct HTML5 CRT rendering (with full shaders) and official Archive.org iframe Tube Embed for 100% media compatibility.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `◄` / `►` | Skip 10s backward / forward |
| `Shift` + `◄` / `►` | Skip 60s backward / forward |
| `J` / `K` / `L` | Rewind 10s / Play-Pause / Fast Forward 10s |
| `Home` / `Backspace` | Restart Video at Beginning (00:00) |
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
| `A` | Toggle Aspect Ratio (4:3 / 16:9) |
| `F` | Toggle Fullscreen |
| `?` | Show Shortcuts Helper |

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

Because ArchiveTV is a pure static single-page web app with zero backend servers required, it can be deployed for free in under 60 seconds on any static hosting provider:

### Vercel / Netlify / Cloudflare Pages
1. Fork or push this repository to your GitHub account.
2. Link the repository on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Set build configuration:
   - **Build Command**: `bun run build` (or `npm run build`)
   - **Output Directory**: `dist`
4. Deploy!

### GitHub Pages
Run the build script and publish the `dist/` directory directly to GitHub Pages via GitHub Actions or the `gh-pages` branch.

---

## 🤝 Contributing

Contributions, bug reports, retro styling tweaks, and new curated public domain channels are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/CoolRetroFeature`)
3. Commit your Changes (`git commit -m 'Add some CoolRetroFeature'`)
4. Push to the Branch (`git push origin feature/CoolRetroFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
