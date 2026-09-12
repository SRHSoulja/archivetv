# ArchiveTV — User Guide

**[📺 Open ArchiveTV »](https://srhsoulja.github.io/archivetv/)**

A television set pointed at the Internet Archive. Twelve channels of public-domain
film, cartoons, newsreels and broadcast, plus whatever else you care to add.

Everything lives in your own browser. There is no account, no server and nothing
to sign up for — which also means your channels, tapes and settings are stored on
the machine you are using and do not follow you to another one. See
[Where your stuff is kept](#where-your-stuff-is-kept).

---

## Contents

- [Switching on](#switching-on)
- [Watching](#watching)
- [Episodes and series](#episodes-and-series)
- [The TV Guide](#the-tv-guide)
- [Your tape shelf](#your-tape-shelf)
- [Turning tapes into a channel](#turning-tapes-into-a-channel)
- [Building channels](#building-channels)
- [Sharing channels](#sharing-channels)
- [Commercial breaks](#commercial-breaks)
- [The picture](#the-picture)
- [Two players: DIRECT and TUBE](#two-players-direct-and-tube)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Fixing box art](#fixing-box-art)
- [Where your stuff is kept](#where-your-stuff-is-kept)
- [Troubleshooting](#troubleshooting)
- [What it deliberately cannot do](#what-it-deliberately-cannot-do)

---

## Switching on

The first thing you see is a card asking you to switch the set on. That is not
decoration: browsers keep a page silent until you interact with it, so the
picture starts muted and something has to ask for a click.

On a **first visit** the same card asks the one question worth asking:

| Choice | What it means |
|---|---|
| **LIVE — JOIN IN PROGRESS** | Every channel runs to the wall clock whether you are watching or not, so you arrive partway into whatever is on. Like switching on a television. |
| **START FROM THE BEGINNING** | Every programme starts at 00:00. Better if you came to watch one particular thing. |

Your answer is remembered. Change it whenever you like — it is on the remote, at
the top of the TV Guide, and on the <kbd>V</kbd> key.

On later visits the card is just the switch. Anything else you click will turn
the sound on too. Browsers stop blocking autoplay once you have used a site
enough, so the card gradually stops appearing.

---

## Watching

| Control | Where |
|---|---|
| Change channel | <kbd>↑</kbd> <kbd>↓</kbd>, the dial on the cabinet, or **CH−/CH+** |
| Tune directly | Type the channel number, e.g. <kbd>0</kbd><kbd>4</kbd> |
| Play / pause | <kbd>Space</kbd> or <kbd>K</kbd> |
| Skip | <kbd>←</kbd> <kbd>→</kbd> for 10s, <kbd>Shift</kbd>+arrows for 60s |
| Start over | <kbd>Home</kbd> or <kbd>Backspace</kbd> |
| Volume | <kbd>+</kbd> <kbd>−</kbd>, <kbd>M</kbd> to mute |
| Fullscreen the picture | <kbd>F</kbd>, or the ⤢ button that appears when you hover the screen |
| Fullscreen the whole set | <kbd>Shift</kbd>+<kbd>F</kbd> |
| Hide the controls | <kbd>H</kbd> — immersive mode |

The **VCR deck** under the screen has a drag-to-scrub bar with a hover preview,
a bookmark button, and a speed control.

The panel on the left is **NOW PLAYING** — cover art, title, year, runtime and a
synopsis. Click the pencil to rename a programme for yourself. On narrower
screens it collapses to a **NOW PLAYING** tab at the bottom-left that opens the
same panel.

---

## Episodes and series

Many archive.org items are a whole series in one upload. When the item you are
watching has more than one video file, the deck shows an **EPISODES (n)** button
(<kbd>E</kbd>). Pick any episode from the list; the title, synopsis and the TV
Guide all follow.

Two things worth knowing, because they are properties of the source material
rather than the app:

- **"Ep. 1–10" in a title does not mean ten files.** Plenty of uploads are one
  long video containing all ten. If an item has a single file, there is nothing
  to split and no episode list appears.
- **Episode counts in search results are file counts.** A search card reads
  `📦 82 FILES`, which includes artwork, subtitle tracks and alternate
  encodings. The real episode count only appears once you open the item, because
  that is the first point at which the actual file list is known.

---

## The TV Guide

<kbd>G</kbd>, or **GUIDE** in the top bar. Every channel with what is on now and
what is next, filterable by genre or search.

What it shows depends on your watch mode:

- The channel **you are on** shows the programme you are actually watching.
- **Other channels** show their wall-clock slot when live mode is on — genuinely
  what would be playing if you tuned over — or their first programme when it is
  off, since that is where tuning in would start you.

An `EP 7 OF 16` label appears only where the programmes really are episodes of
one series. A channel of unrelated films does not get one, because numbering
*McLintock!* as episode four of four would be nonsense.

---

## Your tape shelf

<kbd>T</kbd>, or **TAPES**. Two tabs: the tapes on the current channel, and
**MY BOOKMARKS** — everything you have saved.

Bookmark anything with the ribbon on the VCR deck or the star in search.

**Two views:**

- **BOX ART** — covers facing out on wooden shelves, video-store style.
- **CASSETTES** — the tapes themselves, labels and all.

**Sorting:** the `ORDER` dropdown offers as-listed, title A–Z or Z–A, and year
newest or oldest. Press **ARRANGE** to order them by hand — each tape grows a
grip you can drag, by mouse or by finger. The arrangement is saved.

**Per-tape** — click the ⓘ on any tape for its detail sheet:

| Action | What it does |
|---|---|
| **Rename** | Your own label for that tape. Only you see it. |
| **Year** | Correct a wrong date. Sorting uses yours. |
| **COPY LINK** | Copies the archive.org address, for pasting anywhere |
| **CHANGE BOX ART** | See [Fixing box art](#fixing-box-art) |
| **PUT THIS TAPE ON A CHANNEL** | See below |

---

## Turning tapes into a channel

Your shelf is where your deliberate choices are, so it can feed the dial
directly.

- **One tape:** open its ⓘ sheet, pick a channel from **PUT THIS TAPE ON A
  CHANNEL**, press **ADD**. Choose `+ NEW CHANNEL` to start a fresh one.
- **The whole shelf:** on the MY BOOKMARKS tab, press **MAKE A CHANNEL (n)**.
  Every tape on the shelf becomes a channel, in the order you arranged them.

Adding to a channel that ships with the app makes your own editable copy of it
first. The original is kept, and deleting your copy restores it.

---

## Building channels

<kbd>U</kbd>, or **CHANNELS**. Four tabs.

### CHANNEL LINEUP
Every channel on the dial, yours and the built-in ones alike. Per channel:
**TUNE IN**, **+ SEARCH**, **EDIT (n)**, share, export, rename (✎), delete.

**Every channel is editable**, including the ones that ship with the app. The
first change you make forks it into your own copy; the pencil does *not* fork on
open, so opening the rename form and cancelling leaves nothing behind. Deleting a
forked channel restores the original.

### SEARCH ARCHIVE & ADD SHOWS
Search archive.org and add results to a channel. Filters for collection, decade,
uploader/creator and length.

> **A note on LENGTH:** archive.org states a running time for roughly one item in
> twenty, in three different fields and three different formats. Filtering by
> length therefore searches only the items that state one — a smaller pool, but
> every result genuinely matches. The panel says so when the filter is on.

Click an uploader's name to see everything they have posted; the **ALL** button
drops your keywords and shows their whole catalogue.

### DROP ARCHIVE URL / TAPE
Paste any archive.org URL or bare identifier. The app resolves the item, shows
what is inside, and lets you pick which episodes to add.

### SCHEDULE & PROGRAM EDITOR
Reorder a channel's run order, remove programmes, jump to search or URL entry.

---

## Sharing channels

**Share** (🔗) on any channel copies a link containing the whole line-up. Anyone
who opens it gets the channel on their dial.

Opening the same link twice **updates** that channel rather than adding a second
copy, and a shared channel steps off a dial number that is already taken.

**Export** (⬇) downloads the channel as JSON; the lineup tab can import it back.

---

## Commercial breaks

<kbd>B</kbd>, or **BREAKS**. Off by default.

A **reel** is a playlist of spots that interrupts programmes. Nothing ships with
the app — you bring your own, which keeps the project clear of anything it has no
right to redistribute.

**Building a reel:** search archive.org from inside the panel, or paste an
identifier. Compilations of vintage adverts usually break down into one file per
spot, and you add the ones you want. Reels can be renamed, and spots reordered,
removed, or shared.

**Settings:**

| Setting | Notes |
|---|---|
| **ROUGHLY EVERY** | Minutes between breaks — jittered by ±20%, because a break exactly every twelve minutes reads as a spreadsheet |
| **SPOTS PER BREAK** | How many adverts run at once |
| **Per channel** | Any channel can use a different reel, or opt out |

Breaks never interrupt a programme shorter than 10 minutes, and never within 90
seconds of either end. Skipping a break is always allowed. **PLAY A BREAK NOW**
lets you test one without waiting.

Reels can be exported, imported and shared by link, exactly like channels.

> Breaks only run on the DIRECT player. The Tube embed's position cannot be read
> from outside it, so a programme interrupted there could not be resumed in the
> right place.

---

## The picture

**Cabinet style** (top bar) changes the set itself, and each era behaves
differently — not just cosmetically:

| Cabinet | Character |
|---|---|
| **70s Woodgrain** | Aerial and a deck. Head-switching tear along the bottom of the frame, ghosting on a weak signal, chroma bleed, the set's own on-screen display |
| **80s Trinitron** | As above, plus an aperture-grille mask |
| **90s Portable** | A cable box on top: a channel banner instead of the OSD, and digital breakup — blocks, not snow — when the signal is poor |
| **Pure CRT Glass** | Bare tube. No cabinet, no aerial, no furniture |

**PICTURE** (the sliders icon) controls scanlines, curvature, era tinting,
brightness, contrast and phosphor colour (colour, B&W, amber, green).

Two presets: **CLEAN PICTURE** strips every effect — useful when you actually
want to see the film — and **FULL CRT** puts them all back.

**Antennas** on the cabinet can be dragged. Misaligning them degrades reception,
which is where ghosting, snow or digital blocks come from. Click the signal
readout to recalibrate. The **FINE TUNE** knob controls tracking; pushing it off
centre widens the head-switching tear, which is exactly what it did in life.

---

## Two players: DIRECT and TUBE

The button on the VCR deck switches between them.

| | DIRECT | TUBE |
|---|---|---|
| Player | The app's own | archive.org's embedded player |
| Scrubbing | Exact | Reloads at the new position |
| Playback speed | Yes | No — the iframe has no speed control |
| Position | Read from the video | Estimated from a wall-clock anchor |
| Commercial breaks | Yes | No |

DIRECT is better in every way that matters, and is used whenever possible. The
Tube embed exists because it plays formats a browser cannot decode natively. If
a tape has no stream the browser can handle, the app falls back automatically and
the switch is disabled with an explanation.

Switching either way keeps your place.

---

## Keyboard shortcuts

Press <kbd>?</kbd> in the app for this list at any time.

| Key | Action |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> | Channel up / down |
| <kbd>←</kbd> <kbd>→</kbd> | Skip 10 seconds |
| <kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd> | Skip 60 seconds |
| <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> | Rewind 10s / play-pause / forward 10s |
| <kbd>Space</kbd> | Play / pause |
| <kbd>Home</kbd> <kbd>Backspace</kbd> | Restart the programme |
| <kbd>0</kbd>–<kbd>9</kbd> | Tune to a channel number |
| <kbd>+</kbd> <kbd>−</kbd> | Volume |
| <kbd>M</kbd> | Mute |
| <kbd>P</kbd> | Power |
| <kbd>C</kbd> | Cycle phosphor colour |
| <kbd>A</kbd> | Cycle aspect ratio |
| <kbd>E</kbd> | Episode picker |
| <kbd>G</kbd> | TV Guide |
| <kbd>S</kbd> | Search |
| <kbd>T</kbd> | Tape shelf |
| <kbd>U</kbd> | Channel Studio |
| <kbd>B</kbd> | Commercial breaks |
| <kbd>R</kbd> | Remote |
| <kbd>V</kbd> | Live / start-from-the-beginning |
| <kbd>F</kbd> | Fullscreen the picture |
| <kbd>Shift</kbd> + <kbd>F</kbd> | Fullscreen the whole site |
| <kbd>H</kbd> | Immersive mode |
| <kbd>?</kbd> | This list |
| <kbd>Esc</kbd> | Close whatever panel is on top |

---

## Fixing box art

Some obscure items have no poster and fall back to a small archive.org
thumbnail. Any tape's **ART** tool lets you paste a better image URL, preview it,
and keep it.

If the art is good enough that everyone should have it, **SUGGEST FOR REPO**
opens a pre-filled GitHub issue with the identifier and the URL. Wikimedia
Commons links are preferred — they are stable, whereas many other hosts rotate
their paths.

Your own overrides are yours alone and need no approval.

---

## Where your stuff is kept

Everything is in your browser's local storage on the machine you are using:

| What | Survives a refresh | Follows you to another device |
|---|---|---|
| Custom channels, bookmarks, reels | Yes | No |
| Renames, dates, box art overrides, shelf order | Yes | No |
| Picture settings, cabinet, volume, watch mode | Yes | No |

Clearing site data erases all of it. **Export your channels and reels to JSON if
you care about them**, and use share links to move a channel between devices.

---

## Troubleshooting

**No sound.** The browser muted the page until you interacted with it. Click
anything, or press the switch on the card. <kbd>M</kbd> toggles mute separately.

**A video takes a few seconds to start.** archive.org streams directly to you
with no CDN in front of it, and older or rarer items can be slow to spin up.

**A tape needs PLAY pressed, or will not play at all.** Some uploads are in
formats a browser cannot decode (`.avi`, `.mkv`, `.wmv`). The app falls back to
archive.org's embedded player, which requires a click to start.

**Nothing changed after an update.** Hard-refresh
(<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>). GitHub Pages
caches aggressively.

**A channel shows colour bars.** That channel has nothing playable on it — the
test pattern is what an off-air channel shows.

---

## What it deliberately cannot do

Stated plainly so nobody wastes time asking:

- **Per-episode cover art.** archive.org stores one image per *item*, so every
  episode of a series shares it. Grabbing a frame from the video is blocked by
  the browser: the CDN the download redirect lands on sends no CORS header, so
  the video cannot be loaded for capture, and a plain load taints the canvas.
  Episode stills exist on TMDB, which needs an API key, which needs a server.
- **Reading the Tube embed's exact position.** It is a cross-origin iframe that
  emits nothing to the page. Position there is dead-reckoned from a wall-clock
  anchor.
- **Dayparting, or late-night advert drift.** Both need a genre or character tag
  per item that neither the line-up nor archive.org supplies. Sorting by time of
  day at random would be arbitrariness dressed up as a schedule.
- **Anything requiring an account or a server.** The zero-backend property is
  deliberate: it is why the whole thing runs from a static page and why your data
  never leaves your machine.

---

## Contributing

Issues and pull requests are welcome at
[github.com/SRHSoulja/archivetv](https://github.com/SRHSoulja/archivetv).
Box-art suggestions are the easiest way in — the ART tool writes the issue for
you.

ArchiveTV streams public-domain material directly from archive.org and hosts no
media itself. See the README for the full fair-use and architecture notice.
