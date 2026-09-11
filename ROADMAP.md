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
- [x] Autoplay-blocked recovery undid itself in the same tick — the effect reset
      `video.muted = false` and cleared the flag before paint, so the
      "click to unmute" prompt never appeared and there was no recovery path
- [x] A break made the programme play twice: the resumed programme was restored as
      an explicit programme, so its ending fell through to the base programme at
      `seekSeconds: 0` instead of advancing
- [x] Stale `targetChannelId` after a channel delete — adds silently no-op'd behind
      a success banner
- [x] Curated channel ids leaked into `customChannels`-only lookups: `EDIT (n)` on a
      shipped channel loaded a *different* channel, and Move Up / Remove then
      operated on it. The editor, both TARGET DIAL pickers and the selection now
      resolve against the whole dial, and forking happens on the first change
- [x] The edit pencil forked a shipped channel on open and CANCEL did not undo it;
      the fork now happens on save
- [x] Share links minted a fresh id, so opening the same link twice duplicated the
      channel. The id is now carried in the link (older links hash their own
      contents), and a shared copy steps off any dial number already in use
- [x] Search LENGTH filter was a no-op — `duration` was never requested or mapped,
      and the guard passed every item through. Length now comes from `runtime` /
      `duration` / `length` (three fields, three formats), the search requires one
      to be present so the filter does not return an empty page, and every result
      shows its length
- [x] Remote digit entry tuned twice — the keypress and the debounce both fired.
      Measured at two zap flashes per entry before, one after
- [x] `pendingResumeRef` was last in the seek chain and unreachable, because
      `seekSeconds` is set for every live slot and every post-break resume. It is
      checked first now — it is cleared on programme change, so a value in it
      always means the viewer was on this exact programme moments ago
- [x] `playbackRate` multiplied the whole span since the anchor, so switching rate
      mid-programme jumped the embed counter. The embed clock no longer scales at
      all — archive.org's iframe has no rate API and always plays at 1x — and the
      speed control is disabled there rather than reporting a speed that is a lie
- [x] A failed search left the previous results rendered under the error banner
- [x] Nothing in the UI could switch players. Once a programme fell back to the
      Tube embed there was no way back to the direct player, so the whole
      CRT↔Embed handoff was machinery with no switch attached. The VCR deck now
      carries a DIRECT / TUBE control, disabled with an explanation when the
      tape has no stream the browser can decode

## Phase 2 — Reach

Quality-of-life. The app currently punishes anyone not on a wide desktop with a mouse.

- [x] **Escape closes modals, and hotkeys stop firing through them.** Arrow keys
      used to change channel behind an open tape rack, `p` powered the set off and
      `t` closed the rack you were reading
- [x] BREAKS was unreachable below 640px — one entry point, `hidden sm:flex`, no
      hotkey. It keeps its place at every width now and answers to `B`
- [x] Navbar zoom ladder stopped at 1050px and then clipped silently under
      `overflow-x-hidden`. Measured: up to 7 of 12 controls cut off between 640px
      and 950px, and 6 removed outright below 640px. The bar wraps now and sheds
      only its labels — 12 of 12 visible, 0 clipped, from 1600px down to 390px
- [x] The sleeve vanished with no fallback below ~1280px — every laptop, tablet
      and phone — taking the synopsis, rename and the ART tool with it. It
      becomes a NOW PLAYING tab that opens the same card over the screen, and
      that panel joins the Escape stack like every other
- [x] `select-none` on `<body>` made the whole app uncopyable — including the
      archive.org identifiers it constantly asks you to paste around. Gone from
      the body; text-bearing elements opt back in, the chrome stays undraggable
- [x] Dialog semantics: no `role="dialog"`, no focus trap, no focus restore, seven
      unnamed close buttons, and ten `focus:outline-none` with nothing put back.
      All nine panels now carry role, `aria-modal` and a name, share one focus
      hook, and there is a visible focus ring again. Escape also works from
      inside a text field, which it did not — so the search panel, the one you
      type in most, had no keyboard way out
- [x] Hint text at `zinc-500`/`zinc-600` failed contrast on the dark ground —
      measured 2.3–2.5:1 for zinc-600 and 3.7–4.0:1 for zinc-500 against the four
      panel grounds, where small text needs 4.5:1. Prose moved to zinc-400 (7:1+);
      icons, separators and disabled states left alone. Zero failures across the
      main screen, tapes, channels, breaks, guide and picture
- [ ] Tape drag-reorder is mouse-only and hidden behind the sixth option of a
      dropdown; needs touch support and a visible grip
- [x] Hotkey list omitted `?`, `Esc` and `Shift+F`, and described `F` wrongly —
      it fullscreens the picture, not the site

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
- [ ] Broadcast ritual. Researched separately; recorded below because half of it
      is already built and the rest needs to dodge some well-worn myths

### Broadcast ritual — what exists, what's missing, what to avoid

**Already built.** `calculateLiveTvSlot` is a genuine wall-clock scheduler: it
derives the slot from `Date.now()`, returns `seekSeconds` so you join a programme
already in progress, and offsets each channel by its number so they are not in
lockstep. Those were the top two recommendations of the research, and they are
done. The real gap is that `liveTvMode` defaults to `false`, so the most
broadcast-feeling behaviour in the app is opt-in and largely undiscovered.

- [ ] Consider live TV as the default, or a first-run choice between
      "join in progress" and "start from the beginning"
- [ ] Dayparting against real hours. The schedule currently loops continuously
      with no notion of morning, primetime or late night
- [ ] Sign-on/sign-off, with the 15–20 minute test-pattern pre-roll that preceded
      sign-on. FCC § 73.1740 explicitly treats patterns and slides as *not*
      broadcasting — the regulator formalised the "transmitter on, nothing
      happening" state this app wants to portray
- [ ] Top-of-hour station ID
- [ ] Late-night texture drift — ad character changes as the night wears on. The
      August 1984 Commercial TV Deregulation Order (98 F.C.C.2d 1075) removed the
      per-hour ad ceiling and the public-affairs obligation at a stroke, which is
      the hinge between "channel signs off" and "infomercials until dawn"

**Researched and deliberately not building:**

- **EBS two-tone alert.** Anachronistic before 1976, and the FCC's own 1994 order
  documents that weekly testing desensitised the public — which is exactly what
  would happen to anyone using this
- **Clock idents.** Exceptionally rare in American television; a US-set simulation
  should not have one
- **"There is nothing wrong with your television set."** That is *The Outer
  Limits*, not a real broadcast caption
- **UK breakdown captions and US technical-difficulties audio.** Unsourced
  folklore with no archival record. If we want that beat, design it fresh rather
  than reproducing something that never existed
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
