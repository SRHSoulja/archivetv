import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import NavbarHeader from './components/NavbarHeader';
import TvBoxCabinet from './components/TvBoxCabinet';
import RemoteControl from './components/RemoteControl';
import NowPlayingSleeve from './components/NowPlayingSleeve';
import PictureSettingsModal from './components/PictureSettingsModal';
import CommercialBreaksModal from './components/CommercialBreaksModal';
import {
  getAdSets,
  getAdConfig,
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

  // Picture effects, remembered between visits.
  const savedPicture = (() => {
    try {
      return JSON.parse(localStorage.getItem('archivetv_picture_v1')) || {};
    } catch {
      return {};
    }
  })();
  const [pictureOpen, setPictureOpen] = useState(false);
  const [breaksOpen, setBreaksOpen] = useState(false);
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
  const [liveTvMode, setLiveTvMode] = useState(false); // Default to Start From Beginning!
  const [channelZap, setChannelZap] = useState(false);
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

  // Automatic Channel Import from URL Share Links (?shareChannel=... or ?importChannel=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedData = params.get('shareChannel') || params.get('importChannel');
      if (sharedData) {
        const decoded = decodeSharedChannel(sharedData);
        if (decoded) {
          saveCustomChannel(decoded);
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
        }
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
          seekSeconds: 0,
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

    if ((!prog.availableFiles || prog.availableFiles.length <= 1) && prog.identifier && channelEpisodesMap[prog.identifier]) {
      return {
        ...prog,
        availableFiles: channelEpisodesMap[prog.identifier],
      };
    }

    return prog;
  }, [adBreak, activeExplicitProgram, currentChannel, baseProgram, liveTvMode, currentPrograms, channelEpisodesMap]);

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
      });
    }
  }, []);

  // Shared by the timed trigger and the "play one now" test button.
  const startBreak = useCallback(
    (spots, resumeProgram, resumeSeconds) => {
      if (!spots?.length) return;
      const brk = { queue: spots, index: 0, resumeProgram, resumeSeconds };
      adBreakRef.current = brk;
      setAdBreak(brk);

      if (breakWatchdogRef.current) clearTimeout(breakWatchdogRef.current);
      const budget = spots.reduce((t, s) => t + (s.duration || 30), 0) * 1000 + 45000;
      breakWatchdogRef.current = setTimeout(() => {
        if (adBreakRef.current) resumeFromBreak();
      }, Math.min(budget, 300000));
    },
    [resumeFromBreak]
  );

  const handlePlaybackProgress = useCallback(
    (time, duration) => {
      playheadRef.current = { time, duration };
      if (adBreakRef.current) return;

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
      const spots = pickSpots(set, adConfig.spotsPerBreak, lastSpotRef.current);
      if (!spots.length) {
        nextBreakRef.current = null;
        return;
      }

      startBreak(spots, currentProgramRef.current, time);
    },
    [adConfig, currentChannel?.id, activeEngine, startBreak]
  );

  const handleTestBreak = useCallback(() => {
    const { setId } = resolveChannelAds(adConfig, currentChannel?.id);
    const set = getAdSets().find((s) => s.id === setId) || getAdSets()[0];
    const spots = pickSpots(set, adConfig.spotsPerBreak, lastSpotRef.current);
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

  const handleSelectChannel = useCallback(
    (channel, programIndex = 0) => {
      const idx = channels.findIndex(
        (c) => c.number === channel.number || c.id === channel.id
      );
      if (idx !== -1) {
        triggerChannelZap();
        setActiveExplicitProgram(null);
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
    const brk = adBreakRef.current;
    if (brk) {
      lastSpotRef.current = brk.queue[brk.index]?.videoFile || null;
      const nextIndex = brk.index + 1;
      if (nextIndex < brk.queue.length) {
        const updated = { ...brk, index: nextIndex };
        adBreakRef.current = updated;
        setAdBreak(updated);
      } else {
        resumeFromBreak();
      }
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
      setActiveExplicitProgram(null);
      setActiveEngine('direct');
    } else if (currentPrograms.length > 1) {
      setCurrentProgramIndex((prev) => (prev + 1) % currentPrograms.length);
      setActiveEngine('direct');
    }
  }, [activeExplicitProgram, currentPrograms.length, currentProgram]);

  const handleEngineChange = useCallback((newEngine) => {
    if (typeof newEngine === 'string') {
      setActiveEngine(newEngine);
    } else {
      setActiveEngine((prev) => (prev === 'direct' ? 'embed' : 'direct'));
    }
  }, []);

  const handlePlayDirectItem = useCallback(
    (resolvedItem) => {
      triggerChannelZap();
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
    [triggerChannelZap]
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
      setActiveExplicitProgram({
        ...currentProgram,
        seriesTitle: baseTitle,
        videoUrl: ep.videoUrl,
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

  // Keyboard Navigation & Scrubbing Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const key = e.key;

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
    currentProgram,
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
          onToggleLiveTv={() => setLiveTvMode((l) => !l)}
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

      <NowPlayingSleeve
        currentProgram={currentProgram}
        currentChannel={displayChannel}
        powerOn={powerOn}
        gutters={gutters}
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
        onToggleLiveTv={() => setLiveTvMode((l) => !l)}
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

      {/* Footer Info Bar */}
      <footer className="w-full bg-[#100e0d] border-t border-zinc-900 px-4 py-2 text-center text-xs font-mono text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2 select-none">
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
          <button
            onClick={() => setShortcutsOpen(true)}
            className="hover:text-amber-400 cursor-pointer font-pixel"
          >
            [?] HOTKEYS
          </button>
          <span>•</span>
          <span>USE VCR SCRUB BAR OR J/K/L TO SEEK</span>
        </div>
      </footer>
    </div>
  );
}
