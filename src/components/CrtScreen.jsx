import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import { Radio, VolumeX } from 'lucide-react';
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
    activeEngine = 'direct',
    _onEngineChange,
    onTimeUpdateReport,
  },
  ref
) {
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);

  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [osdVisible, setOsdVisible] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [detectedAspectRatio, setDetectedAspectRatio] = useState('4:3');

  // Direct candidate streams & graceful fallback state
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [streamFailedAll, setStreamFailedAll] = useState(false);
  const [embedTime, setEmbedTime] = useState(0);
  const [embedPlaying, setEmbedPlaying] = useState(true);

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

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && onTimeUpdateReport) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || duration || currentProgram?.duration || 0;
      if (cur > 0) setVideoLoading(false);
      onTimeUpdateReport(cur, dur, !videoRef.current.paused);
    }
  }, [duration, currentProgram?.duration, onTimeUpdateReport]);

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
        setEmbedTime(target);
        if (onTimeUpdateReport) {
          onTimeUpdateReport(target, dur, embedPlaying);
        }
        if (iframeRef.current?.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage({ method: 'seek', value: target }, '*');
            iframeRef.current.contentWindow.postMessage({ event: 'seek', value: target }, '*');
          } catch {}
        }
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
        setEmbedPlaying((prev) => {
          const next = !prev;
          if (iframeRef.current?.contentWindow) {
            try {
              iframeRef.current.contentWindow.postMessage({ method: next ? 'play' : 'pause' }, '*');
            } catch {}
          }
          if (onTimeUpdateReport) {
            onTimeUpdateReport(embedTime, duration || currentProgram?.duration || 3600, next);
          }
          return next;
        });
      }
    },
    restart: () => {
      if (canPlayDirect && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
        handleTimeUpdate();
      } else {
        setEmbedTime(0);
        setEmbedPlaying(true);
        if (iframeRef.current) {
          const baseEmbed =
            currentProgram?.embedUrl ||
            `https://archive.org/embed/${currentProgram?.identifier}?autoplay=1`;
          iframeRef.current.src = baseEmbed;
        }
        if (onTimeUpdateReport) {
          onTimeUpdateReport(0, duration || currentProgram?.duration || 3600, true);
        }
      }
      if (onRestartProgram) onRestartProgram();
    },
  }));

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Reset timestamps and stream index on program/channel change
  useEffect(() => {
    setCandidateIndex(0);
    setStreamFailedAll(false);
    setVideoError(null);
    setAutoplayBlocked(false);
    const initialSeek = currentProgram?.seekSeconds || 0;
    const initialDur = currentProgram?.duration || 0;
    setDuration(initialDur);
    setEmbedTime(initialSeek);
    setEmbedPlaying(true);
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

  // Tube Embed playback clock: ensures VCR counter & scrubber track real time even in embed mode
  useEffect(() => {
    if (!powerOn || canPlayDirect) return;
    if (!embedPlaying) return;

    const embedInterval = setInterval(() => {
      setEmbedTime((prev) => {
        const dur = duration || currentProgram?.duration || 3600;
        const nextTime = Math.min(dur, prev + 0.5 * playbackRate);
        if (onTimeUpdateReport) {
          onTimeUpdateReport(nextTime, dur, true);
        }
        return nextTime;
      });
    }, 500);

    return () => clearInterval(embedInterval);
  }, [powerOn, canPlayDirect, embedPlaying, playbackRate, duration, currentProgram?.duration, onTimeUpdateReport]);

  // PostMessage listener to sync timestamps from iframe if emitted
  useEffect(() => {
    const handleMessage = (e) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;
        if (typeof data.currentTime === 'number' && !isNaN(data.currentTime)) {
          setEmbedTime(data.currentTime);
          if (data.duration && !isNaN(data.duration)) setDuration(data.duration);
          if (onTimeUpdateReport) {
            onTimeUpdateReport(data.currentTime, data.duration || duration, true);
          }
        } else if (data.event === 'timeupdate' && typeof data.value === 'number') {
          setEmbedTime(data.value);
          if (onTimeUpdateReport) {
            onTimeUpdateReport(data.value, duration, true);
          }
        } else if (data.event === 'pause') {
          setEmbedPlaying(false);
        } else if (data.event === 'play') {
          setEmbedPlaying(true);
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [duration, onTimeUpdateReport]);

  const isOffAir =
    !currentProgram ||
    (!currentProgram.videoUrl && !currentProgram.embedUrl && !currentProgram.identifier);

  // Static intensity calculation
  const calculatedStatic = isOffAir
    ? Math.min(
        1,
        (channelZap ? 0.95 : 0) +
          Math.abs(trackingOffset) / 70 +
          ((100 - signalQuality) / 100) * 0.7
      )
    : Math.min(
        1,
        (channelZap ? 0.95 : 0) +
          (videoLoading && activeEngine === 'direct' ? 0.35 : 0) +
          (videoError && activeEngine === 'direct' ? 0.85 : 0) +
          Math.abs(trackingOffset) / 70 +
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

  // Volume sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = muted ? 0 : volume;
      videoRef.current.muted = muted;
      if (!muted && autoplayBlocked) {
        setAutoplayBlocked(false);
      }
    }
  }, [volume, muted, autoplayBlocked]);

  // Direct video source load with graceful autoplay policy handling & candidate stream rotation
  useEffect(() => {
    if (!canPlayDirect || !activeVideoUrl || !powerOn) {
      setVideoLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (video.src !== activeVideoUrl) {
      setVideoLoading(true);
      video.src = activeVideoUrl;
      video.load();
    }

    const handleLoadedMetadata = () => {
      setVideoLoading(false);
      const dur = video.duration || currentProgram?.duration || 0;
      if (dur > 0) setDuration(dur);

      if (liveTvMode && currentProgram?.seekSeconds && video.duration) {
        video.currentTime = currentProgram.seekSeconds % video.duration;
      } else if (currentProgram?.seekSeconds) {
        video.currentTime = currentProgram.seekSeconds;
      } else {
        video.currentTime = 0;
      }

      if (onTimeUpdateReport) {
        onTimeUpdateReport(video.currentTime, dur, !video.paused);
      }

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

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [activeVideoUrl, canPlayDirect, powerOn, liveTvMode, currentProgram?.seekSeconds, onTimeUpdateReport]);

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

  // Build filter style for color modes and brightness
  const getFilterStyle = () => {
    let f = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (colorMode === 'bw') {
      f += ' grayscale(100%)';
    } else if (colorMode === 'amber') {
      f += ' sepia(100%) hue-rotate(10deg) saturate(320%)';
    } else if (colorMode === 'green') {
      f += ' sepia(100%) hue-rotate(80deg) saturate(320%)';
    }
    return f;
  };

  return (
    <div
      onClick={handleScreenClick}
      className={`relative w-full h-full bg-[#050706] overflow-hidden flex items-center justify-center select-none ${
        curvatureEnabled ? 'crt-curved' : ''
      }`}
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
      {powerOn && !canPlayDirect && (currentProgram?.embedUrl || currentProgram?.identifier) && (
        <div
          className="absolute inset-0 w-full h-full bg-black flex items-center justify-center z-10"
          style={{ filter: getFilterStyle() }}
        >
          <iframe
            ref={iframeRef}
            src={currentProgram.embedUrl || `https://archive.org/embed/${currentProgram.identifier}?autoplay=1`}
            title={currentProgram.title}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setVideoLoading(false)}
          />
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
            <div className="bg-[#0e0c12]/95 border-3 border-amber-500 rounded-2xl p-4 md:p-5 shadow-[0_0_35px_rgba(0,0,0,0.95)] max-w-sm w-full text-center flex flex-col items-center">
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
            opacity: Math.max(0.12, Math.abs(trackingOffset) / 40),
            animationDuration: `${Math.max(2, 12 - Math.abs(trackingOffset) / 5)}s`,
          }}
        />
      )}

      {/* 5. CRT Scanlines Overlay */}
      {powerOn && scanlinesEnabled && (
        <div className="absolute inset-0 crt-scanlines pointer-events-none z-20" />
      )}

      {/* 6. Phosphor RGB Mask */}
      {powerOn && (
        <div className="absolute inset-0 crt-rgb-mask mix-blend-overlay opacity-60 pointer-events-none z-20" />
      )}

      {/* 7. Curved Glass Vignette & Reflection */}
      <div className="absolute inset-0 crt-bezel-shadow pointer-events-none z-20" />
      <div className="absolute inset-0 crt-glass-reflection pointer-events-none z-20" />

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
