import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { AlertCircle, RefreshCw, Copy, Check, Tv, Play } from 'lucide-react';

export interface VideoPlayerRef {
  currentTime: number;
  duration: number;
  seekTo: (seconds: number) => void;
}

interface VideoPlayerProps {
  src: string;
  playing: boolean;
  volume: number;
  muted: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (e: { currentTarget: { currentTime: number; duration: number } }) => void;
  onLoadedMetadata?: (e: { currentTarget: { duration: number } }) => void;
  onReady?: () => void;
  onClick?: () => void;
  onSelectSample?: (url: string) => void;
}

export const SAMPLE_WORKING_STREAMS = [
  {
    name: 'بث تجريبي M3U8 (HLS Live)',
    type: 'M3U8',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  },
  {
    name: 'بث تجريبي TS (MPEG-TS)',
    type: 'TS',
    url: 'https://test-streams.mux.dev/x36xhzz/url_0/url_462/193039199_mp4_h264_aac_hd_7.ts'
  },
  {
    name: 'بث تجريبي MP4 مباشر',
    type: 'MP4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  }
];

// Helper to reliably extract YouTube Video ID from any URL or format
function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const str = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = str.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  return null;
}

// Global loader for YouTube IFrame API
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject();
  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve((window as any).YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const existing = document.getElementById('yt-iframe-api-script');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve((window as any).YT);
    };
    const interval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        clearInterval(interval);
        resolve((window as any).YT);
      }
    }, 100);
  });
  return ytApiPromise;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  src,
  playing,
  volume,
  muted,
  onPlay,
  onPause,
  onTimeUpdate,
  onLoadedMetadata,
  onReady,
  onClick,
  onSelectSample
}, ref) => {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<mpegts.Player | null>(null);
  const watchdogTimerRef = useRef<any>(null);
  const bufferingTimerRef = useRef<any>(null);

  const [streamMode, setStreamMode] = useState<'proxy' | 'direct'>('proxy');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [showBadges, setShowBadges] = useState<boolean>(true);
  const badgeHideTimerRef = useRef<any>(null);

  const triggerBadgeAutoHide = useCallback(() => {
    if (badgeHideTimerRef.current) {
      clearTimeout(badgeHideTimerRef.current);
    }
    setShowBadges(true);
    badgeHideTimerRef.current = setTimeout(() => {
      setShowBadges(false);
    }, 3000);
  }, []);

  const setBufferingDebounced = (buffering: boolean) => {
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }
    if (buffering) {
      bufferingTimerRef.current = setTimeout(() => {
        setIsBuffering(true);
      }, 800);
    } else {
      setIsBuffering(false);
    }
  };
  const [loadError, setLoadError] = useState<{ title: string; detail: string; status?: number; isCloudflare?: boolean } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Helper to detect stream type
  const ytVideoId = extractYouTubeId(src);
  const isYouTube = !!ytVideoId || (!src.startsWith('/') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('blob:') && !src.includes('.m3u8') && !src.includes('.ts') && !src.includes('.mp4') && !src.includes('/stream/') && !src.includes('/channel/') && !src.includes('/live/'));

  const isM3u8 = src.includes('.m3u8') || src.includes('/hls/') || src.includes('format=m3u8') || src.includes('type=m3u8');
  const isTs = src.includes('.ts') || src.includes('/ts/') || src.includes('format=ts') || src.includes('type=ts') || src.endsWith('.ts') || src.includes('/stream/') || src.includes('/channel/') || src.includes('/live/') || src.includes(':8444') || src.includes(':8080') || src.includes(':2052') || src.includes(':2082') || src.includes(':2086') || src.includes(':2095');
  const isMp4 = src.includes('.mp4') || src.includes('.mkv') || src.includes('.webm');

  // Format label for UI badge
  const formatLabel = isYouTube 
    ? 'YouTube' 
    : isM3u8 
    ? 'HLS / M3U8' 
    : isTs 
    ? 'MPEG-TS / IPTV Live' 
    : isMp4 
    ? 'Direct Video (MP4)' 
    : 'Live Stream';

  // Port mapping helper for secure Direct Mode to bypass Mixed Content & CORS when possible
  const getDirectSrc = useCallback((rawSrc: string): string => {
    if (!rawSrc) return '';
    if (rawSrc.startsWith('/uploads/') || rawSrc.startsWith('/api/') || rawSrc.startsWith('blob:')) return rawSrc;
    try {
      const url = new URL(rawSrc);
      if (url.protocol === 'http:') {
        url.protocol = 'https:';
        if (url.port === '2052') {
          url.port = '2053';
        } else if (url.port === '8080') {
          url.port = '8443';
        } else if (url.port === '2082') {
          url.port = '2083';
        } else if (url.port === '2086') {
          url.port = '2087';
        } else if (url.port === '2095') {
          url.port = '2096';
        } else if (url.port === '80' || !url.port) {
          url.port = '';
        }
      }
      return url.toString();
    } catch (e) {
      return rawSrc.replace(/^http:/i, 'https:');
    }
  }, []);

  // Compute effective stream URL
  const getEffectiveSrc = useCallback((rawSrc: string, mode: 'proxy' | 'direct'): string => {
    if (!rawSrc) return '';
    if (isYouTube) return rawSrc;
    if (rawSrc.startsWith('/uploads/') || rawSrc.startsWith('/api/')) return rawSrc;
    if (rawSrc.startsWith('blob:')) return rawSrc;

    if (mode === 'direct') {
      return getDirectSrc(rawSrc);
    }

    // Proxy mode (Default) - All external http/https streams routed through server proxy to bypass Mixed Content & CORS
    if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://')) {
      return `/api/proxy-stream?url=${encodeURIComponent(rawSrc)}`;
    }
    return rawSrc;
  }, [isYouTube, getDirectSrc]);

  // Expose uniform player ref for seeking and time tracking
  useImperativeHandle(ref, () => ({
    get currentTime() {
      if (isYouTube && ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
            return ytPlayerRef.current.getCurrentTime() || 0;
          }
        } catch (e) {}
      }
      return videoElRef.current?.currentTime || 0;
    },
    set currentTime(val: number) {
      const target = Number(val);
      if (isNaN(target)) return;

      if (isYouTube && ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.seekTo === 'function') {
            ytPlayerRef.current.seekTo(target, true);
          }
        } catch (e) {}
      } else if (videoElRef.current) {
        try {
          videoElRef.current.currentTime = target;
        } catch (e) {}
      }
    },
    get duration() {
      if (isYouTube && ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.getDuration === 'function') {
            return ytPlayerRef.current.getDuration() || 0;
          }
        } catch (e) {}
      }
      return videoElRef.current?.duration || 0;
    },
    seekTo(seconds: number) {
      const target = Number(seconds);
      if (isNaN(target)) return;

      if (isYouTube && ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.seekTo === 'function') {
            ytPlayerRef.current.seekTo(target, true);
          }
        } catch (e) {}
      } else if (videoElRef.current) {
        try {
          videoElRef.current.currentTime = target;
        } catch (e) {}
      }
    }
  }), [isYouTube]);

  // Clean up previous stream engines
  const cleanupEngines = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      try {
        mpegtsRef.current.unload();
        mpegtsRef.current.detachMediaElement();
        mpegtsRef.current.destroy();
      } catch (e) {}
      mpegtsRef.current = null;
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch (e) {}
      ytPlayerRef.current = null;
    }
  }, []);

  // Copy URL to clipboard
  const handleCopyUrl = () => {
    if (!src) return;
    navigator.clipboard.writeText(src).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Trigger manual retry
  const handleRetry = () => {
    setLoadError(null);
    setIsLoading(true);
    setIsBuffering(false);
    setRetryCount(prev => prev + 1);
  };

  // Stable refs for callbacks and dynamic props to prevent setup effect from re-running
  const playingRef = useRef(playing);
  const onReadyRef = useRef(onReady);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Global handler to catch and prevent browser unhandled rejection for media element AbortError
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.name === 'AbortError' || 
        event.reason?.name === 'NotAllowedError' ||
        (typeof event.reason?.message === 'string' && event.reason.message.includes('interrupted by a call to pause'))
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const safePlay = useCallback(() => {
    const video = videoElRef.current;
    if (!video) return;
    playingRef.current = true;
    try {
      if (video.paused) {
        const promise = video.play();
        if (promise !== undefined && typeof promise.then === 'function') {
          playPromiseRef.current = promise;
          promise
            .then(() => {
              if (playPromiseRef.current === promise) {
                playPromiseRef.current = null;
              }
              if (!playingRef.current && video && !video.paused) {
                try { video.pause(); } catch (e) {}
              }
            })
            .catch((err: any) => {
              if (playPromiseRef.current === promise) {
                playPromiseRef.current = null;
              }
              if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
                console.debug('Playback play error:', err);
              }
            });
        }
      }
    } catch (e) {
      playPromiseRef.current = null;
    }
  }, []);

  const safePause = useCallback(() => {
    const video = videoElRef.current;
    if (!video) return;
    playingRef.current = false;
    try {
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            if (!playingRef.current && video && !video.paused) {
              try { video.pause(); } catch (e) {}
            }
          })
          .catch(() => {
            if (!playingRef.current && video && !video.paused) {
              try { video.pause(); } catch (e) {}
            }
          });
      } else {
        if (!video.paused) {
          try { video.pause(); } catch (e) {}
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // YouTube IFrame Player Lifecycle
  useEffect(() => {
    if (!isYouTube) return;

    let isMounted = true;
    const targetVideoId = ytVideoId || src;

    setIsLoading(true);
    setLoadError(null);
    setIsBuffering(false);

    loadYouTubeApi().then((YT) => {
      if (!isMounted || !ytContainerRef.current) return;

      // Clean up previous YouTube player instance
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }

      // Create a fresh inner mount element
      const playerDiv = document.createElement('div');
      playerDiv.style.width = '100%';
      playerDiv.style.height = '100%';
      ytContainerRef.current.innerHTML = '';
      ytContainerRef.current.appendChild(playerDiv);

      const player = new YT.Player(playerDiv, {
        videoId: targetVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: playing ? 1 : 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            ytPlayerRef.current = event.target;
            setIsLoading(false);
            setLoadError(null);

            try {
              event.target.setVolume(muted ? 0 : Math.round(volume * 100));
              if (muted || volume === 0) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
              if (playingRef.current) {
                event.target.playVideo();
              }
              const d = event.target.getDuration();
              if (d && !isNaN(d)) {
                onLoadedMetadata?.({ currentTarget: { duration: d } } as any);
              }
            } catch (e) {}

            onReadyRef.current?.();
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
            if (event.data === 1) { // PLAYING
              setIsLoading(false);
              setIsBuffering(false);
              triggerBadgeAutoHide();
              onPlay?.();
            } else if (event.data === 2) { // PAUSED
              setIsBuffering(false);
              setShowBadges(true);
              onPause?.();
            } else if (event.data === 3) { // BUFFERING
              setIsBuffering(true);
              setShowBadges(true);
            } else if (event.data === 0) { // ENDED
              setIsBuffering(false);
              setShowBadges(true);
              onPause?.();
            }
          },
          onError: (event: any) => {
            if (!isMounted) return;
            setIsLoading(false);
            setIsBuffering(false);
            const errorCode = event.data;
            let detail = 'تعذر تشغيل فيديو يوتيوب. قد يكون الفيديو خاصاً أو تم حذفه.';
            if (errorCode === 101 || errorCode === 150) {
              detail = 'صاحب الفيديو منع تضمينه في المواقع الخارجية. يرجى تجربة فيديو آخر أو اختيار فيديو من شريط البحث.';
            }
            setLoadError({
              title: 'تعذر تشغيل فيديو يوتيوب',
              detail
            });
          }
        }
      });
    }).catch((err) => {
      console.warn("YouTube API load error:", err);
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }
    };
  }, [src, isYouTube, retryCount]);

  // YouTube Time Update Polling Interval
  useEffect(() => {
    if (!isYouTube) return;
    const interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = ytPlayerRef.current.getCurrentTime() || 0;
          const d = ytPlayerRef.current.getDuration() || 0;
          onTimeUpdate?.({
            currentTarget: {
              currentTime,
              duration: d
            }
          } as any);
        } catch (e) {}
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isYouTube, onTimeUpdate]);

  // YouTube Sync Play/Pause
  useEffect(() => {
    if (!isYouTube || !ytPlayerRef.current) return;
    try {
      if (typeof ytPlayerRef.current.getPlayerState === 'function') {
        const state = ytPlayerRef.current.getPlayerState();
        if (playing && state !== 1 && state !== 3) {
          ytPlayerRef.current.playVideo();
        } else if (!playing && state === 1) {
          ytPlayerRef.current.pauseVideo();
        }
      }
    } catch (e) {}
  }, [playing, isYouTube]);

  // YouTube Sync Volume & Mute
  useEffect(() => {
    if (!isYouTube || !ytPlayerRef.current) return;
    try {
      if (typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(muted ? 0 : Math.round(volume * 100));
        if (muted || volume === 0) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
        }
      }
    } catch (e) {}
  }, [volume, muted, isYouTube]);

  // HTML5 / HLS / MPEG-TS Stream Setup Effect
  useEffect(() => {
    if (isYouTube) return;

    const video = videoElRef.current;
    if (!video || !src) return;

    cleanupEngines();
    setLoadError(null);
    setIsLoading(true);
    setIsBuffering(false);
    setShowBadges(true);

    const effectiveSrc = getEffectiveSrc(src, streamMode);

    // Set safety watchdog timer (10 seconds maximum). If nothing starts playing or loads, show diagnostics without overriding user mode!
    watchdogTimerRef.current = setTimeout(() => {
      if (isLoading && !loadError) {
        setIsLoading(false);
        setIsBuffering(false);

        const isCloudflareLikely = src.includes('maxshowplayer') || src.includes(':2052') || src.includes(':8080');
        setLoadError({
          title: isCloudflareLikely ? 'سيرفر البث يرفض الاتصال (403 Forbidden)' : 'استغرق البث وقتاً أطول من المعتاد للاستجابة',
          detail: isCloudflareLikely 
            ? 'سيرفر البث يفرض قيود جدار حماية Cloudflare تمنع تشغيله على خوادم سحابية، أو أن الاشتراك غير مفعل.' 
            : 'لم يتمكن المشغل من تلقي بيانات البث من السيرفر المصدر. يمكنك تجربة زر التبديل أو إعادة المحاولة.',
          isCloudflare: isCloudflareLikely
        });
      }
    }, 10000);

    // 1. MPEG-TS Live Stream Engine
    if (isTs) {
      if (mpegts.isSupported()) {
        try {
          const player = mpegts.createPlayer({
            type: 'mse',
            isLive: true,
            url: effectiveSrc,
            cors: true
          }, {
            enableWorker: true,
            lazyLoad: false,
            deferLoadAfterSourceOpen: false,
            enableStashBuffer: true,
            stashInitialSize: 512 * 1024,
            liveBufferLatencyChasing: false,
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 30,
            autoCleanupMinBackwardDuration: 15,
          });

          player.attachMediaElement(video);
          player.load();

          player.on(mpegts.Events.MEDIA_INFO, () => {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            setIsLoading(false);
            setIsBuffering(false);
            setLoadError(null);
            onReadyRef.current?.();
          });

          player.on(mpegts.Events.ERROR, (errType, errDetail, errInfo) => {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            console.warn('mpegts error:', errType, errDetail, errInfo);

            setIsLoading(false);
            setIsBuffering(false);
            
            const isCloudflare = src.includes('maxshowplayer') || src.includes(':2052') || src.includes(':8080');
            setLoadError({
              title: isCloudflare ? 'خطأ في بث TS (حظر 403 Forbidden)' : 'تعذر تشغيل بث MPEG-TS',
              detail: isCloudflare 
                ? 'سيرفر البث محمي بواسطة Cloudflare أو أن القناة غير متوفرة.' 
                : 'حدث خطأ أثناء فك تشفير وسائط MPEG-TS من المصدر.',
              isCloudflare
            });
          });

          if (playingRef.current) {
            safePlay();
          }

          mpegtsRef.current = player;
          return;
        } catch (e: any) {
          console.error("MPEG-TS init exception:", e);
        }
      }
    }

    // 2. HLS / M3U8 Stream Engine
    if (isM3u8) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          }
        });

        hls.loadSource(effectiveSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
          setIsLoading(false);
          setIsBuffering(false);
          setLoadError(null);
          onReadyRef.current?.();
          if (playingRef.current) {
            safePlay();
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            console.warn("HLS fatal error:", data.type, data.details);

            setIsLoading(false);
            setIsBuffering(false);

            const isCloudflare = src.includes('maxshowplayer') || src.includes(':2052') || src.includes(':8080');
            setLoadError({
              title: isCloudflare ? 'سيرفر HLS يرفض الاتصال (403)' : 'تعذر تحميل بث HLS (M3U8)',
              detail: isCloudflare 
                ? 'سيرفر البث يمنع الوصول من السيرفرات السحابية. يرجى التبديل إلى الوضع المباشر.' 
                : 'حدث خطأ في قراءة ملف M3U8 أو أجزاء الفيديو من المصدر.',
              isCloudflare
            });
          }
        });

        hlsRef.current = hls;
        return;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = effectiveSrc;
        if (playingRef.current) {
          safePlay();
        }
        return;
      }
    }

    // 3. Direct HTML5 Video (MP4, MKV, WebM, uploads)
    video.src = effectiveSrc;
    if (playingRef.current) {
      safePlay();
    }

    return () => {
      cleanupEngines();
    };
  }, [src, isTs, isM3u8, isYouTube, cleanupEngines, getEffectiveSrc, retryCount, streamMode, safePlay]);

  // Sync play/pause state
  useEffect(() => {
    if (isYouTube) return;
    if (playing) {
      safePlay();
    } else {
      safePause();
    }
  }, [playing, isYouTube, safePlay, safePause]);

  // Sync volume and mute
  useEffect(() => {
    if (isYouTube) return;
    const video = videoElRef.current;
    if (!video) return;
    video.volume = muted ? 0 : volume;
    video.muted = muted;
  }, [volume, muted, isYouTube]);

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none"
      onMouseMove={() => {
        if (playing && !isLoading && !isBuffering && !loadError) {
          triggerBadgeAutoHide();
        } else {
          setShowBadges(true);
        }
      }}
      onTouchStart={() => {
        if (playing && !isLoading && !isBuffering && !loadError) {
          triggerBadgeAutoHide();
        } else {
          setShowBadges(true);
        }
      }}
    >
      {/* YouTube Direct View Container */}
      {isYouTube ? (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <div 
            ref={ytContainerRef}
            className="w-full h-full absolute inset-0 pointer-events-auto"
            id="youtube-player-container"
          />
        </div>
      ) : (
        <video
          ref={videoElRef}
          className="w-full h-full object-contain"
          playsInline
          crossOrigin="anonymous"
          onLoadStart={() => {
            setIsLoading(true);
            setLoadError(null);
            setShowBadges(true);
          }}
          onWaiting={() => {
            setBufferingDebounced(true);
            setShowBadges(true);
          }}
          onCanPlay={() => {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            setIsLoading(false);
            setBufferingDebounced(false);
            setLoadError(null);
          }}
          onPlaying={() => {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            setIsLoading(false);
            setBufferingDebounced(false);
            setLoadError(null);
            triggerBadgeAutoHide();
            onPlay?.();
          }}
          onPause={() => {
            setBufferingDebounced(false);
            setShowBadges(true);
            onPause?.();
          }}
          onTimeUpdate={e => {
            onTimeUpdate?.({
              currentTarget: {
                currentTime: e.currentTarget.currentTime,
                duration: e.currentTarget.duration || 0
              }
            });
          }}
          onLoadedMetadata={e => {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            setIsLoading(false);
            setIsBuffering(false);
            setLoadError(null);
            onLoadedMetadata?.({
              currentTarget: {
                duration: e.currentTarget.duration || 0
              }
            });
            onReady?.();
          }}
          onError={(e) => {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            console.warn("Video element load error event triggered:", e.type);

            setIsLoading(false);
            setIsBuffering(false);
            setShowBadges(true);

            const isCloudflareLikely = src.includes('maxshowplayer') || src.includes(':2052') || src.includes(':8080');

            setLoadError({
              title: isCloudflareLikely ? 'سيرفر البث يرفض الاتصال (403 Forbidden)' : 'تعذر تحميل ملف الفيديو من السيرفر المصدر',
              detail: isCloudflareLikely 
                ? 'السيرفر محمي بحماية Cloudflare Bot Protection تمنع تشغيله، أو أن اشتراك القناة/الفيلم غير مفعل.' 
                : 'السيرفر المصدر رفض الطلب أو أن صيغة الملف غير مدعومة.',
              isCloudflare: isCloudflareLikely
            });
          }}
        />
      )}

      {/* Format Badge (Top-Left) - Auto-hides 3 seconds after playback starts */}
      <div 
        className={`absolute top-3 left-3 z-40 flex flex-wrap items-center gap-2 transition-all duration-700 ${
          (showBadges || isLoading || isBuffering || loadError || !playing)
            ? 'opacity-100 pointer-events-auto translate-y-0' 
            : 'opacity-0 pointer-events-none -translate-y-2'
        }`}
      >
        <span className="bg-black/85 backdrop-blur-md text-white/90 text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg select-none">
          <span className={`w-2 h-2 rounded-full ${loadError ? 'bg-red-500' : isLoading ? 'bg-yellow-400 animate-ping' : 'bg-emerald-400'}`}></span>
          {formatLabel}
        </span>
        {!isYouTube && (src.startsWith('http://') || src.startsWith('https://')) && (
          <button
            type="button"
            onClick={() => {
              setStreamMode(prev => prev === 'proxy' ? 'direct' : 'proxy');
              setLoadError(null);
              setIsLoading(true);
              setShowBadges(true);
            }}
            className="bg-red-600 hover:bg-red-500 text-white text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full border border-red-500/35 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            title="انقر لتغيير وضع التشغيل"
          >
            {streamMode === 'proxy' ? '🛡️ وضع البروكسي' : '🌐 وضع مباشر (Direct)'}
            <span className="text-[9px] bg-black/30 px-1.5 py-0.2 rounded-full text-white/80">تغيير</span>
          </button>
        )}
      </div>

      {/* Loading & Buffering Spinner Overlay */}
      {(isLoading || isBuffering) && !loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[2px] transition-all pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin"></div>
            <div className="absolute w-8 h-8 rounded-full bg-red-500/20 animate-pulse"></div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-1.5 text-center px-4">
            <p className="text-sm sm:text-base font-bold text-white tracking-wide">
              {isLoading ? 'جاري الاتصال والتحميل...' : 'جاري التخزين المؤقت (Buffering)...'}
            </p>
            <p className="text-xs text-gray-400 font-mono max-w-xs truncate" dir="ltr">
              {src}
            </p>
          </div>
        </div>
      )}

      {/* Comprehensive Error & Diagnostic Overlay */}
      {loadError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-white p-6 text-center animate-in fade-in duration-200 overflow-y-auto pointer-events-auto">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-lg shadow-red-500/10 shrink-0">
            <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
            {loadError.title}
          </h3>

          <p className="text-xs sm:text-sm text-gray-300 max-w-md mb-3 leading-relaxed">
            {loadError.detail}
          </p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-w-md w-full mb-4 text-right" dir="rtl">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
              <span>🔍 تشخيص الرابط ونظام التشغيل:</span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono break-all mb-2" dir="ltr">
              {src}
            </p>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              {streamMode === 'proxy' 
                ? '⚠️ البث يمر حالياً عبر "البروتوكول السحابي (Proxy)". إذا كان سيرفر IPTV الخاص بك محمي أو مشفر بواسطة Cloudflare، فقد يعيد خطأ 403. يرجى التبديل إلى "الوضع المباشر (Direct)" لتشغيل الرابط فوراً باستخدام شبكتك المنزلية وتفادي حظر الخوادم السحابية.'
                : '🌐 البث يعمل بـ "الوضع المباشر (Direct)" وتمت ترقية الرابط تلقائياً لبروتوكول HTTPS آمن لتفادي حظر المتصفح للمحتوى المختلط. إذا كان السيرفر لا يتقبل ترقية المنافذ، جرب تبديله للبروكسي.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md mb-4">
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-lg shadow-red-600/25 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>

            {!isYouTube && (
              <button
                type="button"
                onClick={() => {
                  setStreamMode(prev => prev === 'proxy' ? 'direct' : 'proxy');
                  setLoadError(null);
                  setIsLoading(true);
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold border border-white/15 transition-all cursor-pointer"
              >
                {streamMode === 'proxy' ? '🌐 تبديل للوضع المباشر (Direct)' : '🛡️ تبديل لوضع البروكسي (Proxy)'}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium border border-white/10 transition-all cursor-pointer"
              title="نسخ الرابط"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>
          </div>

          {/* Working Test Stream Suggestions */}
          <div className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-xl p-3 text-right" dir="rtl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-2">
              <Tv className="w-3.5 h-3.5 text-red-400" />
              <span>أو جرّب أحد البثوث التجريبية الجاهزة للتأكد من المشغل:</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_WORKING_STREAMS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectSample?.(sample.url)}
                  className="flex items-center justify-between bg-black/40 hover:bg-white/10 border border-white/5 hover:border-white/20 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-gray-200 font-medium">{sample.name}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-400">
                    {sample.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transparent Click Overlay to Play/Pause for Video Element */}
      {!isYouTube && !loadError && (
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={onClick}
        />
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
