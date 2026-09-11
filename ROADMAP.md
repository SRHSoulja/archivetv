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
- [x] Tape drag-reorder was mouse-only — HTML5 drag-and-drop does not fire on a
      touch screen — and hidden behind the sixth option of a dropdown. Rebuilt on
      pointer events with a visible grip and an ARRANGE button; verified by touch
      on a tablet and by mouse, including that the new order persists
- [x] Hotkey list omitted `?`, `Esc` and `Shift+F`, and described `F` wrongly —
      it fullscreens the picture, not the site

## Phase 3 — Coherence

- [x] Two modal design systems built hours apart. The newer one's conventions are
      everywhere now: real headings, named close buttons, `role="dialog"` with a
      name, and backdrop dismissal on the six panels that lacked it — with the
      panel itself swallowing the click so working inside one does not close it
- [x] One feature, four names. It is CHANNEL STUDIO everywhere now: the modal
      header, every tooltip, every entry point
- [x] Looked at and deliberately kept. They are not duplicates: the standalone
      search finds something to *watch now* (play, bookmark, or hand off), while
      the Studio's tab finds something to *add to a line-up*. Their labels
      already say so — "SEARCH ARCHIVE & ADD SHOWS" against "DEEP ARCHIVE
      SEARCH". Merging them would cost a working distinction to fix a naming
      impression
- [x] Icon reuse: `Sliders` meant both Picture and Channel Studio, twice in the
      same navbar row. `Sliders` is Picture alone now, the Studio has `ListVideo`
      at all four of its entry points and on its own header, and BREAKS has
      `Megaphone` rather than a third `Radio`. `Radio` is left where it means an
      actual signal — tuning, LIVE AIR, receiving
- [x] Navbar was twelve equal peers. Hotkeys and About were pure duplication of
      the footer, so they are gone from it; the repo link joined them down there
      rather than being dropped. Nine controls now, split by a rule into the five
      that open something and the four that describe the set. Still 9 of 9
      visible with zero overflow from 1600px to 390px

## Phase 4 — Performance

- [x] `getCustomTitle` fell through to a localStorage read + `JSON.parse` for
      every item without a custom label, including inside a sort comparator. The
      bookmark list it reads is held in memory now and invalidated on write
- [x] Poster lookups never cached misses — measured at 28 Wikipedia requests for
      a four-tape shelf, seven per item, repeated on every open. A settled miss
      is remembered for a week (a network failure is not recorded as one). Same
      shelf, second open: 1 request
- [x] Poster batch was capped at 8 and never re-ran, so the ninth tape onwards
      never got art. It still goes eight at a time, but it now goes all the way
- [x] `isBookmarked` re-parsed localStorage per result card per render. Measured
      over one 24-result search: 26 reads before, 0 after
- [x] `embedTime` state was written 4×/s and read nowhere in JSX — it re-rendered
      the whole screen four times a second to update a value only a ref needed
- [x] `getCustomChannels` could write to localStorage during render-phase init;
      the migration write is deferred out of render now
- [x] No `AbortController` on the metadata/uploader/description fetches, and the
      uploader and the synopsis each pulled the same document separately. One
      shared fetch now, deduplicated in flight, cached after, abandoned at 12s
- [x] localStorage quota recovery purged `sessionStorage` — a different storage
      area with its own budget, so the retry was certain to fail the same way.
      It drops the rebuildable poster cache from localStorage first now
- [x] Found while measuring: the saved picture settings were read and parsed by
      an IIFE in App's component body, so the root component re-read the blob on
      every render — eight times during boot, twice more per interaction

## Phase 5 — Character

The reason the thing exists. Ordered by sentiment per unit of effort.

- [x] **Tape insert animation.** A cassette drawn into the deck when you load a
      tape; a disc tray on the later sets. The clunk was *not* already in
      `soundEffects` as this plan claimed — `playKnobClick` is a rotary knob —
      so the load sounds were written: motor, carriage seating, head drum
      spinning up for VHS, and a quieter tray/latch/spindle for the disc era.
      It fires only on a deliberate load, never on a channel change
- [x] **Head-switching noise** — the torn band at the very bottom of a VHS frame.
      Only on the cabinets you would have plugged a deck into, and it rides the
      fine-tune dial: 3% of frame at rest, 8% and near-opaque once the tracking
      is knocked out. Follows the scanline switch, so CLEAN PICTURE removes it
- [~] **Browsable shelf.** Built as a spines-out view, then removed at the
      user's direction — correctly. The forward-facing BOX ART mode already *was*
      the video-store shelving originally asked for: rows of covers standing on
      wooden boards with contact shadows and a seeded lean. Spines were a third
      mode that traded readability and a close affordance for a little width.
      Two real faults in it, both mine: the titles ran vertically at 8–11px and
      were hard to read, and a second click on a pulled tape *opened* it when it
      should have pushed it back — the same gesture meaning two different things.
      Recoverable from git if it is ever wanted as an option
- [x] Ghosting / multipath — a faint offset double image on a weak aerial, which
      is what reception actually looked like day to day; snow was the extreme
- [x] Chroma bleed — colour smearing past its edges, why red titles glowed on
      tape. Kept very low: this is the effect most likely to read as "why is
      this blurry". Skipped entirely when the picture is not in colour
- [x] Channel-change banner — the lower third a cable box drew: coloured number
      block, callsign, what is on. It renders *instead of* the analogue OSD, not
      beside it, because no television ever had both
- [x] Digital-era failure: macroblocking and frozen frames rather than snow. The
      picture stays visible and breaks into blocks, which is what digital
      actually did. The signal term is dropped from the snow on that set, so it
      is blocks *instead of* snow rather than both at once
- [x] Broadcast ritual. Researched separately and recorded below. More of it was
      already built than the research assumed, two items turned out to be blocked
      on data the app does not have, and one is deliberately refused

### Broadcast ritual — what exists, what's missing, what to avoid

**Already built.** `calculateLiveTvSlot` is a genuine wall-clock scheduler: it
derives the slot from `Date.now()`, returns `seekSeconds` so you join a programme
already in progress, and offsets each channel by its number so they are not in
lockstep. Those were the top two recommendations of the research, and they are
done. The real gap is that `liveTvMode` defaults to `false`, so the most
broadcast-feeling behaviour in the app is opt-in and largely undiscovered.

- [x] A first-run choice between "join in progress" and "start from the
      beginning", asked once and remembered. `liveTvMode` was not persisted at
      all before, so anyone who did find the switch lost it on reload
- [ ] Dayparting against real hours. **Blocked on data, not effort.** Deciding
      what belongs in primetime versus late night needs a genre or suitability
      tag per programme, and nothing in the line-up carries one — archive.org's
      metadata does not reliably supply it either. Anything built on top of what
      exists would be arbitrary dressed up as a schedule, so it is left undone
      rather than faked
- [~] Sign-on/sign-off. The test pattern itself is already built and always was:
      a channel with nothing playable shows full SMPTE colour bars with the
      cast and reference strips. FCC § 73.1740 treats patterns and slides as
      *not* broadcasting, which is exactly the state that screen portrays.
      What is deliberately NOT built is a scheduled sign-off: an app that
      refuses to show anything watchable between certain hours is hostile,
      however period-correct. Principle 2 — period-correct never beats usable
- [x] Top-of-hour station ID — callsign, channel and the hour, for five seconds,
      live mode only. American stations identified on the hour because they were
      required to, which is why it is one of the few rituals that really did
      happen everywhere. Polls rather than timing one long timeout, so a laptop
      that sleeps through the hour does not announce a time that has passed
- [ ] Late-night texture drift. **Blocked on data for the same reason as
      dayparting.** Reels are bring-your-own and carry no character tag, so the
      app cannot tell an infomercial from a toy advert. The history is sound —
      the August 1984 Commercial TV Deregulation Order (98 F.C.C.2d 1075) removed
      the per-hour ad ceiling and the public-affairs obligation at a stroke,
      which is the hinge between "channel signs off" and "infomercials until
      dawn" — but sorting spots by time of day at random would not reproduce it

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
- [x] Reel parity with channels: spot reordering, import/export, share links.
      A reel you curated is worth the same as a line-up you curated. Share links
      carry a stable id derived from the contents, so opening one twice updates
      the reel instead of adding a second — the lesson the channel links taught
      the hard way earlier in this list

---

## Not doing, and why

- **Literal CRT emulation via WebGL shaders.** Cost is high, the CSS profiles
  already read well, and it deepens the "worse on purpose" problem
- **Natural break detection.** Real scene/silence detection on arbitrary
  archive.org video is not tractable here. Timed with jitter is honest and works
- **Per-episode box art.** Not deferred — not possible without a backend, and
  tested rather than assumed. archive.org stores one image per *item*, so all
  sixteen Lone Ranger episodes share `services/img/theloneranger_201705`.
  Capturing a frame from the video client-side fails both ways: with
  `crossOrigin="anonymous"` the load is refused, because the redirect carries
  `access-control-allow-origin` but the CDN node it lands on does not; without
  it the video plays but the canvas is tainted and `toDataURL` throws
  `SecurityError`. TMDB has episode stills and needs a key, which needs a proxy.
  Nothing here is worth revisiting unless the zero-backend rule changes
- **TMDB or any keyed API.** Would require a proxy, trading away the zero-backend
  property the project is built on

## Found by the user after the plan was written

- [x] The Guide always read `programs[0]` as "NOW AIRING" and `programs[1]` as
      "UP NEXT", for every channel on the page. So it said episode 1 was on no
      matter which episode you were watching, and said the same about every
      other dial. It now shows what is genuinely on: what you are actually
      watching on your own channel, the wall-clock slot on the others in live
      mode, and the first item otherwise
- [x] Picking an episode set an explicit programme and left `currentProgramIndex`
      alone, so nothing downstream could tell which episode was on
- [x] The episode picker spread the previous programme and overrode only the URL,
      leaving `videoFile` naming the episode you were watching *before*
- [x] "EP 3 OF 12" was wrong on eleven of the twelve shipped channels. Only CH 04
      is a series — its sixteen programmes are one archive.org item. The rest are
      twelve unrelated films, so numbering *McLintock!* as episode four of four
      was nonsense. Episodes are detected by a shared identifier, counted per
      programme, so a channel mixing a series with films gets both right
- [x] Bookmarked tapes were a dead end. You could collect, rename and re-art
      them, and then the only thing you could do with the collection was play one
      at a time — the Channel Studio could build from a search but could not see
      the shelf you had already curated. A tape can now be put on any channel
      from its detail sheet, the whole shelf can become a channel in one press,
      and the archive.org link is copyable from the sheet rather than only from
      one of the three view modes

- [x] The live/from-the-beginning switch existed only as an unlabelled
      `START 00:00` button on the remote — so closing the remote removed the
      setting entirely, and the label never said what it did. The first-run
      prompt's claim that you could "change it any time from the remote" was
      therefore only true while the remote happened to be open. It is now
      explained in a tooltip, mirrored at the top of the TV Guide where it
      belongs (the guide is the thing that says what is on, and this decides
      what is on), and bound to `V`

- [x] Subtitle tracks were offered as episodes. The file filter accepted
      anything whose archive.org format string matched a bare `video`, and
      archive.org labels a `.vtt` subtitle "Web Video Text Tracks". One Bee and
      PuppyCat item has 82 files — two real videos (the same programme as .mp4
      and .webm) and five subtitle tracks — and the picker listed six things to
      watch, five of which were captions with a fabricated 30:00 runtime
- [x] The search card's "N EPISODES" badge came from `files_count`, which counts
      every file in the item: artwork, subtitles, torrents, metadata,
      derivatives. That same item advertised 62 episodes and contains exactly
      one programme. The badge reads FILES now and says what it means

## Known-imperfect, stated plainly

- Episode counts are wrong on films with multiple cuts — counts `availableFiles`,
  and only derivatives of one file collapse
- Channels built before the fix keep fabricated "Episode N" descriptions; those are
  baked into stored data, not generated at render
- ~15 obscure shorts still fall back to small archive.org thumbnails. The ART tool
  is the practical route
- The custom shelf arrangement is one global list, not one per channel
