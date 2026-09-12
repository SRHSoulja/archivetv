import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import NavbarHeader from './components/NavbarHeader';
import TvBoxCabinet from './components/TvBoxCabinet';
import RemoteControl from './components/RemoteControl';
import NowPlayingSleeve from './components/NowPlayingSleeve';
import { isDiscEra } from './components/MediaLoadOverlay';
import PictureSettingsModal from './components/PictureSettingsModal';
import CommercialBreaksModal from './components/CommercialBreaksModal';
import {
  getAdSets,
  getAdConfig,
  setAdConfig,
  decodeSharedReel,
  importAdSet,
  resolveChannelAds,
  scheduleNextBreak,
  pickSpots,
  MIN_PROGRAMME_SECONDS,
  EDGE_GUARD_SECONDS,
} from './services/commercials';
import { useGutters } from './hooks/useGutters';
import TvGuideModal from './components/TvGuideModal';
import TapeRackDrawer from './components/TapeRackDrawer';
import ArchiveSearchModal from './components/ArchiveSearchModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import EpisodePickerModal from './components/EpisodePickerModal';
import ChannelCustomizerModal from './components/ChannelCustomizerModal';
import AboutModal from './components/AboutModal';
import {
  getChannelLineup,
  calculateLiveTvSlot,
  resolvePlayableItem,
  saveCustomChannel,
  decodeSharedChannel,
  getCanonicalEpisodeKey,
} from './services/archiveApi';
import { audio } from './services/soundEffects';

export default function App() {
  const cabinetRef = useRef(null);

  // Television State with persistent memory
  const [channels, setChannels] = useState(() => getChannelLineup());
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [currentProgramIndex, setCurrentProgramIndex] = useState(0);
  const [activeExplicitProgram, setActiveExplicitProgram] = useState(null);
  const [adConfig, setAdConfigState] = useState(() => getAdConfig());
  const [adBreak, setAdBreak] = useState(null);
  const adBreakRef = useRef(null);
  const playheadRef = useRef({ time: 0, duration: 0 });
  const nextBreakRef = useRef(null);
  const lastSpotRef = useRef(null);
  const currentProgramRef = useRef(null);
  const [powerOn, setPowerOn] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('archivetv_volume');
      return saved !== null ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });

  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('archivetv_muted') === 'true';
    } catch {
      return false;
    }
  });

  // Picture effects, remembered between visits. Read once and held: this was an
  // IIFE in the component body, so the root component re-read and re-parsed the
  // whole blob on every single render -- measured at eight reads during boot
  // and two more for every interaction.
  const savedPictureRef = useRef(null);
  if (savedPictureRef.current === null) {
    try {
      savedPictureRef.current = JSON.parse(localStorage.getItem('archivetv_picture_v1')) || {};
    } catch {
      savedPictureRef.current = {};
    }
  }
  const savedPicture = savedPictureRef.current;
  const [pictureOpen, setPictureOpen] = useState(false);
  const [breaksOpen, setBreaksOpen] = useState(false);
  // The now-playing sleeve becomes a panel when the gutter cannot hold it.
  const [sleeveSheetOpen, setSleeveSheetOpen] = useState(false);
  const [sharedNotice, setSharedNotice] = useState(null);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(savedPicture.scanlines ?? true);
  const [curvatureEnabled, setCurvatureEnabled] = useState(savedPicture.curvature ?? true);
  const [eraTintEnabled, setEraTintEnabled] = useState(savedPicture.eraTint ?? true);
  const [brightness, setBrightness] = useState(savedPicture.brightness ?? 100);
  const [contrast, setContrast] = useState(savedPicture.contrast ?? 100);

  const [aspectRatio, setAspectRatio] = useState(() => {
    try {
      return localStorage.getItem('archivetv_aspect_ratio') || 'auto';
    } catch {
      return 'auto';
    }
  });

  const [cabinetStyle, setCabinetStyle] = useState(() => {
    try {
      return localStorage.getItem('archivetv_cabinet_style') || 'woodgrain';
    } catch {
      return 'woodgrain';
    }
  });

  const [trackingOffset, setTrackingOffset] = useState(0);
  const [antennaAngle, setAntennaAngle] = useState(0);
  // Remembered between visits, and asked once rather than defaulted silently.
  // This was not persisted at all before, so anyone who switched it on lost the
  // setting the moment they closed the tab.
  const [liveTvMode, setLiveTvMode] = useState(() => {
    try {
      return localStorage.getItem('archivetv_live_tv_v1') === 'on';
    } catch {
      return false;
    }
  });
  const [tuneInAsked, setTuneInAsked] = useState(() => {
    try {
      return localStorage.getItem('archivetv_live_tv_v1') !== null;
    } catch {
      return true;
    }
  });
  const [channelZap, setChannelZap] = useState(false);

  // Top-of-hour station identification. Polls rather than timing a single long
  // timeout: a laptop that sleeps through the hour would otherwise fire the
  // ident whenever it woke up, announcing a time that had already passed.
  const [stationIdAt, setStationIdAt] = useState(null);
  const lastIdentHourRef = useRef(null);

  const rememberLiveTv = (live) => {
    try {
      localStorage.setItem('archivetv_live_tv_v1', live ? 'on' : 'off');
    } catch {}
    return live;
  };

  const handleTuneInChoice = useCallback((live) => {
    setLiveTvMode(rememberLiveTv(live));
    setTuneInAsked(true);
  }, []);

  // Reads the current value through the setter rather than the closure, so it
  // keeps a stable identity and can sit in the hotkey handler without dragging
  // `liveTvMode` into that effect's dependencies -- where leaving it out would
  // have meant `v` toggling against a stale value.
  const handleToggleLiveTv = useCallback(() => {
    setTuneInAsked(true);
    setLiveTvMode((prev) => rememberLiveTv(!prev));
  }, []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gutters = useGutters();

  // Picture Adjustments & Player Engines
  const [colorMode, setColorMode] = useState(() => {
    try {
      return localStorage.getItem('archivetv_color_mode') || 'color';
    } catch {
      return 'color';
    }
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeEngine, setActiveEngine] = useState('direct'); // 'direct' | 'embed'
  // Set when the screen reports that every direct stream candidate failed, so
  // the PLAYER control can say the direct player is not an option here rather
  // than bouncing the viewer straight back to the embed.
  const [directUnavailable, setDirectUnavailable] = useState(false);
  // The moment a tape goes in. Set only when something is deliberately loaded --
  // from the shelf, the search results, a share link -- never on a channel
  // change, or a second and a half of mechanism would sit between the viewer
  // and every press of CH+.
  const [mediaLoad, setMediaLoad] = useState(null);
  const [controlsHidden, setControlsHidden] = useState(false); // Immersive mode: hide VCR deck

  // Persist user settings
  useEffect(() => {
    try {
      localStorage.setItem('archivetv_volume', String(volume));
    } catch {}
    audio.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    try {
      localStorage.setItem('archivetv_muted', String(muted));
    } catch {}
    audio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    try {
      localStorage.setItem('archivetv_cabinet_style', cabinetStyle);
    } catch {}
  }, [cabinetStyle]);

  useEffect(() => {
    try {
      localStorage.setItem('archivetv_color_mode', colorMode);
    } catch {}
  }, [colorMode]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'archivetv_picture_v1',
        JSON.stringify({
          scanlines: scanlinesEnabled,
          curvature: curvatureEnabled,
          eraTint: eraTintEnabled,
          brightness,
          contrast,
        })
      );
    } catch {}
  }, [scanlinesEnabled, curvatureEnabled, eraTintEnabled, brightness, contrast]);

  useEffect(() => {
    try {
      localStorage.setItem('archivetv_aspect_ratio', aspectRatio);
    } catch {}
  }, [aspectRatio]);

  useEffect(() => {
    if (!powerOn || !liveTvMode) {
      setStationIdAt(null);
      return undefined;
    }
    const check = () => {
      const now = new Date();
      const hourKey = `${now.toDateString()}:${now.getHours()}`;
      if (lastIdentHourRef.current === hourKey) return;
      // A twenty-second window after the hour, so arriving at 12:00:04 still
      // gets one and arriving at 12:31 does not get a stale one.
      if (now.getMinutes() === 0 && now.getSeconds() < 20) {
        lastIdentHourRef.current = hourKey;
        setStationIdAt(now.getTime());
        audio.playRemoteBeep();
        setTimeout(() => setStationIdAt(null), 5000);
      }
    };
    check();
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [powerOn, liveTvMode]);

  // Automatic Channel Import from URL Share Links (?shareChannel=... or ?importChannel=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedReel = params.get('shareReel');
      if (sharedReel) {
        decodeSharedReel(sharedReel)
          .then((reel) => {
            if (!reel) return;
            const cfg = getAdConfig();
            setAdConfig({ ...cfg, setId: reel.id, enabled: true });
            setAdConfigState({ ...cfg, setId: reel.id, enabled: true });
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((err) => console.error('Error importing shared reel:', err));
      }

      const sharedData = params.get('shareChannel') || params.get('importChannel');
      if (sharedData) {
        // Decoding is async now that payloads are compressed.
        decodeSharedChannel(sharedData).then((decoded) => {
          if (!decoded) return;
          saveCustomChannel(decoded);

          // A shared channel can bring the reel it plays its breaks from. Scoped
          // to that channel alone -- the recipient's global break setting and
          // every other channel of theirs are left exactly as they were -- and
          // announced, because adverts appearing unannounced would be rude.
          if (decoded.sharedReel && decoded.sharedAds) {
            try {
              const reel = importAdSet({
                name: decoded.sharedReel.name,
                spots: decoded.sharedReel.spots,
              });
              if (reel) {
                const cfg = getAdConfig();
                const next = {
                  ...cfg,
                  everyMinutes: decoded.sharedAds.everyMinutes || cfg.everyMinutes,
                  spotsPerBreak: decoded.sharedAds.spotsPerBreak || cfg.spotsPerBreak,
                  byChannel: {
                    ...(cfg.byChannel || {}),
                    [decoded.id]: { enabled: true, setId: reel.id },
                  },
                };
                setAdConfig(next);
                setAdConfigState(next);
                setSharedNotice(
                  `"${decoded.name}" arrived with its commercial reel — ${reel.spots.length} spots, on this channel only.`
                );
                setTimeout(() => setSharedNotice(null), 9000);
              }
            } catch {}
          }
          const fullLineup = getChannelLineup();
          setChannels(fullLineup);
          const targetIndex = fullLineup.findIndex(
            (c) => c.id === decoded.id || (c.number === decoded.number && c.name === decoded.name)
          );
          if (targetIndex !== -1) {
            setCurrentChannelIndex(targetIndex);
            setCurrentProgramIndex(0);
          }
          // Clean the address bar without reload
          window.history.replaceState({}, document.title, window.location.pathname);
          audio.playChannelZap(0.4);
        }).catch((err) => console.error('Error importing shared channel from URL:', err));
      }
    } catch (err) {
      console.error('Error importing shared channel from URL:', err);
    }
  }, []);

  // Modals
  const [remoteOpen, setRemoteOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [tapeRackOpen, setTapeRackOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [customizerInitialUrl, setCustomizerInitialUrl] = useState('');
  const [aboutOpen, setAboutOpen] = useState(false);

  const reloadChannels = useCallback(() => {
    setChannels(getChannelLineup());
  }, []);

  const handleOpenChannelStudio = useCallback((url = '') => {
    setCustomizerInitialUrl(url || '');
    setCustomizerOpen(true);
  }, []);

  const currentChannel = channels[currentChannelIndex] || channels[0];
  const currentPrograms = currentChannel?.programs || [];
  const baseProgram = currentPrograms[currentProgramIndex] || currentPrograms[0];

  const [channelEpisodesMap, setChannelEpisodesMap] = useState({});

  // Current Program Resolver
  const currentProgram = useMemo(() => {
    if (adBreak) {
      const spot = adBreak.queue[adBreak.index];
      if (spot) {
        return {
          identifier: spot.identifier,
          title: spot.title,
          videoFile: spot.videoFile,
          videoUrl: spot.videoUrl,
          candidateStreamUrls: spot.candidateStreamUrls || [spot.videoUrl],
          duration: spot.duration || 30,
          year: spot.year || '',
          description: '',
          // A compilation is joined partway in; a single advert starts at zero.
          seekSeconds: spot.startAt || 0,
          isInterstitial: true,
        };
      }
    }

    let prog = null;
    if (activeExplicitProgram) {
      prog = {
        ...activeExplicitProgram,
        seekSeconds: activeExplicitProgram.seekSeconds || 0,
      };
    } else if (baseProgram) {
      if (liveTvMode) {
        const slot = calculateLiveTvSlot(currentChannel);
        const p = currentPrograms[slot.programIndex] || baseProgram;
        prog = {
          ...p,
          seekSeconds: slot.seekSeconds,
        };
      } else {
        prog = {
          ...baseProgram,
          seekSeconds: 0,
        };
      }
    }

    if (!prog) return null;

    const episodes =
      prog.availableFiles && prog.availableFiles.length > 1
        ? prog.availableFiles
        : (prog.identifier && channelEpisodesMap[prog.identifier]) || null;

    // Rotate only where the files are genuinely separate programmes.
    //
    // archive.org items often hold the same film at several qualities, and the
    // canonical-episode grouping cannot always tell those apart: Elephants Dream
    // resolves to three "episodes" that are really ed_1024, ed_hd and friends,
    // and rotating them produced "Elephants Dream - ed hd". Counted across the
    // whole line-up, everything with 2-5 entries was quality variants of one
    // film and everything with 6+ was a real series, so that is where the line
    // goes. The episode picker still lists every file either way.
    const SERIES_THRESHOLD = 6;
    if (!episodes || episodes.length < SERIES_THRESHOLD) {
      return episodes && episodes.length > 1 ? { ...prog, availableFiles: episodes } : prog;
    }

    // Only rotate a slot that stands for a whole item. When a channel lists
    // several programmes from the same item — The Lone Ranger is sixteen slots
    // sharing one identifier — each slot is already a chosen episode, and
    // rotating them made every slot resolve to the same wall-clock pick. The
    // channel then had one programme on it however far you skipped.
    const slotsFromSameItem = (currentPrograms || []).filter(
      (p) => p.identifier === prog.identifier
    ).length;
    if (slotsFromSameItem > 1) {
      return { ...prog, availableFiles: episodes };
    }

    // A channel slot that is really a whole series should not play episode one
    // for ever. "Popeye the Sailor: The Complete Series" is 242 episodes behind
    // a single slot, and the other 241 were reachable only through the picker.
    //
    // Which one airs is derived from the wall clock, seeded by the item so two
    // series on the same channel do not move in lockstep. That makes it
    // deterministic rather than random — tuning in twice in the same minute
    // gives the same episode — and in live mode it is genuinely "what is on".
    // An explicitly chosen episode is left completely alone.
    if (activeExplicitProgram) {
      return { ...prog, availableFiles: episodes };
    }

    let seed = 0;
    for (let i = 0; i < (prog.identifier || '').length; i += 1) {
      seed = (seed * 31 + prog.identifier.charCodeAt(i)) % 100000;
    }
    const turnoverMs = 20 * 60 * 1000; // a fresh pick every twenty minutes
    const idx = Math.abs(Math.floor(Date.now() / turnoverMs) + seed) % episodes.length;
    const ep = episodes[idx];
    if (!ep?.videoUrl) return { ...prog, availableFiles: episodes };

    const baseTitle = prog.seriesTitle || (prog.title || '').split(' - ')[0] || prog.title;
    // Do not prefix a label that already names the series: an episode called
    // "Superman E07 - Electric Earthquake" on a series called "Superman" was
    // coming out as "Superman - Superman E07 - Electric Earthquake".
    const label = (ep.displayName || '').trim();
    const episodeTitle = !label
      ? prog.title
      : label.toLowerCase().startsWith(String(baseTitle).toLowerCase().slice(0, 8))
      ? label
      : `${baseTitle} - ${label}`;
    return {
      ...prog,
      availableFiles: episodes,
      seriesTitle: baseTitle,
      title: episodeTitle,
      videoFile: ep.name || prog.videoFile,
      videoUrl: ep.videoUrl,
      candidateStreamUrls: ep.candidateStreamUrls || [ep.videoUrl],
      duration: ep.duration || prog.duration,
    };
  }, [adBreak, activeExplicitProgram, currentChannel, baseProgram, liveTvMode, currentPrograms, channelEpisodesMap]);

  // A new programme gets a fresh chance at the direct player.
  useEffect(() => {
    setDirectUnavailable(false);
  }, [currentProgram?.identifier, currentProgram?.videoUrl]);

  useEffect(() => {
    currentProgramRef.current = currentProgram;
  }, [currentProgram]);

  // A fresh programme gets a fresh break schedule.
  useEffect(() => {
    if (!adBreakRef.current) nextBreakRef.current = null;
  }, [currentProgram?.identifier, currentProgram?.videoUrl]);

  const breakWatchdogRef = useRef(null);

  const resumeFromBreak = useCallback(() => {
    if (breakWatchdogRef.current) {
      clearTimeout(breakWatchdogRef.current);
      breakWatchdogRef.current = null;
    }
    const brk = adBreakRef.current;
    adBreakRef.current = null;
    setAdBreak(null);
    nextBreakRef.current = null;
    if (brk?.resumeProgram) {
      setActiveExplicitProgram({
        ...brk.resumeProgram,
        seekSeconds: brk.resumeSeconds,
        // Marks this as the schedule's own programme put back after a break,
        // not an out-of-schedule pick. Without it the ending below merely
        // clears the slot and the same programme starts over.
        resumedFromBreak: true,
      });
    }
  }, []);

  // When the spot now on screen began, in wall-clock terms.
  const clipStartedRef = useRef(null);

  /**
   * Changing channel abandons any break in progress.
   *
   * A break belongs to the channel that was interrupted -- reels are chosen per
   * channel -- so carrying one across the dial is wrong twice over: the viewer
   * keeps watching the old channel's adverts, and when the break finishes
   * `resumeFromBreak` restores the old channel's programme over the new one.
   * Abandoned rather than resumed: there is nothing to go back to.
   */
  useEffect(() => {
    if (breakWatchdogRef.current) {
      clearTimeout(breakWatchdogRef.current);
      breakWatchdogRef.current = null;
    }
    if (adBreakRef.current) {
      adBreakRef.current = null;
      setAdBreak(null);
    }
    nextBreakRef.current = null;
    clipStartedRef.current = null;
  }, [currentChannelIndex]);

  // Shared by the timed trigger and the "play one now" test button.

  const advanceBreak = useCallback(() => {
    const brk = adBreakRef.current;
    if (!brk) return;
    clipStartedRef.current = Date.now();
    lastSpotRef.current = brk.queue[brk.index]?.videoFile || null;
    const nextIndex = brk.index + 1;
    if (nextIndex < brk.queue.length) {
      const updated = { ...brk, index: nextIndex };
      adBreakRef.current = updated;
      setAdBreak(updated);
    } else {
      resumeFromBreak();
    }
  }, [resumeFromBreak]);

  const startBreak = useCallback(
    (spots, resumeProgram, resumeSeconds) => {
      if (!spots?.length) return;
      const brk = { queue: spots, index: 0, resumeProgram, resumeSeconds };
      adBreakRef.current = brk;
      setAdBreak(brk);
      clipStartedRef.current = Date.now();

      if (breakWatchdogRef.current) clearTimeout(breakWatchdogRef.current);
      // A compilation spot's `duration` is the whole recording; only its clip
      // actually plays, so budgeting on the file length would leave the
      // watchdog asleep for the better part of an hour.
      const budget =
        spots.reduce((t, s) => t + (s.clipSeconds || s.duration || 30), 0) * 1000 + 45000;
      breakWatchdogRef.current = setTimeout(() => {
        if (adBreakRef.current) resumeFromBreak();
      }, Math.min(budget, 300000));
    },
    [resumeFromBreak]
  );

  const handlePlaybackProgress = useCallback(
    (time, duration) => {
      playheadRef.current = { time, duration };

      // A compilation spot has no natural end -- the file runs for another forty
      // minutes -- so the clip is timed out and handed on deliberately.
      //
      // Timed against the wall clock rather than the video's own position. The
      // position only reaches `startAt + clip` once the seek into the middle of
      // a 49-minute remote file has actually landed, and when that was slow the
      // clip never ended at all and the break ran until the watchdog. How long
      // the viewer has been sitting through adverts is the thing being measured
      // anyway.
      const brk = adBreakRef.current;
      if (brk) {
        const spot = brk.queue[brk.index];
        if (spot?.clipSeconds) {
          const startedAt = clipStartedRef.current;
          if (startedAt && Date.now() - startedAt >= spot.clipSeconds * 1000) {
            advanceBreak();
          }
        }
        return;
      }

      const { enabled, setId } = resolveChannelAds(adConfig, currentChannel?.id);
      if (!enabled || !setId) return;
      // The embed's position cannot be read across the origin boundary, so a
      // programme interrupted there could never be resumed where it left off.
      if (activeEngine !== 'direct') return;
      if (!duration || duration < MIN_PROGRAMME_SECONDS) return;

      if (nextBreakRef.current == null) {
        nextBreakRef.current = scheduleNextBreak(time, duration, adConfig.everyMinutes);
        return;
      }
      if (time < nextBreakRef.current) return;
      if (time > duration - EDGE_GUARD_SECONDS) return;

      const set = getAdSets().find((s) => s.id === setId);
      const spots = pickSpots(set, adConfig.spotsPerBreak, lastSpotRef.current, adConfig.clipSeconds);
      if (!spots.length) {
        nextBreakRef.current = null;
        return;
      }

      startBreak(spots, currentProgramRef.current, time);
    },
    [adConfig, currentChannel?.id, activeEngine, startBreak, advanceBreak]
  );

  const handleTestBreak = useCallback(() => {
    const { setId } = resolveChannelAds(adConfig, currentChannel?.id);
    const set = getAdSets().find((s) => s.id === setId) || getAdSets()[0];
    const spots = pickSpots(set, adConfig.spotsPerBreak, lastSpotRef.current, adConfig.clipSeconds);
    if (!spots.length) return false;
    startBreak(spots, currentProgramRef.current, playheadRef.current.time || 0);
    return true;
  }, [adConfig, currentChannel?.id, startBreak]);

  const handleSkipBreak = useCallback(() => {
    audio.playSwitch(true);
    resumeFromBreak();
  }, [resumeFromBreak]);

  const displayChannel = useMemo(() => {
    if (activeExplicitProgram?.isAuxiliary) {
      return {
        number: 'AUX',
        baseChannelNumber: currentChannel?.number || '02',
        baseChannelName: currentChannel?.name || 'BROADCAST',
        name: (activeExplicitProgram.title || 'ARCHIVE BROADCAST').slice(0, 24).toUpperCase(),
        callsign: `AUX-${currentChannel?.number || 'TV'}`,
        badge: 'AUX/VCR',
        description: activeExplicitProgram.description,
      };
    }
    return currentChannel;
  }, [activeExplicitProgram, currentChannel]);

  // Reception is the antenna's job alone. Fine tune used to feed this as well,
  // which meant the dial produced snow through this path AND added its own on
  // top -- degrading twice, and drowning out the aerial it was competing with.
  // On a real set the aerial governed reception and the vertical hold governed
  // picture lock; they were unrelated systems.
  const signalQuality = useMemo(() => {
    const antennaDist = Math.abs(antennaAngle % 60);
    return Math.max(15, Math.min(100, 100 - antennaDist * 1.35));
  }, [antennaAngle]);

  const triggerChannelZap = useCallback(() => {
    setChannelZap(true);
    audio.playChannelZap(0.35);
    setTimeout(() => {
      setChannelZap(false);
    }, 350);
  }, []);

  // Dynamic episode discovery: cache multi-files in memory without switching channel to AUX
  useEffect(() => {
    const progId = currentProgram?.identifier;
    if (!progId) return;
    if (currentProgram.availableFiles && currentProgram.availableFiles.length > 1) return;
    if (channelEpisodesMap[progId]) return;

    let isMounted = true;
    resolvePlayableItem(progId)
      .then((resolved) => {
        if (!isMounted) return;
        if (resolved?.availableFiles && resolved.availableFiles.length > 1) {
          setChannelEpisodesMap((prev) => ({
            ...prev,
            [progId]: resolved.availableFiles,
          }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentProgram?.identifier, currentProgram?.availableFiles, channelEpisodesMap]);

  // Channel Navigation Handlers
  const handleNextChannel = useCallback(() => {
    triggerChannelZap();
    setActiveExplicitProgram(null);
    setActiveEngine('direct');
    setCurrentChannelIndex((prev) => (prev + 1) % channels.length);
    setCurrentProgramIndex(0);
  }, [channels.length, triggerChannelZap]);

  const handlePrevChannel = useCallback(() => {
    triggerChannelZap();
    setActiveExplicitProgram(null);
    setActiveEngine('direct');
    setCurrentChannelIndex((prev) => (prev - 1 + channels.length) % channels.length);
    setCurrentProgramIndex(0);
  }, [channels.length, triggerChannelZap]);

  /**
   * @param pinProgram  play exactly this programme rather than joining the
   *                    channel. Picking a tape off the shelf means "play this
   *                    one"; in live mode the wall-clock slot would otherwise
   *                    replace it immediately with whatever is on. Tuning from
   *                    the Guide leaves it false, so a channel still joins in
   *                    progress the way it should.
   */
  const handleSelectChannel = useCallback(
    (channel, programIndex = 0, pinProgram = false) => {
      const idx = channels.findIndex(
        (c) => c.number === channel.number || c.id === channel.id
      );
      if (idx !== -1) {
        triggerChannelZap();
        const wanted = channel.programs?.[programIndex >= 0 ? programIndex : 0];
        setActiveExplicitProgram(
          pinProgram && wanted ? { ...wanted, seekSeconds: 0 } : null
        );
        setActiveEngine('direct');
        setCurrentChannelIndex(idx);
        setCurrentProgramIndex(programIndex >= 0 ? programIndex : 0);
      }
    },
    [channels, triggerChannelZap]
  );

  const handleSelectChannelByNumber = useCallback(
    (numStr) => {
      const idx = channels.findIndex(
        (c) => c.number === numStr || parseInt(c.number, 10) === parseInt(numStr, 10)
      );
      if (idx !== -1) {
        triggerChannelZap();
        setActiveExplicitProgram(null);
        setActiveEngine('direct');
        setCurrentChannelIndex(idx);
        setCurrentProgramIndex(0);
      }
    },
    [channels, triggerChannelZap]
  );

  const handleRandomChannel = useCallback(() => {
    if (channels.length <= 1) return;
    let nextIdx = currentChannelIndex;
    while (nextIdx === currentChannelIndex) {
      nextIdx = Math.floor(Math.random() * channels.length);
    }
    triggerChannelZap();
    setActiveExplicitProgram(null);
    setActiveEngine('direct');
    setCurrentChannelIndex(nextIdx);
    setCurrentProgramIndex(0);
  }, [channels.length, currentChannelIndex, triggerChannelZap]);

  // Program advancement (loop to next program or episode)
  const handleProgramEnded = useCallback(() => {
    if (adBreakRef.current) {
      advanceBreak();
      return;
    }

    if (currentProgram?.availableFiles && currentProgram.availableFiles.length > 1) {
      // Find current file index and advance to next distinct episode
      const curFile = currentProgram.videoUrl;
      const files = currentProgram.availableFiles;
      const curIdx = files.findIndex((f) => f.videoUrl === curFile);
      if (curIdx !== -1) {
        const curKey = getCanonicalEpisodeKey(files[curIdx].name || files[curIdx].displayName || '');
        let nextIdx = curIdx + 1;
        while (
          nextIdx < files.length &&
          getCanonicalEpisodeKey(files[nextIdx].name || files[nextIdx].displayName || '') === curKey
        ) {
          nextIdx++;
        }

        if (nextIdx < files.length) {
          const nextEp = files[nextIdx];
          const baseTitle = currentProgram.seriesTitle || currentProgram.title.split(' - ')[0] || currentProgram.title;
          setActiveExplicitProgram({
            ...currentProgram,
            seriesTitle: baseTitle,
            videoUrl: nextEp.videoUrl,
            candidateStreamUrls: nextEp.candidateStreamUrls || [nextEp.videoUrl],
            title: `${baseTitle} - ${nextEp.displayName}`,
            duration: nextEp.duration,
            seekSeconds: 0,
            isAuxiliary: false,
          });
          setActiveEngine('direct');
          return;
        }
      }
    }

    if (activeExplicitProgram) {
      const wasResumedFromBreak =
        activeExplicitProgram.resumedFromBreak && !activeExplicitProgram.isAuxiliary;
      setActiveExplicitProgram(null);
      setActiveEngine('direct');
      // Clearing alone drops back to the same programme at seekSeconds 0, so it
      // would play twice and only advance on its second ending. A programme put
      // back after a break should move on exactly as the schedule would.
      if (wasResumedFromBreak && currentPrograms.length > 1) {
        setCurrentProgramIndex((prev) => (prev + 1) % currentPrograms.length);
      }
    } else if (currentPrograms.length > 1) {
      setCurrentProgramIndex((prev) => (prev + 1) % currentPrograms.length);
      setActiveEngine('direct');
    }
  }, [activeExplicitProgram, currentPrograms.length, currentProgram]);

  const handleEngineChange = useCallback(
    (newEngine) => {
      // A spot whose file the browser cannot decode falls back to the embed,
      // which needs a click to start and never reports that it ended -- so the
      // break would sit there until the watchdog. Move past it instead.
      if (newEngine === 'embed' && adBreakRef.current) {
        advanceBreak();
        return;
      }
      if (typeof newEngine === 'string') {
        // Only the screen's stream-failure path passes an engine by name.
        if (newEngine === 'embed') setDirectUnavailable(true);
        setActiveEngine(newEngine);
      } else {
        setActiveEngine((prev) => (prev === 'direct' ? 'embed' : 'direct'));
      }
    },
    [advanceBreak]
  );

  const handlePlayDirectItem = useCallback(
    (resolvedItem) => {
      triggerChannelZap();
      if (resolvedItem?.title) {
        setMediaLoad({ title: resolvedItem.title, at: Date.now() });
        if (isDiscEra(cabinetStyle)) audio.playDiscLoad();
        else audio.playTapeLoad();
      }
      setActiveExplicitProgram({
        ...resolvedItem,
        isAuxiliary: true,
      });
      if (resolvedItem?.videoUrl) {
        setActiveEngine('direct');
      } else if (resolvedItem?.playerEngine === 'embed' || !resolvedItem?.videoUrl) {
        setActiveEngine('embed');
      } else {
        setActiveEngine('direct');
      }
    },
    [triggerChannelZap, cabinetStyle]
  );

  const handleCustomTapePlay = useCallback(
    async (identifier) => {
      const resolved = await resolvePlayableItem(identifier);
      handlePlayDirectItem(resolved);
    },
    [handlePlayDirectItem]
  );

  const handleRestartProgram = useCallback(() => {
    audio.playSwitch(true);
    cabinetRef.current?.restart();
    if (activeExplicitProgram) {
      setActiveExplicitProgram({ ...activeExplicitProgram, seekSeconds: 0 });
    } else {
      setLiveTvMode(false);
    }
  }, [activeExplicitProgram]);

  // Episode selection from multi-file modal
  const handleSelectEpisode = useCallback(
    (ep) => {
      if (!currentProgram) return;
      triggerChannelZap();
      const baseTitle = currentProgram.seriesTitle || currentProgram.title.split(' - ')[0] || currentProgram.title;
      // archive.org carries no per-file description -- every file in an item
      // shares the item's blurb -- so the app composes "<episode>. <item text>".
      // Switching episode rewrote the title and left that composed description
      // alone, so the sleeve read "ep 5 My Favorite..." over ep 6. Strip the
      // previous episode's label back off and put the new one on.
      const prevLabel =
        currentProgram.title && currentProgram.title.includes(' - ')
          ? currentProgram.title.slice(currentProgram.title.indexOf(' - ') + 3).trim()
          : null;
      let baseDescription = (currentProgram.description || '').trim();
      if (prevLabel && baseDescription.startsWith(prevLabel)) {
        baseDescription = baseDescription.slice(prevLabel.length).replace(/^[.\s]+/, '');
      }
      const epLabel = (ep.displayName || ep.name || '').trim();
      const description = epLabel
        ? `${epLabel}. ${baseDescription}`.trim().replace(/\.\s*$/, '')
        : baseDescription;

      setActiveExplicitProgram({
        ...currentProgram,
        seriesTitle: baseTitle,
        description,
        videoUrl: ep.videoUrl,
        // Carried over from the previous episode before this: the spread kept
        // the old videoFile, so anything reading the file name while an episode
        // was selected got the name of the one you were watching before it.
        videoFile: ep.name || ep.videoFile || currentProgram.videoFile,
        candidateStreamUrls: ep.candidateStreamUrls || [ep.videoUrl],
        title: `${baseTitle} - ${ep.displayName}`,
        duration: ep.duration,
        seekSeconds: 0,
        isAuxiliary: false,
      });
      setActiveEngine('direct');
    },
    [currentProgram, triggerChannelZap]
  );

  /**
   * Which slot on the current channel is genuinely on air.
   *
   * `currentProgramIndex` is only half the answer: picking an episode sets an
   * explicit programme and leaves the index where it was, so the Guide sat on
   * "EP 1 OF 16" while the deck correctly showed episode 7. Match the explicit
   * programme back to the line-up by its file, which is what tells one episode
   * of a tape from another, and fall back to the index when there is nothing
   * explicit playing.
   */
  const airingProgramIndex = useMemo(() => {
    const progs = currentChannel?.programs || [];
    const explicit = activeExplicitProgram;
    if (explicit && !explicit.isAuxiliary && progs.length > 0) {
      if (explicit.videoUrl) {
        const byUrl = progs.findIndex((p) => p.videoUrl === explicit.videoUrl);
        if (byUrl !== -1) return byUrl;
      }
      if (explicit.videoFile) {
        const byFile = progs.findIndex((p) => p.videoFile === explicit.videoFile);
        if (byFile !== -1) return byFile;
      }
    }
    // In live mode the programme actually on air comes from the wall clock, not
    // from `currentProgramIndex` — that state stays where it was put and is not
    // advanced by the scheduler. Reading it here made the Guide claim programme
    // one was airing while the set played whatever the clock had chosen.
    if (liveTvMode && progs.length > 1) {
      return calculateLiveTvSlot(currentChannel).programIndex;
    }

    return currentProgramIndex;
  }, [currentChannel, activeExplicitProgram, currentProgramIndex, liveTvMode]);

  /**
   * Skip to the next or previous programme.
   *
   * Until now the only way past a show you did not want was to hold fast
   * forward through all of it. On a channel this steps the line-up; on a tape
   * loaded from the shelf it steps that tape's own episodes, since there is no
   * line-up to walk.
   */
  const handleStepProgram = useCallback(
    (delta) => {
      const aux = activeExplicitProgram?.isAuxiliary ? activeExplicitProgram : null;
      const auxEpisodes = aux?.availableFiles || [];

      if (aux && auxEpisodes.length > 1) {
        const here = auxEpisodes.findIndex(
          (f) => f.videoUrl === aux.videoUrl || f.name === aux.videoFile
        );
        const next = ((here === -1 ? 0 : here) + delta + auxEpisodes.length) % auxEpisodes.length;
        const ep = auxEpisodes[next];
        if (!ep) return;
        triggerChannelZap();
        const baseTitle = aux.seriesTitle || (aux.title || '').split(' - ')[0] || aux.title;
        setActiveExplicitProgram({
          ...aux,
          seriesTitle: baseTitle,
          title: `${baseTitle} - ${ep.displayName || ep.name}`,
          videoUrl: ep.videoUrl,
          videoFile: ep.name || ep.videoFile,
          candidateStreamUrls: ep.candidateStreamUrls || [ep.videoUrl],
          duration: ep.duration,
          seekSeconds: 0,
        });
        setActiveEngine('direct');
        return;
      }

      const progs = currentChannel?.programs || [];
      if (progs.length < 2) return;
      triggerChannelZap();
      setActiveExplicitProgram(null);
      setActiveEngine('direct');
      setCurrentProgramIndex(
        ((airingProgramIndex + delta) % progs.length + progs.length) % progs.length
      );
    },
    [activeExplicitProgram, currentChannel, airingProgramIndex, triggerChannelZap]
  );

  const handleToggleAux = useCallback(() => {
    triggerChannelZap();
    if (activeExplicitProgram?.isAuxiliary) {
      setActiveExplicitProgram(null);
      setActiveEngine('direct');
    } else {
      setTapeRackOpen(true);
    }
  }, [activeExplicitProgram, triggerChannelZap]);

  const handleTogglePlayPause = useCallback(() => {
    audio.playSwitch(true);
    cabinetRef.current?.togglePlayPause();
  }, []);

  const handleSeekDelta = useCallback((delta) => {
    audio.playSwitch(true);
    cabinetRef.current?.seekDelta(delta);
  }, []);

  // Cycle color mode
  const handleCycleColorMode = useCallback(() => {
    audio.playSwitch(true);
    const modes = ['color', 'bw', 'amber', 'green'];
    const nextIdx = (modes.indexOf(colorMode) + 1) % modes.length;
    setColorMode(modes[nextIdx]);
  }, [colorMode]);

  // Cycle aspect ratio: AUTO -> 4:3 -> 16:9 -> AUTO
  const handleCycleAspectRatio = useCallback(() => {
    audio.playSwitch(true);
    setAspectRatio((prev) => {
      if (prev === 'auto') return '4:3';
      if (prev === '4:3') return '16:9';
      return 'auto';
    });
  }, []);

  // Fullscreen the CRT picture rather than the whole document.
  const handleToggleFullscreen = () => {
    if (cabinetRef.current?.toggleFullscreen) {
      cabinetRef.current.toggleFullscreen();
      return;
    }
    // Fallback if the screen element is not mounted yet.
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Fullscreen the whole site -- the original behaviour, kept on the navbar
  // button and Shift+F so nothing that worked before stopped working.
  const handleToggleSiteFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Track real fullscreen state. Toggling a boolean by hand desynced whenever the
  // viewer left fullscreen with Esc, leaving the navbar button showing the wrong icon.
  useEffect(() => {
    const sync = () =>
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  // Panels that take over the screen. The remote is deliberately absent: it is a
  // floating panel, open by default, and does not capture the view.
  // Ordered innermost-first so Escape closes what is actually on top.
  const blockingModals = [
    [episodesOpen, setEpisodesOpen],
    [shortcutsOpen, setShortcutsOpen],
    [aboutOpen, setAboutOpen],
    [pictureOpen, setPictureOpen],
    [breaksOpen, setBreaksOpen],
    [sleeveSheetOpen, setSleeveSheetOpen],
    [customizerOpen, setCustomizerOpen],
    [searchOpen, setSearchOpen],
    [tapeRackOpen, setTapeRackOpen],
    [guideOpen, setGuideOpen],
  ];
  const anyModalOpen = blockingModals.some(([open]) => open);

  // Keyboard Navigation & Scrubbing Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      // Escape closes the topmost panel. Nothing else reaches the set while one
      // is open -- arrow keys were changing channel behind an open tape rack,
      // and `p` was powering the television off underneath it.
      //
      // It is checked BEFORE the form-field guard on purpose: the search box
      // takes focus the moment its panel opens, so guarding Escape away left no
      // way out of the panel people type in most.
      if (key === 'Escape') {
        for (const [open, setOpen] of blockingModals) {
          if (open) {
            e.preventDefault();
            setOpen(false);
            return;
          }
        }
        return;
      }
      if (inField) return;
      if (anyModalOpen) return;

      if (key === 'ArrowUp') {
        e.preventDefault();
        handleNextChannel();
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        handlePrevChannel();
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        const skip = e.shiftKey ? -60 : -10;
        cabinetRef.current?.seekDelta(skip);
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        const skip = e.shiftKey ? 60 : 10;
        cabinetRef.current?.seekDelta(skip);
      } else if (key.toLowerCase() === 'j') {
        e.preventDefault();
        cabinetRef.current?.seekDelta(-10);
      } else if (key.toLowerCase() === 'l') {
        e.preventDefault();
        cabinetRef.current?.seekDelta(10);
      } else if (key.toLowerCase() === 'k' || key === ' ') {
        e.preventDefault();
        cabinetRef.current?.togglePlayPause();
      } else if (key === '+' || key === '=') {
        e.preventDefault();
        setVolume((v) => Math.min(1, Number((v + 0.1).toFixed(1))));
      } else if (key === '-' || key === '_') {
        e.preventDefault();
        setVolume((v) => Math.max(0, Number((v - 0.1).toFixed(1))));
      } else if (key.toLowerCase() === 'm') {
        e.preventDefault();
        setMuted((m) => !m);
      } else if (key.toLowerCase() === 'p') {
        e.preventDefault();
        setPowerOn((p) => !p);
      } else if (key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCycleColorMode();
      } else if (key.toLowerCase() === 'e') {
        e.preventDefault();
        if (currentProgram?.availableFiles?.length > 1) {
          setEpisodesOpen(true);
        }
      } else if (key.toLowerCase() === 'g') {
        e.preventDefault();
        setGuideOpen((g) => !g);
      } else if (key.toLowerCase() === 'u') {
        e.preventDefault();
        handleOpenChannelStudio();
      } else if (key.toLowerCase() === 's') {
        e.preventDefault();
        setSearchOpen((s) => !s);
      } else if (key.toLowerCase() === 't') {
        e.preventDefault();
        setTapeRackOpen((t) => !t);
      } else if (key.toLowerCase() === 'r') {
        e.preventDefault();
        setRemoteOpen((r) => !r);
      } else if (key.toLowerCase() === 'b') {
        e.preventDefault();
        setBreaksOpen((b) => !b);
      } else if (key.toLowerCase() === 'v') {
        e.preventDefault();
        handleToggleLiveTv();
      } else if (key === '[') {
        e.preventDefault();
        handleStepProgram(-1);
      } else if (key === ']') {
        e.preventDefault();
        handleStepProgram(1);
      } else if (key.toLowerCase() === 'backspace' || key.toLowerCase() === 'home') {
        e.preventDefault();
        handleRestartProgram();
      } else if (key.toLowerCase() === 'a') {
        e.preventDefault();
        handleCycleAspectRatio();
      } else if (key.toLowerCase() === 'f') {
        e.preventDefault();
        // F fills the screen with the picture; Shift+F fills it with the whole set.
        if (e.shiftKey) handleToggleSiteFullscreen();
        else handleToggleFullscreen();
      } else if (key.toLowerCase() === 'h') {
        e.preventDefault();
        setControlsHidden((c) => !c);
      } else if (key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (key >= '0' && key <= '9') {
        const num = key === '0' ? '10' : key.padStart(2, '0');
        handleSelectChannelByNumber(num);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNextChannel,
    handlePrevChannel,
    handleSelectChannelByNumber,
    handleRestartProgram,
    handleCycleColorMode,
    handleCycleAspectRatio,
    handleOpenChannelStudio,
    handleStepProgram,
    currentProgram,
    anyModalOpen,
    episodesOpen,
    shortcutsOpen,
    aboutOpen,
    pictureOpen,
    breaksOpen,
    customizerOpen,
    searchOpen,
    tapeRackOpen,
    guideOpen,
  ]);

  return (
    <div className="min-h-screen bg-[#0d0b0a] text-zinc-200 flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* 1. Header Toolbar */}
      <NavbarHeader
        cabinetStyle={cabinetStyle}
        onSelectCabinetStyle={setCabinetStyle}
        scanlinesEnabled={scanlinesEnabled}
        onToggleScanlines={() => setScanlinesEnabled((s) => !s)}
        curvatureEnabled={curvatureEnabled}
        onToggleCurvature={() => setCurvatureEnabled((c) => !c)}
        aspectRatio={aspectRatio}
        onToggleAspectRatio={handleCycleAspectRatio}
        remoteOpen={remoteOpen}
        onToggleRemote={() => setRemoteOpen((r) => !r)}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenTapeRack={() => setTapeRackOpen(true)}
        onOpenChannelStudio={() => handleOpenChannelStudio()}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        currentChannel={displayChannel}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleSiteFullscreen}
        onOpenPicture={() => setPictureOpen(true)}
        onOpenBreaks={() => setBreaksOpen(true)}
      />

      {/* 2. Television Stage Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 md:p-6 relative">
        <TvBoxCabinet
          ref={cabinetRef}
          cabinetStyle={cabinetStyle}
          powerOn={powerOn}
          onTogglePower={() => setPowerOn((p) => !p)}
          currentChannel={displayChannel}
          currentProgram={currentProgram}
          onProgramEnded={handleProgramEnded}
          channels={channels}
          onSelectChannel={handleSelectChannel}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          volume={volume}
          onVolumeChange={setVolume}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          scanlinesEnabled={scanlinesEnabled}
          onToggleScanlines={() => setScanlinesEnabled((s) => !s)}
          brightness={brightness}
          contrast={contrast}
          eraTintEnabled={eraTintEnabled}
          curvatureEnabled={curvatureEnabled}
          onToggleCurvature={() => setCurvatureEnabled((c) => !c)}
          aspectRatio={aspectRatio}
          onToggleAspectRatio={handleCycleAspectRatio}
          trackingOffset={trackingOffset}
          onTrackingChange={setTrackingOffset}
          antennaAngle={antennaAngle}
          onAntennaAngleChange={setAntennaAngle}
          signalQuality={signalQuality}
          liveTvMode={liveTvMode}
          onToggleLiveTv={handleToggleLiveTv}
          onRestartProgram={handleRestartProgram}
          onOpenGuide={() => setGuideOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenTapeRack={() => setTapeRackOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onOpenEpisodes={() => setEpisodesOpen(true)}
          channelZap={channelZap}
          colorMode={colorMode}
          onCycleColorMode={handleCycleColorMode}
          playbackRate={playbackRate}
          onChangePlaybackRate={setPlaybackRate}
          activeEngine={activeEngine}
          onEngineChange={handleEngineChange}
          onToggleEngine={() => handleEngineChange()}
          directUnavailable={directUnavailable}
          mediaLoad={mediaLoad}
          onMediaLoadDone={() => setMediaLoad(null)}
          onStepProgram={handleStepProgram}
          tuneInPrompt={powerOn && !tuneInAsked}
          onTuneInChoice={handleTuneInChoice}
          stationIdAt={stationIdAt}
          onPlaybackStateChange={setIsPlaying}
          onPlaybackProgress={handlePlaybackProgress}
          interstitial={
            adBreak
              ? {
                  index: adBreak.index + 1,
                  count: adBreak.queue.length,
                  title: adBreak.queue[adBreak.index]?.title || 'COMMERCIAL',
                  onSkip: handleSkipBreak,
                }
              : null
          }
          controlsHidden={controlsHidden}
          onToggleControls={() => setControlsHidden((c) => !c)}
        />
      </main>

      {/* 3. Floating Remote Control */}
      <CommercialBreaksModal
        isOpen={breaksOpen}
        onClose={() => setBreaksOpen(false)}
        currentChannel={currentChannel}
        channels={channels}
        onConfigChange={setAdConfigState}
        onTestBreak={handleTestBreak}
      />

      <PictureSettingsModal
        isOpen={pictureOpen}
        onClose={() => setPictureOpen(false)}
        scanlinesEnabled={scanlinesEnabled}
        onToggleScanlines={(v) => setScanlinesEnabled(typeof v === 'boolean' ? v : !scanlinesEnabled)}
        curvatureEnabled={curvatureEnabled}
        onToggleCurvature={(v) => setCurvatureEnabled(typeof v === 'boolean' ? v : !curvatureEnabled)}
        eraTintEnabled={eraTintEnabled}
        onToggleEraTint={(v) => setEraTintEnabled(typeof v === 'boolean' ? v : !eraTintEnabled)}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        contrast={contrast}
        onContrastChange={setContrast}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
      />

      {/* During a break the sleeve stays on the programme being interrupted. It
          is the panel that tells you what you are watching, and what you are
          watching is the show — the adverts interrupt it rather than replace it.
          It says a break is on instead. */}
      <NowPlayingSleeve
        currentProgram={adBreak ? adBreak.resumeProgram || currentProgram : currentProgram}
        onBreak={!!adBreak}
        currentChannel={displayChannel}
        powerOn={powerOn}
        gutters={gutters}
        sheetOpen={sleeveSheetOpen}
        onSheetOpenChange={setSleeveSheetOpen}
      />

      <RemoteControl
        gutters={gutters}
        isOpen={remoteOpen}
        onClose={() => setRemoteOpen(false)}
        currentChannel={displayChannel}
        powerOn={powerOn}
        onTogglePower={() => setPowerOn((p) => !p)}
        onNextChannel={handleNextChannel}
        onPrevChannel={handlePrevChannel}
        onSelectChannelByNumber={handleSelectChannelByNumber}
        onToggleAux={handleToggleAux}
        volume={volume}
        onVolumeChange={setVolume}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        isPlaying={isPlaying}
        onTogglePlayPause={handleTogglePlayPause}
        onSeekDelta={handleSeekDelta}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenTapeRack={() => setTapeRackOpen(true)}
        onOpenChannelStudio={() => handleOpenChannelStudio()}
        onToggleLiveTv={handleToggleLiveTv}
        onRestartProgram={handleRestartProgram}
        liveTvMode={liveTvMode}
        aspectRatio={aspectRatio}
        onToggleAspectRatio={handleCycleAspectRatio}
        onRandomChannel={handleRandomChannel}
        colorMode={colorMode}
        onCycleColorMode={handleCycleColorMode}
      />

      {/* 4. Electronic Program Guide (TV Guide) Modal */}
      <TvGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        channels={channels}
        currentChannel={displayChannel}
        currentProgramIndex={airingProgramIndex}
        currentProgramTitle={currentProgram?.title || ''}
        liveTvMode={liveTvMode}
        onToggleLiveTv={handleToggleLiveTv}
        onSelectChannel={handleSelectChannel}
        onOpenChannelStudio={() => handleOpenChannelStudio()}
      />

      {/* 5. VHS Cassette Tape Rack Drawer */}
      <TapeRackDrawer
        isOpen={tapeRackOpen}
        onClose={() => setTapeRackOpen(false)}
        currentChannel={displayChannel}
        channels={channels}
        onSelectChannel={handleSelectChannel}
        onCustomTapePlay={handleCustomTapePlay}
        onPlayDirectItem={handlePlayDirectItem}
        onChannelsUpdated={reloadChannels}
      />

      {/* 6. Internet Archive Deep Antenna Explorer Modal */}
      <ArchiveSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPlayDirectItem={handlePlayDirectItem}
        onChannelAdded={reloadChannels}
        onOpenChannelStudio={handleOpenChannelStudio}
      />

      {/* 7. Multi-Episode / Track Picker Modal */}
      <EpisodePickerModal
        isOpen={episodesOpen}
        onClose={() => setEpisodesOpen(false)}
        currentProgram={currentProgram}
        onSelectEpisode={handleSelectEpisode}
      />

      {/* 8. Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* 9. Channel Studio & Customizer Modal */}
      <ChannelCustomizerModal
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        onChannelsUpdated={reloadChannels}
        onTuneChannel={handleSelectChannel}
        initialDroppedUrl={customizerInitialUrl}
      />

      {/* 10. About & Legal Disclaimer Modal */}
      <AboutModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />

      {sharedNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-md px-4 py-3 rounded-xl bg-teal-950/95 border-2 border-teal-500 text-teal-100 font-pixel text-[11px] leading-relaxed shadow-2xl flex items-start gap-2">
          <span aria-hidden="true">📻</span>
          <span>{sharedNotice}</span>
          <button
            type="button"
            onClick={() => setSharedNotice(null)}
            aria-label="Dismiss"
            className="ml-1 shrink-0 text-teal-300 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Footer Info Bar */}
      <footer className="w-full bg-[#100e0d] border-t border-zinc-900 px-4 py-2 text-center text-xs font-mono text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2 font-pixel text-[11px]">
          <span className="text-amber-500 font-bold">ARCHIVETV</span>
          <span>•</span>
          <span>INTERNET ARCHIVE PUBLIC DOMAIN DATABASE EXPLORER</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <button
            onClick={() => setAboutOpen(true)}
            className="hover:text-amber-400 cursor-pointer font-pixel text-zinc-400"
          >
            [⚖️ LEGAL & ABOUT]
          </button>
          <span>•</span>
          <a
            href="https://github.com/SRHSoulja/archivetv/blob/main/GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 cursor-pointer font-pixel"
            title="How to use ArchiveTV — channels, tapes, breaks, shortcuts"
          >
            [📖 HELP &amp; GUIDE]
          </a>
          <span>•</span>
          <button
            onClick={() => setShortcutsOpen(true)}
            className="hover:text-amber-400 cursor-pointer font-pixel"
          >
            [?] HOTKEYS
          </button>
          <span>•</span>
          <a
            href="https://github.com/SRHSoulja/archivetv"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 cursor-pointer font-pixel"
          >
            [SOURCE ON GITHUB]
          </a>
          <span>•</span>
          <span>USE VCR SCRUB BAR OR J/K/L TO SEEK</span>
        </div>
      </footer>
    </div>
  );
}
