const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// 1. Imports
code = code.replace(
  "import { Share2, Users, LogOut, Copy, Check, PlaySquare, Play, Pause, Volume2, VolumeX, Send, Search } from 'lucide-react';",
  "import { Share2, Users, LogOut, Copy, Check, PlaySquare, Play, Pause, Volume2, VolumeX, Send, Search, Maximize, Minimize, Upload, Loader2, Video } from 'lucide-react';"
);

// 2. Add states & refs
const stateTarget = `  const [userName] = useState(() => 'ضيف-' + Math.floor(Math.random() * 10000));
  
  const messagesEndRef = useRef<HTMLDivElement>(null);`;
const stateReplacement = `  const [userName] = useState(() => 'ضيف-' + Math.floor(Math.random() * 10000));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const isSeeking = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);`;
code = code.replace(stateTarget, stateReplacement);

// 3. Fullscreen useEffect
const effectTarget = `  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);`;
const effectReplacement = `  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      fullscreenContainerRef.current?.requestFullscreen().catch(err => {
        console.error(\`Error attempting to enable fullscreen: \${err.message}\`);
      });
    } else {
      document.exitFullscreen();
    }
  };`;
code = code.replace(effectTarget, effectReplacement);

// 4. File upload logic
const searchTarget = `  const handleUrlSubmit = async (e: React.FormEvent) => {`;
const searchReplacement = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setVideoId(data.url);
        setIsPlaying(true);
        socket?.emit('video-change', { roomId, videoId: data.url });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {`;
code = code.replace(searchTarget, searchReplacement);

// 5. Seek handling
const seekTarget = `  const handleProgress = (state: { playedSeconds: number }) => {
    setPlayedSeconds(state.playedSeconds);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setPlayedSeconds(time);
    if (playerRef.current) playerRef.current.currentTime = time;
    
    isHandlingRemote.current = true;
    socket?.emit('seek', { roomId, currentTime: time });
    if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
    remoteTimeout.current = setTimeout(() => isHandlingRemote.current = false, 2000);
  };`;
const seekReplacement = `  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isSeeking.current) {
      setPlayedSeconds(state.playedSeconds);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setPlayedSeconds(time);
  };
  
  const handleSeekMouseDown = () => {
    isSeeking.current = true;
  };
  
  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const time = parseFloat((e.target as HTMLInputElement).value);
    isSeeking.current = false;
    
    // ReactPlayer uses seekTo(time, 'seconds') instead of setting currentTime
    if (playerRef.current) playerRef.current.seekTo(time, 'seconds');
    
    isHandlingRemote.current = true;
    socket?.emit('seek', { roomId, currentTime: time });
    if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
    remoteTimeout.current = setTimeout(() => isHandlingRemote.current = false, 2000);
  };`;
code = code.replace(seekTarget, seekReplacement);

// 6. UI: Add file upload button to search bar
const formTarget = `          <form onSubmit={handleUrlSubmit} className="flex gap-2">`;
const formReplacement = `          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*,audio/*" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white p-3 rounded-xl transition-colors flex items-center justify-center shrink-0 border border-white/10 backdrop-blur-md"
              title="رفع مقطع من الجهاز"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            </button>`;
code = code.replace(formTarget, formReplacement);

// 7. Wrapping video player in fullscreenContainerRef
const playerTarget = `<div className="relative w-full rounded-2xl overflow-hidden bg-black/40 backdrop-blur-sm aspect-video border border-white/10 shadow-2xl flex flex-col items-center justify-center group">`;
const playerReplacement = `<div ref={fullscreenContainerRef} className={\`relative w-full overflow-hidden bg-black/40 backdrop-blur-sm aspect-video border border-white/10 shadow-2xl flex flex-col items-center justify-center group \${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl'}\`}>`;
code = code.replace(playerTarget, playerReplacement);

// 8. Player src handling (local vs youtube)
const reactPlayerTarget = `<ReactPlayer
                  ref={playerRef}
                  src={\`https://www.youtube.com/watch?v=\${videoId}\`}
                  width="100%"`;
const reactPlayerReplacement = `<ReactPlayer
                  ref={playerRef}
                  src={videoId.startsWith('/') ? videoId : \`https://www.youtube.com/watch?v=\${videoId}\`}
                  width="100%"`;
code = code.replace(reactPlayerTarget, reactPlayerReplacement);

// 9. Controls Box positioning (inside fullscreen container when fullscreen, outside when not)
// Actually we need to make sure External Controls Box is INSIDE the fullscreen container when fullscreen, or we can just make it fixed at the bottom.
// Instead of messing with DOM structure too much, let's just add Fullscreen button in the external controls. Wait, if it's fullscreen, the external controls might not be visible unless they are inside the ref.
// Let's modify the DOM structure slightly in the script so the external controls are INSIDE fullscreenContainerRef.
const boxTarget = `          </div>
          
          {/* External Controls Box */}`;
const boxReplacement = `
          {/* External Controls Box - Placed inside so it shows in fullscreen */}
          {videoId && (
            <div className={\`w-full bg-white/5 backdrop-blur-md border border-white/10 p-4 flex flex-col gap-4 z-20 \${isFullscreen ? 'absolute bottom-0 left-0 right-0 border-t border-b-0 border-l-0 border-r-0 rounded-none bg-black/80' : 'rounded-2xl shadow-xl mt-[-10px]'}\`}>
              <div className="flex items-center gap-3 w-full" dir="ltr">
                <span className="text-xs font-mono text-gray-400 w-10 text-right">{formatTime(playedSeconds)}</span>
                <input 
                  type="range" 
                  min={0} 
                  max={duration || 100} 
                  value={playedSeconds || 0}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekMouseDown}
                  onMouseUp={handleSeekMouseUp}
                  onTouchStart={handleSeekMouseDown}
                  onTouchEnd={handleSeekMouseUp}
                  className="flex-1 h-2 bg-black/40 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                />
                <span className="text-xs font-mono text-gray-400 w-10">{formatTime(duration)}</span>
              </div>
              
              <div className="flex items-center justify-between" dir="ltr">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlayPause} className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white transition-colors shadow-lg shadow-red-600/20">
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => setVolume(v => v > 0 ? 0 : 1)} className="text-gray-300 hover:text-white transition-colors">
                      {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                      type="range" 
                      min={0} 
                      max={1} 
                      step={0.01}
                      value={volume ?? 1}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-24 h-1.5 bg-black/40 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                    />
                  </div>
                </div>
                
                <button onClick={toggleFullscreen} className="text-gray-300 hover:text-white transition-colors">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
          
          </div>`;

// First we have to remove the old External Controls Box to avoid duplicates.
const removeTargetStart = `          {/* External Controls Box */}`;
const removeTargetEnd = `        </div>
        
        {/* Chat Sidebar */}`;

const contentToRemoveRegex = new RegExp('          \\{\\/\\* External Controls Box \\*\\/\\}[\\s\\S]*?<\\/div>\\s+<\\/div>\\s*<\\/div>\\s*\\{\\/\\* Chat Sidebar \\*\\/\\}');
code = code.replace(contentToRemoveRegex, boxReplacement + '\n        </div>\n\n        {/* Chat Sidebar */}');

fs.writeFileSync('src/components/WatchRoom.tsx', code);
