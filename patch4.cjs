const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// Add new imports
code = code.replace(
  "import { Share2, Users, LogOut, Copy, Check, PlaySquare, Play, Pause, Volume2, VolumeX, Send, Search, Maximize, Minimize, Upload, Loader2, Video } from 'lucide-react';",
  "import { Share2, Users, LogOut, Copy, Check, PlaySquare, Play, Pause, Volume2, VolumeX, Send, Search, Maximize, Minimize, Upload, Loader2, Video, Image, Plus } from 'lucide-react';"
);

// Add new state for images
const stateTarget = `  const [chatInput, setChatInput] = useState("");`;
const stateReplacement = `  const [chatInput, setChatInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);`;
code = code.replace(stateTarget, stateReplacement);

// Add image upload handler
const chatSendTarget = `  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('chat-message', { roomId, text: chatInput.trim(), sender: userName });
    setChatInput("");
  };`;
const chatSendReplacement = `  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        socket?.emit('chat-message', { roomId, text: '', sender: userName, imageUrl: data.url });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('chat-message', { roomId, text: chatInput.trim(), sender: userName });
    setChatInput("");
  };`;
code = code.replace(chatSendTarget, chatSendReplacement);

// Fix New Room Button next to Leave Button
const leaveBtnTarget = `          <button
            onClick={onLeave}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-100 font-medium px-4 py-2 rounded-xl transition-colors text-sm border border-red-500/30 backdrop-blur-md"
          >
            <LogOut className="w-4 h-4" />
            مغادرة
          </button>
        </div>`;
const leaveBtnReplacement = `          <button
            onClick={() => {
              onLeave();
              localStorage.removeItem('watchRoomId');
              window.location.href = '/';
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm border border-white/20 backdrop-blur-md"
          >
            <Plus className="w-4 h-4" />
            غرفة جديدة
          </button>
          <button
            onClick={onLeave}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-100 font-medium px-4 py-2 rounded-xl transition-colors text-sm border border-red-500/30 backdrop-blur-md"
          >
            <LogOut className="w-4 h-4" />
            مغادرة
          </button>
        </div>`;
code = code.replace(leaveBtnTarget, leaveBtnReplacement);

// Fix sticky video container + ReactPlayer playsinline
const flexContainerTarget = `      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-6">
          <form onSubmit={handleUrlSubmit} className="flex gap-2">`;
const flexContainerReplacement = `      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-6 relative">
          <form onSubmit={handleUrlSubmit} className="flex gap-2">`;
code = code.replace(flexContainerTarget, flexContainerReplacement);

const reactPlayerTarget = `<ReactPlayer
                  ref={playerRef}
                  src={videoId.startsWith('/') ? videoId : \`https://www.youtube.com/watch?v=\${videoId}\`}
                  width="100%"
                  height="100%"
                  playing={isPlaying}
                  controls={false}
                  volume={volume}
                  onTimeUpdate={handleTimeUpdate}`;
const reactPlayerReplacement = `<ReactPlayer
                  ref={playerRef}
                  src={videoId.startsWith('/') ? videoId : \`https://www.youtube.com/watch?v=\${videoId}\`}
                  width="100%"
                  height="100%"
                  playing={isPlaying}
                  controls={false}
                  volume={volume}
                  playsinline={true}
                  onTimeUpdate={handleTimeUpdate}`;
code = code.replace(reactPlayerTarget, reactPlayerReplacement);

const playerConfigTarget = `                  config={{ youtube: { playerVars: { disablekb: 1 } } }}`;
const playerConfigReplacement = `                  config={{ 
                    youtube: { playerVars: { disablekb: 1, playsinline: 1 } },
                    file: { attributes: { playsInline: true, disablePictureInPicture: true } }
                  }}`;
code = code.replace(playerConfigTarget, playerConfigReplacement);

const videoWrapTarget = `          <div ref={fullscreenContainerRef} className={\`relative w-full overflow-hidden bg-black/40 backdrop-blur-sm aspect-video border border-white/10 shadow-2xl flex flex-col items-center justify-center group \${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl'}\`}>`;
const videoWrapReplacement = `          <div className="sticky top-4 z-40 flex flex-col gap-4 bg-[#0f172a] lg:bg-transparent pb-4 lg:pb-0 shadow-[0_20px_20px_-15px_rgba(15,23,42,1)] lg:shadow-none">
            <div ref={fullscreenContainerRef} className={\`relative w-full overflow-hidden bg-black/40 backdrop-blur-sm aspect-video border border-white/10 shadow-2xl flex flex-col items-center justify-center group \${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl'}\`}>`;
code = code.replace(videoWrapTarget, videoWrapReplacement);

const controlsZTarget = `            <div className={\`w-full bg-white/5 backdrop-blur-md border border-white/10 p-4 flex flex-col gap-4 z-20 \${isFullscreen ? 'absolute bottom-0 left-0 right-0 border-t border-b-0 border-l-0 border-r-0 rounded-none bg-black/80' : 'rounded-2xl shadow-xl mt-[-10px]'}\`}>`;
const controlsZReplacement = `            <div className={\`w-full bg-white/5 backdrop-blur-md border border-white/10 p-4 flex flex-col gap-4 z-[9999] \${isFullscreen ? 'absolute bottom-0 left-0 right-0 border-t border-b-0 border-l-0 border-r-0 rounded-none bg-black/80' : 'rounded-2xl shadow-xl mt-[-10px]'}\`}>`;
code = code.replace(controlsZTarget, controlsZReplacement);

const closingDivTarget = `          )}
        </div>

        {/* Chat Sidebar */}`;
const closingDivReplacement = `          )}
          </div>
        </div>

        {/* Chat Sidebar */}`;
code = code.replace(closingDivTarget, closingDivReplacement);

// Fix chat display (images)
const chatDisplayTarget = `                <div className={\`px-3 py-2 rounded-xl text-sm \${msg.sender === userName ? 'bg-red-600/80 text-white rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}\`}>
                  {msg.text}
                </div>`;
const chatDisplayReplacement = `                <div className={\`px-3 py-2 rounded-xl text-sm \${msg.sender === userName ? 'bg-red-600/80 text-white rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}\`}>
                  {msg.text && <p>{msg.text}</p>}
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="مرفق" className="mt-1 rounded-lg max-w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.imageUrl, '_blank')} />
                  )}
                </div>`;
code = code.replace(chatDisplayTarget, chatDisplayReplacement);

// Fix chat form (emojis + image upload)
const chatFormTarget = `          <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-black/20 flex gap-2">
            <input 
              type="text"
              value={chatInput || ""}
              onChange={e => setChatInput(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-red-600/80 hover:bg-red-600 disabled:opacity-50 p-2 rounded-lg text-white transition-colors flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>`;
const chatFormReplacement = `          <div className="px-3 py-2 border-t border-white/10 flex gap-3 overflow-x-auto scrollbar-hide">
            {['😂', '❤️', '👍', '👏', '😍', '🔥', '🎉', '👋'].map(emoji => (
              <button 
                key={emoji} 
                type="button"
                onClick={() => setChatInput(prev => prev + emoji)}
                className="hover:bg-white/10 p-1 rounded transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
          <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-black/20 flex gap-2 items-center">
            <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <button 
              type="button" 
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              className="text-gray-400 hover:text-white transition-colors p-2 shrink-0"
              title="إرسال صورة"
            >
              {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
            </button>
            <input 
              type="text"
              value={chatInput || ""}
              onChange={e => setChatInput(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-red-600/80 hover:bg-red-600 disabled:opacity-50 p-2 rounded-lg text-white transition-colors flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>`;
code = code.replace(chatFormTarget, chatFormReplacement);

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched WatchRoom.tsx");
