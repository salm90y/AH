const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// Add the ListVideo icon and useState for M3U
const importTarget = "import { Share2, Users, LogOut, Copy, Check, PlaySquare, Play, Pause, Volume2, VolumeX, Send, Search, Maximize, Minimize, Upload, Loader2, Video, Image, Plus, Trash2 } from 'lucide-react';";
const importReplacement = "import { Share2, Users, LogOut, Copy, Check, PlaySquare, Play, Pause, Volume2, VolumeX, Send, Search, Maximize, Minimize, Upload, Loader2, Video, Image, Plus, Trash2, ListVideo, X } from 'lucide-react';";
code = code.replace(importTarget, importReplacement);

// Add M3U state
const stateTarget = "const [messages, setMessages] = useState<any[]>([]);";
const stateReplacement = `const [messages, setMessages] = useState<any[]>([]);
  const [showM3u, setShowM3u] = useState(false);
  const [m3uPlaylist, setM3uPlaylist] = useState<any[]>([]);
  const [m3uSearch, setM3uSearch] = useState('');
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('globalM3uPlaylist');
      if (stored) setM3uPlaylist(JSON.parse(stored));
    } catch(e) {}
  }, []);`;
code = code.replace(stateTarget, stateReplacement);

// Let's modify the form and dropdown
// We will replace the whole form area from <form onSubmit={handleUrlSubmit} to </form>
// Actually, it's safer to use a regex or string split.
const formStart = '<form onSubmit={handleUrlSubmit} className="flex gap-2">';
const formEnd = '</form>';
const startIdx = code.indexOf(formStart);
const endIdx = code.indexOf(formEnd, startIdx) + formEnd.length;

if (startIdx !== -1 && endIdx !== -1) {
  const newForm = `<form onSubmit={handleUrlSubmit} className="flex gap-2 relative z-50">
            <button
              type="button"
              onClick={() => setShowM3u(true)}
              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 p-3 rounded-xl transition-colors flex items-center justify-center shrink-0 border border-blue-500/30 backdrop-blur-md"
              title="قائمة M3U"
            >
              <ListVideo className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*,audio/*" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white p-3 rounded-xl transition-colors flex items-center justify-center shrink-0 border border-white/10 backdrop-blur-md"
              title="رفع مقطع من الجهاز"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            </button>
            <div className="relative flex-1" ref={searchContainerRef}>
              <input
                type="text"
                value={inputUrl || ""}
                onChange={(e) => setInputUrl(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                placeholder="ابحث عن فيديو في يوتيوب أو ضع الرابط هنا..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-sm transition-all text-right"
                dir="rtl"
              />
              {isSearching && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white p-3 rounded-xl transition-colors flex items-center justify-center shrink-0 backdrop-blur-md"
              title="بحث"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {showDropdown && searchResults.length > 0 && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm" onClick={() => setShowDropdown(false)}>
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <button onClick={() => setShowDropdown(false)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-bold text-white">نتائج البحث في يوتيوب</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar">
                    {searchResults.map((video, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setVideoId(video.videoId);
                          setIsPlaying(true);
                          socket?.emit('video-change', { roomId, videoId: video.videoId });
                          setInputUrl('');
                          setShowDropdown(false);
                        }} 
                        className="flex flex-col bg-white/5 hover:bg-white/10 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-white/20 transition-all group"
                      >
                        <div className="relative aspect-video overflow-hidden bg-black/40">
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
                            {video.duration}
                          </div>
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        </div>
                        <div className="p-3 text-right">
                          <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug mb-1" title={video.title}>{video.title}</h4>
                          <div className="text-xs text-gray-400 line-clamp-1">{video.author}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {showM3u && m3uPlaylist.length > 0 && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm" onClick={() => setShowM3u(false)}>
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 gap-4">
                    <button onClick={() => setShowM3u(false)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0">
                      <X className="w-5 h-5" />
                    </button>
                    <input 
                      type="text" 
                      placeholder="ابحث في القنوات..." 
                      value={m3uSearch}
                      onChange={e => setM3uSearch(e.target.value)}
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-right focus:outline-none focus:border-blue-500/50"
                      dir="rtl"
                    />
                    <h3 className="text-lg font-bold text-white shrink-0">قائمة M3U</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 custom-scrollbar">
                    {m3uPlaylist.filter(c => !m3uSearch || c.title.toLowerCase().includes(m3uSearch.toLowerCase())).map((channel, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setVideoId(channel.url);
                          setIsPlaying(true);
                          socket?.emit('video-change', { roomId, videoId: channel.url });
                          setShowM3u(false);
                        }} 
                        className="flex flex-col items-center text-center p-3 bg-white/5 hover:bg-blue-600/20 rounded-xl cursor-pointer border border-white/5 hover:border-blue-500/30 transition-all gap-2"
                      >
                        {channel.logo ? (
                          <img src={channel.logo} alt={channel.title} className="w-12 h-12 object-contain bg-white/10 rounded p-1" onError={(e) => e.currentTarget.style.display = 'none'} />
                        ) : (
                          <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center text-white/50">
                            <Video className="w-6 h-6" />
                          </div>
                        )}
                        <h4 className="text-xs font-bold text-white line-clamp-2" title={channel.title}>{channel.title}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </form>`;
          
  code = code.substring(0, startIdx) + newForm + code.substring(endIdx);
  fs.writeFileSync('src/components/WatchRoom.tsx', code);
  console.log("Patched WatchRoom form and M3U");
} else {
  console.log("Could not find form string!");
}
