import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { Radio, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { audio } from '../services/soundEffects';
import { getCanonicalEpisodeKey } from '../services/archiveApi';

const CrtScreen = forwardRef(function CrtScreen(
  {
    powerOn,
    currentChannel,
    currentProgram,
    onProgramEnded,
    volume,
    muted,
    scanlinesEnabled = true,
    curvatureEnabled = true,
    aspectRatio = 'auto',
    trackingOffset = 0,
    signalQuality = 100,
    liveTvMode = false,
    showOsd,
    channelZap,
    onRestartProgram,
    playbackRate = 1,
    colorMode = 'color',
    brightness = 100,
    contrast = 100,
    eraTintEnabled = true,
    interstitial = null,
    activeEngine = 'direct',
    onEngineChange,
    onTimeUpdateReport,
    cabinetStyle = 'woodgrain',
  },
  ref
) {
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const screenRef = useRef(null);
  const canvasRef = useRef(null);
  const loadedVideoUrlRef = useRef(null);
  const onTimeUpdateReportRef = useRef(onTimeUpdateReport);
  const lastPlaybackTimeRef = useRef(0);
  // Resume position for an engine handoff. This is deliberately NOT
  // lastPlaybackTimeRef: that one is the live position tracker, rewritten by every
  // timeupdate -- including the currentTime===0 events a freshly mounted <video>
  // fires while loading, which wiped the saved position before the seek ran.
  const pendingResumeRef = useRef(0);
  const prevEngineRef = useRef(activeEngine);

  useEffect(() => {
    onTimeUpdateReportRef.current = onTimeUpdateReport;
  }, [onTimeUpdateReport]);

  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [osdVisible, setOsdVisible] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [detectedAspectRatio, setDetectedAspectRatio] = useState('4:3');
  const [isScreenFullscreen, setIsScreenFullscreen] = useState(false);

  // Direct candidate streams & graceful fallback state
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [streamFailedAll, setStreamFailedAll] = useState(false);
  const [embedTime, setEmbedTime] = useState(0);
  const [embedPlaying, setEmbedPlaying] = useState(true);
  const [embedReady, setEmbedReady] = useState(false);
  // archive.org's embed ignores autoplay=1 -- it loads nothing until the viewer
  // clicks inside the iframe. Until that happens the video is parked, so the
  // counter must not run or the handoff back to direct hands over a bogus time.
  const [embedStarted, setEmbedStarted] = useState(false);

  // The iframe src must stay byte-identical while the embed plays: ANY change to
  // the attribute re-navigates the iframe and restarts buffering from zero. So the
  // URL is pinned to a "seed" position that only moves on a real navigation event
  // (program change, engine switch, seek, restart) -- never on the ticking clock.
  const [embedSeed, setEmbedSeed] = useState({ start: 0, nonce: 0 });
  // Wall-clock anchor for dead-reckoning embed position; null while buffering.
  const embedAnchorRef = useRef(null);
  const embedTimeRef = useRef(0);
  const embedPlayingRef = useRef(true);

  useEffect(() => {
    embedTimeRef.current = embedTime;
  }, [embedTime]);

  useEffect(() => {
    embedPlayingRef.current = embedPlaying;
  }, [embedPlaying]);

  // Re-point the embed at a new offset. This is the only path that reloads the
  // iframe, so every caller here is an intentional navigation.
  const reseedEmbed = useCallback((startSeconds) => {
    const start = Math.max(0, Math.floor(startSeconds || 0));
    embedAnchorRef.current = null;
    embedTimeRef.current = start;
    setEmbedReady(false);
    setEmbedStarted(false);
    setEmbedTime(start);
    setEmbedSeed((prev) => ({ start, nonce: prev.nonce + 1 }));
  }, []);

  // Compute prioritized list of direct playable video URLs for this item / episode
  const candidateUrls = useMemo(() => {
    if (!currentProgram) return [];
    const list = [];
    if (currentProgram.videoUrl) list.push(currentProgram.videoUrl);
    if (Array.isArray(currentProgram.candidateStreamUrls)) {
      for (const u of currentProgram.candidateStreamUrls) {
        if (u && !list.includes(u)) list.push(u);
      }
    }
    // Also look for fallback files for THIS specific canonical episode only
    if (Array.isArray(currentProgram.availableFiles) && currentProgram.videoUrl) {
      const curName = currentProgram.videoFile || currentProgram.videoUrl.split('/').pop();
      const curKey = getCanonicalEpisodeKey(curName);
      for (const f of currentProgram.availableFiles) {
        if (getCanonicalEpisodeKey(f.name) === curKey && f.videoUrl && !list.includes(f.videoUrl)) {
          list.push(f.videoUrl);
        }
      }
    }
    return list;
  }, [currentProgram]);

  const effectiveAspectRatio = aspectRatio === 'auto' ? detectedAspectRatio : aspectRatio;

  const activeVideoUrl = candidateUrls[candidateIndex] || currentProgram?.videoUrl || null;
  const canPlayDirect = activeEngine === 'direct' && Boolean(activeVideoUrl) && !streamFailedAll;

  // Stable embed URL, rebuilt only when the seeded offset or the item changes.
  const embedSrc = useMemo(() => {
    const base =
      currentProgram?.embedUrl ||
      (currentProgram?.identifier
        ? `https://archive.org/embed/${currentProgram.identifier}`
        : null);
    if (!base) return null;
    // A stored embedUrl may already carry autoplay/start; we own both params.
    const [path, query = ''] = base.split('?');
    const params = new URLSearchParams(query);
    params.delete('autoplay');
    params.delete('start');
    params.set('autoplay', '1');
    if (embedSeed.start > 0) params.set('start', String(embedSeed.start));
    return `${path}?${params.toString()}`;
  }, [currentProgram?.embedUrl, currentProgram?.identifier, embedSeed.start]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && onTimeUpdateReport) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || duration || currentProgram?.duration || 0;
      if (cur > 0) setVideoLoading(false);
      lastPlaybackTimeRef.current = cur;
      onTimeUpdateReport(cur, dur, !videoRef.current.paused);
    }
  }, [duration, currentProgram?.duration, onTimeUpdateReport]);

  const toggleScreenFullscreen = useCallback(() => {
    const doc = document;
    const active = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (active) {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      try {
        Promise.resolve(exit?.call(doc)).catch(() => {});
      } catch {}
      return;
    }
    const el = screenRef.current;
    if (!el) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    try {
      Promise.resolve(req?.call(el)).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    const sync = () => {
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      setIsScreenFullscreen(Boolean(active) && active === screenRef.current);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  // Expose imperative methods to parent (for VCR deck and keyboard shortcuts)
  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      if (canPlayDirect && videoRef.current) {
        const dur = videoRef.current.duration || duration || 999999;
        videoRef.current.currentTime = Math.max(0, Math.min(seconds, dur));
        handleTimeUpdate();
      } else {
        const dur = duration || currentProgram?.duration || 999999;
        const target = Math.max(0, Math.min(seconds, dur));
        // archive.org's player exposes no cross-origin seek API (the postMessage
        // calls we used to make were silently dropped), so a seek is a deliberate
        // reload of the iframe pinned at the new offset.
        reseedEmbed(target);
        setEmbedPlaying(true);
        onTimeUpdateReportRef.current?.(target, dur, true);
      }
    },
    togglePlayPause: () => {
      if (canPlayDirect && videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
        handleTimeUpdate();
      } else {
        const next = !embedPlayingRef.current;
        const at = embedTimeRef.current;
        embedPlayingRef.current = next;
        setEmbedPlaying(next);
        if (next) {
          // Resuming reloads the player at the frozen position (the src switch
          // to about:blank below is what actually stops it).
          reseedEmbed(at);
        } else {
          embedAnchorRef.current = null;
          setEmbedReady(false);
        }
        onTimeUpdateReportRef.current?.(
          at,
          duration || currentProgram?.duration || 3600,
          next
        );
      }
    },
    // Fullscreen the picture itself. Fullscreening documentElement (what this
    // used to do, up in App) just scaled up the page furniture -- navbar, cabinet
    // and VCR deck included -- which is why the Tube embed's own fullscreen
    // button looked better than ours.
    toggleFullscreen: toggleScreenFullscreen,
    restart: () => {
      if (canPlayDirect && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
        handleTimeUpdate();
      } else {
        // Reseed rather than mutating iframe.src directly -- imperative writes
        // fought with React's control of the attribute and got reverted.
        reseedEmbed(0);
        setEmbedPlaying(true);
        onTimeUpdateReportRef.current?.(0, duration || currentProgram?.duration || 3600, true);
      }
    },
  }));

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Bidirectional timestamp handoff: capture time from outgoing engine when switching.
  // Reads the outgoing embed position through a ref so this effect does NOT depend
  // on embedTime -- it used to, and re-ran several times a second as a result.
  useEffect(() => {
    if (prevEngineRef.current === activeEngine) return;
    const leaving = prevEngineRef.current;
    prevEngineRef.current = activeEngine;

    // Capture position from the engine we're leaving. React has already unmounted
    // the <video> by the time this passive effect runs, so videoRef is usually
    // null here -- lastPlaybackTimeRef is the reliable source for that direction.
    let captured = 0;
    if (leaving === 'direct') {
      captured = videoRef.current?.currentTime || lastPlaybackTimeRef.current || 0;
    } else if (leaving === 'embed') {
      captured = embedTimeRef.current || 0;
    }

    if (activeEngine === 'direct') {
      pendingResumeRef.current = captured;
      // Force-clear loadedVideoUrlRef so the video setup effect re-runs and seeks
      loadedVideoUrlRef.current = null;
    } else {
      reseedEmbed(captured);
      setEmbedPlaying(true);
    }
  }, [activeEngine, reseedEmbed]);

  // Reset timestamps and stream index on program/channel change
  useEffect(() => {
    setCandidateIndex(0);
    setStreamFailedAll(false);
    setVideoError(null);
    setAutoplayBlocked(false);
    const initialSeek = currentProgram?.seekSeconds || 0;
    const initialDur = currentProgram?.duration || 0;
    setDuration(initialDur);
    reseedEmbed(initialSeek);
    setEmbedPlaying(true);
    lastPlaybackTimeRef.current = initialSeek;
    pendingResumeRef.current = 0;
    if (onTimeUpdateReport) {
      onTimeUpdateReport(initialSeek, initialDur, true);
    }
  }, [currentProgram?.identifier, currentProgram?.videoUrl, currentChannel?.number]);

  // Direct Mode Heartbeat: ensures continuous, accurate 1-second VCR counter progression
  useEffect(() => {
    if (!powerOn || !canPlayDirect) return;
    const heartbeat = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        handleTimeUpdate();
      }
    }, 350);
    return () => clearInterval(heartbeat);
  }, [powerOn, canPlayDirect, handleTimeUpdate]);

  // We cannot see inside the cross-origin iframe, but focus moving to the iframe
  // element is a reliable proxy for the viewer having clicked into the player.
  useEffect(() => {
    if (canPlayDirect || !embedSrc || !powerOn) return;
    if (embedStarted || !embedPlaying) return;

    const check = () => {
      if (iframeRef.current && document.activeElement === iframeRef.current) {
        setEmbedStarted(true);
      }
    };
    window.addEventListener('blur', check);
    const poll = setInterval(check, 400);
    return () => {
      window.removeEventListener('blur', check);
      clearInterval(poll);
    };
  }, [canPlayDirect, embedSrc, powerOn, embedStarted, embedPlaying]);

  // Anchor the clock to the moment playback actually begins, not to iframe load.
  useEffect(() => {
    if (!embedStarted || embedAnchorRef.current) return;
    embedAnchorRef.current = { base: embedSeed.start, wallStart: performance.now() };
  }, [embedStarted, embedSeed.start]);

  // Tube Embed playback clock. archive.org's player emits no cross-origin time
  // events, so we dead-reckon from a wall-clock anchor set when the iframe actually
  // finishes loading. Anchoring on load rather than on mount keeps buffering time
  // out of the counter -- counting it is what desynced the handoff back to direct.
  useEffect(() => {
    if (!powerOn || canPlayDirect) return;
    if (!embedPlaying) return;

    const embedInterval = setInterval(() => {
      const anchor = embedAnchorRef.current;
      if (!anchor) return; // still buffering; counter holds at the seeded offset
      const dur = duration || currentProgram?.duration || 3600;
      const elapsed = ((performance.now() - anchor.wallStart) / 1000) * playbackRate;
      const nextTime = Math.min(dur, anchor.base + elapsed);
      setEmbedTime(nextTime);
      onTimeUpdateReportRef.current?.(nextTime, dur, true);
    }, 250);

    return () => clearInterval(embedInterval);
  }, [powerOn, canPlayDirect, embedPlaying, playbackRate, duration, currentProgram?.duration]);

  // NOTE: there is deliberately no 'message' listener here. archive.org's embed
  // emits nothing to the parent -- measured across 16s of confirmed playback,
  // before and after the click: zero messages. A listener would therefore never
  // hear from the player, but WOULD hear from anything else on the page, and a
  // stray {event:'pause'} would blank the iframe. Embed position is dead
  // reckoned from embedAnchorRef instead; see the playback clock above.


  const isOffAir =
    !currentProgram ||
    (!currentProgram.videoUrl && !currentProgram.embedUrl && !currentProgram.identifier);

  // Static intensity calculation
  const calculatedStatic = isOffAir
    ? Math.min(
        1,
        (channelZap ? 0.95 : 0) + ((100 - signalQuality) / 100) * 0.7
      )
    : Math.min(
        1,
        (channelZap ? 0.95 : 0) +
          ((videoLoading && activeEngine === 'direct') ||
          (!canPlayDirect && embedPlaying && !embedReady)
            ? 0.35
            : 0) +
          (videoError && activeEngine === 'direct' && !streamFailedAll ? 0.85 : 0) +
          ((100 - signalQuality) / 100) * 0.7
      );

  // OPTIMIZED Static Canvas Loop:
  // Only loops RAF when calculatedStatic > 0.02, preventing wasteful 60fps idle clearing!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = 320);
    const height = (canvas.height = 240);

    if (!powerOn) {
      ctx.fillStyle = '#050706';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (calculatedStatic <= 0.02) {
      ctx.clearRect(0, 0, width, height);
      return; // Do not schedule RAF when signal is crystal clear!
    }

    let animId;
    const imgData = ctx.createImageData(width, height);
    const buf = new Uint32Array(imgData.data.buffer);
    const len = buf.length;

    const renderStatic = () => {
      const intensity = calculatedStatic;
      for (let i = 0; i < len; i++) {
        if (Math.random() < intensity) {
          const gray = Math.floor(Math.random() * 255);
          buf[i] = (255 << 24) | (gray << 16) | (gray << 8) | gray;
        } else {
          buf[i] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      if (Math.abs(trackingOffset) > 10) {
        const barY = (Date.now() / (10 - Math.min(9, Math.abs(trackingOffset) / 6))) % height;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.3, Math.abs(trackingOffset) / 100)})`;
        ctx.fillRect(0, barY, width, 18);
      }

      animId = requestAnimationFrame(renderStatic);
    };

    renderStatic();
    return () => cancelAnimationFrame(animId);
  }, [powerOn, calculatedStatic, trackingOffset]);

  // Static audio
  useEffect(() => {
    if (!powerOn) {
      audio.stopStatic();
      return;
    }
    if (calculatedStatic > 0.15 && !muted) {
      audio.startStatic(Math.min(0.4, calculatedStatic * 0.35));
    } else {
      audio.stopStatic();
    }
  }, [powerOn, calculatedStatic, muted]);

  const autoplayBlockedRef = useRef(false);
  const prevMutedRef = useRef(muted);

  useEffect(() => {
    autoplayBlockedRef.current = autoplayBlocked;
  }, [autoplayBlocked]);

  // Volume sync.
  //
  // While autoplay is blocked the element is deliberately muted -- that mute is
  // the only reason playback is legal at all. Writing `muted` back here undoes
  // it, and with autoplayBlocked previously in the dependency array this effect
  // re-ran the instant the flag was set and undid the recovery in the same tick,
  // clearing the prompt before it painted. So leave `muted` alone while blocked,
  // unless the viewer themselves changes it -- that is a gesture, and honouring
  // it is exactly what they asked for.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = muted ? 0 : volume;

    const mutedChanged = prevMutedRef.current !== muted;
    prevMutedRef.current = muted;

    if (!autoplayBlockedRef.current) {
      video.muted = muted;
    } else if (mutedChanged) {
      video.muted = muted;
      setAutoplayBlocked(false);
    }
  }, [volume, muted]);

  // Direct video source load with graceful autoplay policy handling & candidate stream rotation
  useEffect(() => {
    if (!canPlayDirect || !activeVideoUrl || !powerOn) {
      setVideoLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Never reload or reset currentTime if the active video URL is already active
    if (loadedVideoUrlRef.current === activeVideoUrl && video.src === activeVideoUrl) {
      return;
    }

    loadedVideoUrlRef.current = activeVideoUrl;
    setVideoLoading(true);
    video.src = activeVideoUrl;
    video.load();

    const handleLoadedMetadata = () => {
      setVideoLoading(false);
      const dur = video.duration || currentProgram?.duration || 0;
      if (dur > 0) setDuration(dur);

      if (liveTvMode && currentProgram?.seekSeconds && video.duration) {
        video.currentTime = currentProgram.seekSeconds % video.duration;
      } else if (currentProgram?.seekSeconds) {
        video.currentTime = currentProgram.seekSeconds;
      } else if (pendingResumeRef.current > 0) {
        // Resume from saved position (e.g. returning from embed mode)
        video.currentTime = pendingResumeRef.current;
        pendingResumeRef.current = 0;
      } else {
        video.currentTime = 0;
      }

      onTimeUpdateReportRef.current?.(video.currentTime, dur, !video.paused);

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === 'NotAllowedError') {
            // Browser blocked unmuted autoplay: start muted and offer user-unmute
            setAutoplayBlocked(true);
            video.muted = true;
            video.play().catch(() => {});
          }
        });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [activeVideoUrl, canPlayDirect, powerOn]);

  const handleVideoError = () => {
    console.warn(`Direct stream error on candidate #${candidateIndex}: ${activeVideoUrl}`);
    if (candidateIndex + 1 < candidateUrls.length) {
      console.log(`Auto-switching to candidate stream #${candidateIndex + 1}: ${candidateUrls[candidateIndex + 1]}`);
      setCandidateIndex((prev) => prev + 1);
      setVideoLoading(true);
    } else {
      console.warn('All direct stream candidates failed for this program. Using embed player locally.');
      setStreamFailedAll(true);
      setVideoLoading(false);
      setVideoError('DIRECT STREAM OFFLINE - TUBE BACKUP ACTIVE');
      // Tell the app we fell back, or it keeps believing playback is direct --
      // which buries the working embed under error static and lets commercial
      // breaks schedule against a clock they cannot resume from.
      onEngineChange?.('embed');
    }
  };

  // Screen click to unmute if blocked
  const handleScreenClick = () => {
    if (autoplayBlocked && videoRef.current) {
      videoRef.current.muted = muted;
      setAutoplayBlocked(false);
      audio.init();
    }
  };

  // OSD auto-hide
  useEffect(() => {
    setOsdVisible(true);
    const t = setTimeout(() => setOsdVisible(false), 5000);
    return () => clearTimeout(t);
  }, [currentChannel?.number, currentProgram?.identifier, aspectRatio]);

  // Derive the content era from the program year or title for era-aware visual styling
  const contentEra = useMemo(() => {
    let year = null;
    const textToScan = `${currentProgram?.title || ''} ${currentProgram?.identifier || ''}`;

    // 1. Prioritize explicit vintage release years in title/identifier (e.g. 1987)
    // because Archive.org metadata year frequently reflects upload/rip dates (e.g. 2023).
    const vintageMatch = textToScan.match(/\b(19\d\d)\b/);
    if (vintageMatch) {
      year = parseInt(vintageMatch[1], 10);
    }

    // 2. Recognize known classic franchises if no year specified
    if (!year && /\b(teenage\s+mutant\s+ninja\s+turtles|tmnt)\b/i.test(textToScan)) {
      year = 1987; // Classic 1987 VHS cartoon era
    }

    // 3. Fallback to program metadata year
    if (!year) {
      const yearStr = currentProgram?.year;
      if (yearStr && yearStr !== 'Vintage') {
        const parsed = parseInt(String(yearStr).slice(0, 4), 10);
        if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2035) {
          year = parsed;
        }
      }
    }

    // 4. Modern year match from text if still none
    if (!year) {
      const modernMatch = textToScan.match(/\b(20[0-2]\d)\b/);
      if (modernMatch) {
        year = parseInt(modernMatch[1], 10);
      }
    }

    if (!year) return 'modern';
    if (year < 1930) return 'silent';      // Silent Era: heavy B&W grain
    if (year < 1950) return 'golden';      // Golden Age: warm sepia, slight flicker
    if (year < 1965) return 'early-color'; // Early Color TV: desaturated, soft
    if (year < 1980) return 'broadcast';   // Classic Broadcast: vivid but warm
    if (year < 2000) return 'vhs';         // VHS Era (80s & 90s, e.g. 1987 TMNT): authentic warm VHS glow
    return 'modern';                        // Digital era: clean
  }, [currentProgram?.year, currentProgram?.title, currentProgram?.identifier]);

  // Build filter style for color modes, brightness, AND era-aware automatic tinting
  const getFilterStyle = () => {
    let f = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Manual color mode overrides era styling
    if (colorMode === 'bw') {
      f += ' grayscale(100%)';
    } else if (colorMode === 'amber') {
      f += ' sepia(100%) hue-rotate(10deg) saturate(320%)';
    } else if (colorMode === 'green') {
      f += ' sepia(100%) hue-rotate(80deg) saturate(320%)';
    } else if (eraTintEnabled) {
      // Auto era-aware tinting (only in default 'color' mode, and only when the
      // viewer wants it -- some people would rather see the source untouched)
      switch (contentEra) {
        case 'silent':
          f += ' grayscale(100%) contrast(130%) brightness(90%)';
          break;
        case 'golden':
          f += ' sepia(35%) saturate(80%) contrast(105%)';
          break;
        case 'early-color':
          f += ' saturate(75%) sepia(10%) contrast(105%)';
          break;
        case 'broadcast':
          f += ' saturate(110%) sepia(5%)';
          break;
        case 'vhs':
          f += ' saturate(90%) sepia(8%) brightness(102%)';
          break;
        default:
          break;
      }
    }
    return f;
  };

  const eraCurvatureClass = curvatureEnabled
    ? cabinetStyle === 'trinitron'
      ? 'crt-style-trinitron'
      : cabinetStyle === 'woodgrain'
      ? 'crt-style-woodgrain'
      : cabinetStyle === 'portable'
      ? 'crt-style-portable'
      : 'crt-style-pure'
    : '';

  return (
    <div
      ref={screenRef}
      onClick={handleScreenClick}
      className={`crt-screen-root relative w-full h-full bg-[#050706] overflow-hidden flex items-center justify-center select-none ${eraCurvatureClass}`}
      style={{
        aspectRatio: effectiveAspectRatio === '4:3' ? '4/3' : '16/9',
      }}
    >
      {/* 1. Direct HTML5 Video Player */}
      {powerOn && canPlayDirect && (
        <video
          ref={videoRef}
          src={activeVideoUrl}
          className={`w-full h-full object-contain bg-black transition-opacity duration-300 ${
            videoLoading ? 'opacity-20' : 'opacity-100'
          }`}
          style={{ filter: getFilterStyle() }}
          playsInline
          onLoadedMetadata={(e) => {
            setVideoLoading(false);
            const v = e.target;
            if (v.duration && !isNaN(v.duration)) {
              setDuration(v.duration);
            }
            if (v.videoWidth && v.videoHeight) {
              const ratio = v.videoWidth / v.videoHeight;
              setDetectedAspectRatio(ratio >= 1.5 ? '16:9' : '4:3');
            }
          }}
          onLoadedData={() => setVideoLoading(false)}
          onDurationChange={(e) => {
            if (e.target.duration && !isNaN(e.target.duration)) {
              setDuration(e.target.duration);
            }
          }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onProgramEnded}
          onError={handleVideoError}
          onWaiting={() => setVideoLoading(true)}
          onCanPlay={() => {
            setVideoLoading(false);
            handleTimeUpdate();
          }}
          onPlaying={() => {
            setVideoLoading(false);
            handleTimeUpdate();
          }}
          onPlay={() => {
            setVideoLoading(false);
            handleTimeUpdate();
          }}
          onPause={handleTimeUpdate}
        />
      )}

      {/* 2. Universal Archive.org Tube Embed Player */}
      {powerOn && !canPlayDirect && embedSrc && (
        <div
          className="absolute inset-0 w-full h-full bg-black flex items-center justify-center z-10"
          style={{ filter: getFilterStyle() }}
        >
          <iframe
            key={embedSeed.nonce}
            ref={iframeRef}
            src={embedPlaying ? embedSrc : 'about:blank'}
            title={currentProgram.title}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => {
              if (!embedPlaying) return; // about:blank settling after a pause
              setVideoLoading(false);
              setEmbedReady(true);
              // Chrome is up, but the video is still parked until the viewer
              // clicks; the clock anchors on that, not here.
              embedTimeRef.current = embedSeed.start;
              setEmbedTime(embedSeed.start);
            }}
          />
        </div>
      )}

      {/* 2a. "Press play" prompt: archive.org's embed will not start on its own. */}
      {powerOn && !canPlayDirect && embedSrc && embedReady && embedPlaying && !embedStarted && (
        <div className="absolute inset-0 z-20 flex items-end justify-center pb-[12%] pointer-events-none">
          <div className="px-3 py-1.5 rounded bg-black/75 border border-amber-500/60 font-pixel text-[10px] text-amber-300 tracking-widest animate-pulse">
            PRESS PLAY ON TUBE
          </div>
        </div>
      )}

      {/* 2b. Retro SMPTE Color Bars Standby / Off-Air Screen */}
      {powerOn && isOffAir && (
        <div className="absolute inset-0 w-full h-full flex flex-col z-10 select-none overflow-hidden font-pixel">
          {/* Top 75%: Classic 7 vertical SMPTE Color Bars */}
          <div className="w-full flex-1 grid grid-cols-7">
            <div className="bg-[#b5b5b5]" /> {/* 75% White / Grey */}
            <div className="bg-[#b5b500]" /> {/* Yellow */}
            <div className="bg-[#00b5b5]" /> {/* Cyan */}
            <div className="bg-[#00b500]" /> {/* Green */}
            <div className="bg-[#b500b5]" /> {/* Magenta */}
            <div className="bg-[#b50000]" /> {/* Red */}
            <div className="bg-[#0000b5]" /> {/* Blue */}
          </div>

          {/* Middle 10%: Cast transition bars */}
          <div className="w-full h-6 grid grid-cols-7">
            <div className="bg-[#0000b5]" />
            <div className="bg-[#111111]" />
            <div className="bg-[#b500b5]" />
            <div className="bg-[#111111]" />
            <div className="bg-[#00b5b5]" />
            <div className="bg-[#111111]" />
            <div className="bg-[#b5b5b5]" />
          </div>

          {/* Bottom 15%: Sub-black & Reference bars */}
          <div className="w-full h-10 grid grid-cols-4 bg-[#0a0a0a]">
            <div className="bg-[#081a2e]" />
            <div className="bg-[#ffffff]" />
            <div className="bg-[#1e072b]" />
            <div className="bg-[#050505]" />
          </div>

          {/* Center Retro Station Standby Card */}
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="bg-[#0e0c12]/95 border-2 border-amber-500 rounded-2xl p-4 md:p-5 shadow-[0_0_35px_rgba(0,0,0,0.95)] max-w-sm w-full text-center flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
                <span className="font-pixel text-yellow-400 text-base md:text-lg font-bold tracking-widest">
                  PLEASE STAND BY
                </span>
              </div>

              <div className="font-pixel text-amber-400 text-xs font-bold">
                CH {currentChannel?.number || '00'} • {currentChannel?.callsign || 'OFF-AIR'}
              </div>

              <div className="font-mono text-zinc-200 text-xs font-bold mt-1.5 truncate max-w-full px-2">
                {currentChannel?.name || 'STATION SIGN-OFF'}
              </div>

              <div className="text-zinc-400 text-[10px] font-mono mt-1">
                TRANSMITTER CARRIER ACTIVE • NO SCHEDULED TAPE
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800 w-full flex items-center justify-center gap-1.5 text-zinc-300 font-pixel text-[10px]">
                <span className="text-amber-400 font-bold bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded">
                  PRESS [U]
                </span>
                <span>TO DROP SHOWS IN STUDIO</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Procedural Canvas Static / RF Noise */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen z-20"
        style={{
          opacity: powerOn ? Math.max(0.04, calculatedStatic) : 1,
          filter: 'contrast(160%) brightness(120%)',
        }}
      />

      {/* 4. Rolling CRT V-Hold Sync Bar */}
      {powerOn && (
        <div
          className="crt-roll-bar z-20"
          style={{
            opacity: Math.max(0.1, Math.abs(trackingOffset) / 28),
            animationDuration: `${Math.max(1.2, 12 - Math.abs(trackingOffset) / 3.5)}s`,
          }}
        />
      )}

      {/* 5. CRT Scanlines Overlay - customized by era cabinet style */}
      {powerOn && scanlinesEnabled && (
        <div
          className={`absolute inset-0 pointer-events-none z-20 ${
            cabinetStyle === 'trinitron'
              ? 'crt-scanlines-trinitron'
              : cabinetStyle === 'woodgrain'
              ? 'crt-scanlines-woodgrain'
              : cabinetStyle === 'portable'
              ? 'crt-scanlines-portable'
              : 'crt-scanlines'
          }`}
        />
      )}

      {/* 5b. Sony Trinitron Aperture Grille Vertical Slits */}
      {powerOn && cabinetStyle === 'trinitron' && (
        <div className="absolute inset-0 crt-aperture-grille opacity-50 pointer-events-none z-20" />
      )}

      {/* 6. Phosphor RGB Mask */}
      {powerOn && (
        <div
          className={`absolute inset-0 crt-rgb-mask mix-blend-overlay pointer-events-none z-20 ${
            cabinetStyle === 'trinitron' ? 'opacity-40' : cabinetStyle === 'portable' ? 'opacity-70' : 'opacity-60'
          }`}
        />
      )}

      {/* 7. Curved Glass Vignette & Reflection */}
      <div className={`absolute inset-0 crt-bezel-shadow pointer-events-none z-20 ${cabinetStyle === 'pure' ? 'opacity-40' : 'opacity-100'}`} />
      <div className={`absolute inset-0 crt-glass-reflection pointer-events-none z-20 ${cabinetStyle === 'trinitron' ? 'opacity-60' : 'opacity-100'}`} />

      {powerOn && interstitial && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
          <div className="px-3 py-1.5 rounded bg-black/80 border border-amber-500/70 font-vcr text-amber-300 text-sm tracking-widest uppercase drop-shadow">
            WE&apos;LL BE RIGHT BACK
          </div>
          <div className="font-pixel text-[9px] text-amber-200/80 tracking-widest">
            SPOT {interstitial.index} OF {interstitial.count}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              interstitial.onSkip?.();
            }}
            className="mt-1 px-3 py-1 rounded bg-black/70 border border-zinc-500/70 text-zinc-300 hover:text-white hover:border-amber-400/80 font-pixel text-[9px] tracking-widest cursor-pointer transition"
          >
            &#9654; BACK TO PROGRAM
          </button>
        </div>
      )}

      {powerOn && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            audio.playKnobClick();
            toggleScreenFullscreen();
          }}
          title={isScreenFullscreen ? 'Exit Fullscreen [F]' : 'Fullscreen Picture [F]'}
          aria-label={isScreenFullscreen ? 'Exit fullscreen' : 'Fullscreen picture'}
          className="absolute bottom-3 right-3 z-30 p-2 rounded-lg bg-black/65 border border-zinc-500/60 text-zinc-300 opacity-40 hover:opacity-100 hover:text-white hover:border-amber-400/70 focus:opacity-100 transition-all cursor-pointer active:scale-95"
        >
          {isScreenFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      )}

      {/* 8. Channel Switch "Zap" Flash */}
      {channelZap && (
        <div className="absolute inset-0 bg-white/45 pointer-events-none animate-pulse z-30" />
      )}

      {/* 9. Minimalist OSD Channel Badge on Change */}
      {powerOn && (osdVisible || showOsd) && (
        <div className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex items-center justify-between font-vcr text-phosphor-green text-2xl md:text-3xl tracking-wider uppercase font-bold drop-shadow-md">
          <div className="flex items-center gap-2">
            <span className="bg-black/80 px-2 py-0.5 rounded border border-green-500/50">
              CH {currentChannel?.number || '02'}
            </span>
            <span className="text-xl md:text-2xl text-green-300">
              {currentChannel?.callsign || 'W-ARCH'}
            </span>
            <span className="text-xs px-2 py-0.5 bg-green-950/90 text-green-300 border border-green-600/40 font-pixel">
              {currentChannel?.badge || 'AIR'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-pixel bg-black/80 px-2.5 py-1 rounded border border-green-500/40 text-green-300">
            {contentEra !== 'modern' && (
              <>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  contentEra === 'silent' ? 'bg-zinc-800 text-zinc-300 border border-zinc-600' :
                  contentEra === 'golden' ? 'bg-amber-950 text-amber-300 border border-amber-600/50' :
                  contentEra === 'early-color' ? 'bg-teal-950 text-teal-300 border border-teal-600/50' :
                  contentEra === 'broadcast' ? 'bg-blue-950 text-blue-300 border border-blue-600/50' :
                  'bg-purple-950 text-purple-300 border border-purple-600/50'
                }`}>
                  {contentEra === 'silent' ? 'SILENT ERA' :
                   contentEra === 'golden' ? 'GOLDEN AGE' :
                   contentEra === 'early-color' ? 'EARLY COLOR' :
                   contentEra === 'broadcast' ? '70s BROADCAST' :
                   'VHS ERA'}
                </span>
                <span>•</span>
              </>
            )}
            <span>{colorMode.toUpperCase()} MODE</span>
            <span>•</span>
            <span>{aspectRatio === 'auto' ? `AUTO (${effectiveAspectRatio})` : aspectRatio}</span>
          </div>
        </div>
      )}

      {/* 10. Autoplay Blocked / Unmute Overlay */}
      {powerOn && autoplayBlocked && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/90 border-2 border-yellow-400 text-yellow-300 px-4 py-2 rounded-xl flex items-center gap-2 font-pixel text-xs cursor-pointer hover:bg-yellow-950/90 shadow-2xl animate-pulse">
          <VolumeX className="w-4 h-4 text-yellow-400" />
          <span>AUDIO MUTED BY BROWSER • CLICK SCREEN TO UNMUTE</span>
        </div>
      )}

      {/* 11. Video Loading OSD */}
      {powerOn && videoLoading && activeEngine === 'direct' && !videoError && (
        <div className="absolute z-20 font-vcr text-phosphor-blue text-2xl md:text-3xl tracking-widest animate-pulse flex items-center gap-2 bg-black/70 px-4 py-2 border border-blue-500/50 rounded">
          <Radio className="w-6 h-6 animate-spin text-blue-400" />
          <span>RECEIVING SIGNAL...</span>
        </div>
      )}

      {/* 12. TV Off State */}
      {!powerOn && (
        <div className="absolute inset-0 bg-[#060706] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white/5 blur-sm" />
        </div>
      )}
    </div>
  );
});

export default CrtScreen;
