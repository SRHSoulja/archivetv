# ArchiveTV — build plan

Working document. Every item below is either confirmed in the codebase or reported
by review; nothing here is aspirational hand-waving. Status markers are honest:
`[x]` means done **and verified**, `[ ]` means not started.

---

## The principle this hangs on

ArchiveTV is **not a television emulator**. It is a modern portal that gives nods
to retro and carries the feeling of it. We cannot materialise a real set, and
trying to would make the thing worse.

Three consequences, applied as a filter to every item below:

1. **Every effect makes the picture worse on purpose.** There is a ceiling where
   nostalgia becomes "why is this blurry". The CLEAN PICTURE escape hatch matters
   more with each artefact added.
2. **Period-correct never beats usable.** A 1978 set had no Escape key; this is a
   web page and Escape must close things. Diegetic where it delights, modern
   where it would otherwise frustrate.
3. **Sentiment is in the small moments.** A tape sliding into a deck is worth more
   than a fourth scanline profile.

---

## Phase 1 — Correctness

Things that are broken. No character work lands well on a buggy base.

- [x] Restart/rewind was infinite mutual recursion — `Maximum call stack size
      exceeded` on Backspace, Home, remote rewind, deck rewind and START
- [x] `_onEngineChange` typo dropped the prop, burying a working embed under 85%
      static plus an audio hiss until channel change
- [x] Three stale-closure filter sites an earlier fix missed — first collection
      click searched unfiltered
- [x] Episode picker: "NONE" meant "add all", and the guard for it was unreachable
- [x] Shelf reordering on one channel silently wiped every other channel's order
- [x] Commercials needing a click / never returning — 5 of 37 spots in the sample
      reel are `.AVI`; unplayable spots are now filtered out, and a spot that
      fails mid-break skips itself
- [x] Spot lengths were in the data but never rendered
- [ ] Autoplay-blocked recovery undoes itself in the same tick — the effect resets
      `video.muted = false` and clears the flag before paint, so the
      "click to unmute" prompt never appears and there is no recovery path
- [ ] A break makes the programme play twice: the resumed programme is restored as
      an explicit programme, so its ending falls through to the base programme at
      `seekSeconds: 0` instead of advancing. Also unpins live TV permanently
- [ ] Stale `targetChannelId` after a channel delete — adds silently no-op behind
      a success banner
- [ ] Curated channel ids leak into `customChannels`-only lookups: `EDIT (n)` on a
      shipped channel can load a *different* channel, and Move Up / Remove then
      operate on it
- [ ] The edit pencil forks a shipped channel on open; CANCEL does not undo it
- [ ] Share links mint a fresh id, so opening the same link twice duplicates the channel
- [ ] Search LENGTH filter is a no-op — `duration` is never requested or mapped
- [ ] Remote digit entry tunes twice (immediate call plus the debounce timer)
- [ ] `pendingResumeRef` is last in the seek chain and usually unreachable, because
      `seekSeconds` is set for every live slot and every post-break resume
- [ ] `playbackRate` multiplies the whole span since the anchor, so switching rate
      mid-programme jumps the embed counter
- [ ] Failed search leaves the previous results rendered under the error banner

## Phase 2 — Reach

Quality-of-life. The app currently punishes anyone not on a wide desktop with a mouse.

- [ ] **Escape closes modals, and hotkeys stop firing through them.** Today arrow
      keys change channel behind an open tape rack, `p` powers the set off and `t`
      closes the rack you are reading. One shared fix
- [ ] BREAKS is unreachable below 640px — one entry point, `hidden sm:flex`, no
      hotkey, no remote or cabinet button
- [ ] Navbar zoom ladder stops at 1050px and then clips silently under
      `overflow-x-hidden`; roughly 950px→640px loses the right-hand cluster
- [ ] The sleeve vanishes with no fallback, taking rename and the ART tool with it.
      The remote already has a corner fallback; the sleeve should too
- [ ] `select-none` on `<body>` makes the whole app uncopyable — including the
      archive.org identifiers it constantly asks you to paste around
- [ ] Dialog semantics: no `role="dialog"`, no focus trap, no focus restore, seven
      unnamed close buttons, and ten `focus:outline-none` with nothing put back
- [ ] Hint text at `zinc-500`/`zinc-600` fails contrast on the dark ground — the
      most instructional copy in the app is the least legible
- [ ] Tape drag-reorder is mouse-only and hidden behind the sixth option of a
      dropdown; needs touch support and a visible grip
- [ ] Hotkey list omits `?` and `Shift+F` and describes `F` wrongly

## Phase 3 — Coherence

- [ ] Two modal design systems built hours apart. Adopt the newer one's close
      button, real `<h3>`, `aria-label` and backdrop dismissal everywhere
- [ ] One feature, four names (CHANNELS / CHANNEL STUDIO / ANALOG BROADCAST STUDIO
      / Channel Studio & Lineup Customizer). Same for Search and Guide
- [ ] Two overlapping search surfaces — the Studio has a search tab that duplicates
      the standalone modal, which has a button back into the Studio
- [ ] Icon reuse: `Radio` serves six functions, `Sliders` two, twice in the same row
- [ ] Navbar is twelve equal peers with colour used for identity rather than status.
      About/Hotkeys already exist in the footer and are pure duplication up top

## Phase 4 — Performance

- [ ] `getCustomTitle` does a localStorage read + `JSON.parse` inside a sort
      comparator, and the memo is defeated by new array identities each render
- [ ] Poster lookups never cache misses — every mount re-runs up to seven Wikipedia
      requests for items that have no article
- [ ] Poster batch is capped at 8 and never re-runs, so items 9+ never get art
- [ ] `isBookmarked` re-parses localStorage per result card per render
- [ ] `embedTime` state is written 4×/s and read nowhere in JSX
- [ ] `getCustomChannels` can write to localStorage during render-phase init
- [ ] No `AbortController` on the metadata/uploader/description fetches
- [ ] localStorage quota recovery purges `sessionStorage` — a different storage area

## Phase 5 — Character

The reason the thing exists. Ordered by sentiment per unit of effort.

- [ ] **Tape insert animation.** A cassette sliding into the deck when you load a
      tape, with the mechanical clunk already synthesised in `soundEffects`.
      Era-aware: cassette on the 70s/80s cabinets, a disc tray on the 90s portable
- [ ] **Head-switching noise** — the torn band at the very bottom of a VHS frame.
      Highest nostalgia-per-line in the whole list
- [ ] **Browsable shelf.** Move from a grid to something you move *through* —
      spines you flip past, pulling a tape out to read the back. The shelf styling
      already exists; this is the interaction layer on top
- [ ] Ghosting / multipath — a faint offset double image, sells "aerial" better
      than snow does
- [ ] Chroma bleed — colour smearing past edges, why red titles glowed on tape
- [ ] Channel-change banner — the most-seen piece of cable-era TV furniture
- [ ] Digital-era failure mode: macroblocking and frozen frames rather than snow,
      for the 90s/2000s cabinets. Digital *fails*, it does not degrade
- [ ] Broadcast ritual — sign-off, test patterns, station idents
- [ ] Reel parity with channels: spot reordering, import/export, share links

---

## Not doing, and why

- **Literal CRT emulation via WebGL shaders.** Cost is high, the CSS profiles
  already read well, and it deepens the "worse on purpose" problem
- **Natural break detection.** Real scene/silence detection on arbitrary
  archive.org video is not tractable here. Timed with jitter is honest and works
- **Per-episode box art.** Deferred by preference; the art path resolves from the
  item title and would need rework
- **TMDB or any keyed API.** Would require a proxy, trading away the zero-backend
  property the project is built on

## Known-imperfect, stated plainly

- Episode counts are wrong on films with multiple cuts — counts `availableFiles`,
  and only derivatives of one file collapse
- Channels built before the fix keep fabricated "Episode N" descriptions; those are
  baked into stored data, not generated at render
- ~15 obscure shorts still fall back to small archive.org thumbnails. The ART tool
  is the practical route
- The custom shelf arrangement is one global list, not one per channel
