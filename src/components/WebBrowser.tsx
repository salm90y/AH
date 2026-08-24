import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Search, 
  ShieldCheck, 
  Play, 
  ExternalLink, 
  X, 
  Sparkles, 
  Layers, 
  Zap, 
  Maximize2, 
  Minimize2, 
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Tv,
  Film,
  Compass,
  CornerDownLeft,
  TrendingUp
} from 'lucide-react';

interface ExtractedStream {
  url: string;
  format?: string;
  quality?: string;
  resolution?: string;
  type?: string;
  isDirect?: boolean;
}

interface WebBrowserProps {
  initialUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onPlayInRoom: (streamUrl: string, title?: string) => void;
  onSaveToPlaylist?: (streamUrl: string, title?: string) => void;
}

export const WebBrowser: React.FC<WebBrowserProps> = ({
  initialUrl = 'https://www.google.com/search?igu=1&q=',
  isOpen,
  onClose,
  onPlayInRoom,
  onSaveToPlaylist
}) => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [proxyMode, setProxyMode] = useState<'proxy' | 'direct'>('proxy');
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExtractedDrawer, setShowExtractedDrawer] = useState(false);
  
  // Instant Search Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Streams and Detected Videos
  const [detectedVideos, setDetectedVideos] = useState<Array<{ url: string; title: string; timestamp: number }>>([]);
  const [extractedStreams, setExtractedStreams] = useState<ExtractedStream[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initialUrl
  useEffect(() => {
    if (initialUrl && initialUrl !== currentUrl) {
      navigateTo(initialUrl);
    }
  }, [initialUrl]);

  // Click outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Instant Search Suggestions
  useEffect(() => {
    const trimmed = inputUrl.trim();
    if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
          setSelectedSuggestionIdx(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 150);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [inputUrl]);

  // Listen for messages from inside proxy iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // Handle video detected by injected script
      if (data.type === 'TRANSFERRED_VIDEO_DETECTED' || data.type === 'RAVE_VIDEO_DETECTED') {
        const videoUrl = data.videoUrl || data.url;
        if (videoUrl && typeof videoUrl === 'string') {
          const cleanUrl = videoUrl.trim();
          setDetectedVideos(prev => {
            if (prev.some(v => v.url === cleanUrl)) return prev;
            return [{ url: cleanUrl, title: data.title || 'فيديو مكتشف', timestamp: Date.now() }, ...prev];
          });
        }
      }

      // Handle in-iframe navigation
      if (data.type === 'PROXY_NAVIGATION' || data.type === 'NAVIGATE_TO') {
        if (data.url && typeof data.url === 'string') {
          setInputUrl(data.url);
          setCurrentUrl(data.url);
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const formatTargetUrl = (urlStr: string) => {
    let clean = urlStr.trim();
    if (!clean) return 'https://www.google.com/search?igu=1&q=';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.includes('.') && !clean.includes(' ')) {
        clean = 'https://' + clean;
      } else {
        clean = `https://www.google.com/search?igu=1&q=${encodeURIComponent(clean)}`;
      }
    }
    if (clean.includes('google.com') && !clean.includes('igu=1')) {
      clean += (clean.includes('?') ? '&' : '?') + 'igu=1';
    }
    return clean;
  };

  const navigateTo = (urlStr: string) => {
    setShowSuggestions(false);
    const formatted = formatTargetUrl(urlStr);
    setInputUrl(formatted);
    setCurrentUrl(formatted);
    setIsLoading(true);
    setExtractError(null);

    // Update history
    setHistory(prev => {
      const newHist = prev.slice(0, historyIndex + 1);
      newHist.push(formatted);
      return newHist;
    });
    setHistoryIndex(prev => prev + 1);

    // Auto extract streams in background
    triggerDeepExtraction(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIdx(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIdx(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIdx >= 0 && selectedSuggestionIdx < suggestions.length) {
        e.preventDefault();
        navigateTo(suggestions[selectedSuggestionIdx]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const prevUrl = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setInputUrl(prevUrl);
      setCurrentUrl(prevUrl);
      setIsLoading(true);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const nextUrl = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setInputUrl(nextUrl);
      setCurrentUrl(nextUrl);
      setIsLoading(true);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setReloadKey(k => k + 1);
    forceBypassOverlays();
  };

  const triggerDeepExtraction = async (targetUrl: string) => {
    if (!targetUrl || targetUrl.includes('google.com/search')) return;
    setIsExtracting(true);
    try {
      const res = await fetch('/api/extract-web-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      if (data.success && data.streams && data.streams.length > 0) {
        setExtractedStreams(data.streams);
        data.streams.forEach((st: ExtractedStream) => {
          setDetectedVideos(prev => {
            if (prev.some(v => v.url === st.url)) return prev;
            return [{ url: st.url, title: data.title || `${st.format || 'فيديو'} (${st.quality || 'مباشر'})`, timestamp: Date.now() }, ...prev];
          });
        });
      }
    } catch (e) {
      // Background extraction failure is non-blocking
    } finally {
      setIsExtracting(false);
    }
  };

  const forceBypassOverlays = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'BYPASS_MODALS' }, '*');
        iframeRef.current.contentWindow.postMessage({ type: 'FORCE_UNLOCK' }, '*');
      }
    } catch (e) {}
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  if (!isOpen) return null;

  // Build the effective iframe source
  const iframeSrc = proxyMode === 'proxy'
    ? `/api/proxy-web-page?url=${encodeURIComponent(currentUrl)}`
    : currentUrl;

  const quickSites = [
    { name: 'Google', url: 'https://www.google.com/search?igu=1&q=', color: 'text-blue-400', border: 'border-blue-500/30' },
    { name: 'YouTube', url: 'https://m.youtube.com', color: 'text-red-400', border: 'border-red-500/30' },
    { name: 'Dailymotion', url: 'https://www.dailymotion.com', color: 'text-sky-400', border: 'border-sky-500/30' },
    { name: 'Vimeo', url: 'https://vimeo.com/watch', color: 'text-teal-400', border: 'border-teal-500/30' },
    { name: 'Twitch', url: 'https://m.twitch.tv', color: 'text-purple-400', border: 'border-purple-500/30' }
  ];

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-1 sm:p-3 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div 
        ref={containerRef}
        className={`bg-[#0b0f19] border border-purple-500/40 rounded-2xl overflow-hidden flex flex-col shadow-2xl z-[100000] text-right transition-all duration-300 ${
          isFullscreen 
            ? 'fixed inset-0 rounded-none w-full h-full' 
            : 'w-full max-w-[98vw] h-[95vh]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Browser Top Navigation Chrome */}
        <div className="p-2 sm:p-2.5 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-[#120e24] flex flex-wrap items-center gap-2 shrink-0">
          
          {/* Navigation Controls: Back / Forward / Refresh */}
          <div className="flex items-center gap-1 shrink-0" dir="ltr">
            <button
              type="button"
              onClick={handleBack}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="الصفحة السابقة"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="الصفحة التالية"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all cursor-pointer"
              title="إعادة تحميل الصفحة"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>

          {/* URL Search & Address Bar with Instant Google Autocomplete */}
          <div ref={searchContainerRef} className="flex-1 min-w-[220px] relative">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedSuggestionIdx >= 0 && selectedSuggestionIdx < suggestions.length) {
                  navigateTo(suggestions[selectedSuggestionIdx]);
                } else {
                  navigateTo(inputUrl);
                }
              }}
              className="w-full flex items-center gap-2 bg-black/70 border border-white/15 focus-within:border-purple-500/80 rounded-xl px-3 py-1.5 transition-all shadow-inner"
            >
              {isFetchingSuggestions ? (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
              ) : (
                <Search className="w-4 h-4 text-purple-400 shrink-0" />
              )}
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="ابحث فوراً في Google أو أدخل رابط موقع ويب..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none font-mono text-left"
                dir="ltr"
                autoFocus
              />
              {inputUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="p-0.5 text-gray-400 hover:text-white cursor-pointer"
                  title="مسح"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                بحث
              </button>
            </form>

            {/* Instant Search Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0f1422] border border-purple-500/40 rounded-xl shadow-2xl overflow-hidden z-[100005] animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-1.5 border-b border-white/5 bg-black/40 flex items-center justify-between text-[11px] text-gray-400 px-3">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-purple-400" />
                    <span>اقتراحات البحث الفورية من Google</span>
                  </span>
                  <span className="text-[10px] text-gray-500">استخدم الأسهم ⇅ للتنقل</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => navigateTo(suggestion)}
                      onMouseEnter={() => setSelectedSuggestionIdx(idx)}
                      className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        selectedSuggestionIdx === idx 
                          ? 'bg-purple-600/30 text-white font-semibold' 
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Search className={`w-3.5 h-3.5 shrink-0 ${selectedSuggestionIdx === idx ? 'text-purple-300' : 'text-gray-500'}`} />
                        <span className="truncate">{suggestion}</span>
                      </div>
                      <CornerDownLeft className={`w-3 h-3 shrink-0 ${selectedSuggestionIdx === idx ? 'text-purple-300 opacity-100' : 'opacity-0'}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Sites Chips */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            {quickSites.map(site => (
              <button
                key={site.name}
                type="button"
                onClick={() => navigateTo(site.url)}
                className={`px-2 py-1 bg-white/5 hover:bg-white/15 text-[11px] font-bold rounded-lg border ${site.border} ${site.color} transition-all cursor-pointer flex items-center gap-1`}
              >
                <span>{site.name}</span>
              </button>
            ))}
          </div>

          {/* Mode & Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Proxy Mode Selector */}
            <div className="bg-black/80 border border-white/10 p-0.5 rounded-xl flex items-center text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setProxyMode('proxy');
                  handleRefresh();
                }}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  proxyMode === 'proxy'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="تخطي قيود التضمين وعرض جميع المواقع بحرية"
              >
                بروكسي (آمن)
              </button>
              <button
                type="button"
                onClick={() => {
                  setProxyMode('direct');
                  handleRefresh();
                }}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  proxyMode === 'direct'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="عرض مباشر بدون وسيط"
              >
                مباشر
              </button>
            </div>

            {/* Quick Overlays Bypass Button */}
            <button
              type="button"
              onClick={forceBypassOverlays}
              className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl border border-amber-500/30 transition-all cursor-pointer"
              title="تخطي شاشات الكوكيز والموافقة الإجبارية"
            >
              <Zap className="w-4 h-4 text-amber-400" />
            </button>

            {/* Extracted Videos Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowExtractedDrawer(!showExtractedDrawer)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                detectedVideos.length > 0
                  ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-500/50 text-emerald-300 animate-pulse'
                  : 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-300'
              }`}
              title="عرض روابط الفيديو المستخرجة من الصفحة"
            >
              <Film className="w-3.5 h-3.5" />
              <span>الروابط ({detectedVideos.length})</span>
            </button>

            {/* Open in external tab */}
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors"
              title="فتح في تبويب خارجي جديد"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl border border-red-500/20 transition-colors cursor-pointer"
              title="إغلاق المتصفح"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Floating Notification when a video is detected */}
        {detectedVideos.length > 0 && !showExtractedDrawer && (
          <div className="px-3 py-2 bg-gradient-to-r from-purple-950 via-slate-900 to-emerald-950 border-b border-emerald-500/40 flex items-center justify-between gap-2 shadow-lg shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-xs font-bold text-white truncate">
                تم اكتشاف فيديو قابل للتشغيل: <span className="text-emerald-300 font-mono" dir="ltr">{detectedVideos[0].title || detectedVideos[0].url}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onPlayInRoom(detectedVideos[0].url, detectedVideos[0].title)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1 rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>تشغيل في الغرفة 🚀</span>
              </button>
              {onSaveToPlaylist && (
                <button
                  type="button"
                  onClick={() => onSaveToPlaylist(detectedVideos[0].url, detectedVideos[0].title)}
                  className="p-1 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="إضافة إلى قائمة التشغيل"
                >
                  <Tv className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Body Area (Split when Drawer is Open) */}
        <div className="flex-1 w-full h-full overflow-hidden flex relative bg-black">
          
          {/* Iframe Browser Stage */}
          <div className="flex-1 h-full relative bg-[#0b0f19] flex items-center justify-center">
            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute top-2 right-4 z-20 flex items-center gap-2 bg-black/80 border border-purple-500/40 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg pointer-events-none">
                <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                <span className="text-[11px] text-gray-300 font-medium">جاري تحميل الصفحة وتجاوز القيود...</span>
              </div>
            )}

            <iframe
              ref={iframeRef}
              key={`${currentUrl}-${proxyMode}-${reloadKey}`}
              src={iframeSrc}
              className="w-full h-full border-0 bg-white"
              title="WebBrowser Stage"
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              onLoad={() => {
                setIsLoading(false);
                setTimeout(forceBypassOverlays, 400);
                setTimeout(forceBypassOverlays, 1500);
              }}
              onError={() => {
                setIsLoading(false);
              }}
            />
          </div>

          {/* Extracted Streams Side Drawer */}
          {showExtractedDrawer && (
            <div className="w-80 sm:w-96 border-r border-white/10 bg-[#0d121f] flex flex-col h-full shrink-0 shadow-2xl z-30 animate-in slide-in-from-right duration-200">
              <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white">الروابط المكتشفة ({detectedVideos.length})</h3>
                </div>
                <button
                  onClick={() => setShowExtractedDrawer(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {detectedVideos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 gap-2">
                    <Sparkles className="w-8 h-8 text-purple-400/40 animate-pulse" />
                    <p className="text-xs">تصفح أي موقع فيديو، وسيتم التقاط روابط الفيديو تلقائياً هنا بمجرد بدء التشغيل.</p>
                  </div>
                ) : (
                  detectedVideos.map((video, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 bg-black/50 border border-purple-500/20 hover:border-purple-500/50 rounded-xl flex flex-col gap-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-white truncate flex-1" title={video.title}>
                          {video.title}
                        </span>
                        <span className="px-1.5 py-0.5 bg-purple-600/30 border border-purple-500/30 text-[10px] text-purple-300 rounded-md font-mono shrink-0">
                          {video.url.includes('.m3u8') ? 'HLS' : video.url.includes('.mp4') ? 'MP4' : 'STREAM'}
                        </span>
                      </div>

                      <p className="text-[10px] text-gray-400 font-mono truncate text-left" dir="ltr">
                        {video.url}
                      </p>

                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(video.url)}
                            className="p-1 bg-white/5 hover:bg-white/15 text-gray-300 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                            title="نسخ الرابط"
                          >
                            {copiedUrl === video.url ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                          {onSaveToPlaylist && (
                            <button
                              onClick={() => onSaveToPlaylist(video.url, video.title)}
                              className="p-1 bg-white/5 hover:bg-white/15 text-gray-300 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                              title="حفظ للقائمة"
                            >
                              <Tv className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => onPlayInRoom(video.url, video.title)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>تشغيل الآن</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
