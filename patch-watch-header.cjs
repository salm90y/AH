const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// Add roomName state
code = code.replace(
  `  const [isCreator, setIsCreator] = useState(false);`,
  `  const [isCreator, setIsCreator] = useState(false);\n  const [roomName, setRoomName] = useState("");`
);

// Update room-state handler
code = code.replace(
  `    newSocket.on('room-state', (state: any) => {
      if (state.messages) setMessages(state.messages);
      if (state.videoId) {
        setVideoId(state.videoId);
      }
      setIsPlaying(state.isPlaying);`,
  `    newSocket.on('room-state', (state: any) => {
      if (state.name) setRoomName(state.name);
      if (state.messages) setMessages(state.messages);
      if (state.videoId) {
        setVideoId(state.videoId);
      }
      setIsPlaying(state.isPlaying);`
);

// We need to replace the entire top controls layout
const topControlsTarget = `    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-1">الغرفة الحالية</div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span className="bg-black/30 border border-white/10 px-3 py-1 rounded-lg text-white font-mono tracking-widest">
                {roomId}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-sm font-medium">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{userCount} متصل</span>
          </div>
          
          <button
            onClick={onLeave}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-100 font-medium px-4 py-2 rounded-xl transition-colors text-sm border border-red-500/30 backdrop-blur-md"
          >
            <LogOut className="w-4 h-4" />
            مغادرة
          </button>
        </div>
      </div>`;

const topControlsReplacement = `    <div className="flex-1 flex flex-col">
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md p-4 flex items-center justify-between px-6 h-16 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
            <Video className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">WatchParty</h1>
          
          <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-4">
            <div className="bg-white/10 border border-white/10 px-3 py-1 rounded-lg text-white font-medium text-sm flex items-center gap-2 max-w-[150px] sm:max-w-[300px] truncate">
              {roomName || 'غرفة المشاهدة'}
            </div>
            <div className="bg-black/30 border border-white/10 px-3 py-1 rounded-lg text-white font-mono tracking-widest text-sm flex items-center gap-2">
              {roomId}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-sm font-medium">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{userCount} متصل</span>
          </div>
          
          <button
            onClick={onLeave}
            className="flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-100 font-medium px-4 py-1.5 rounded-lg transition-colors text-sm border border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            مغادرة
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full gap-6">`;

code = code.replace(topControlsTarget, topControlsReplacement);

// Fix trailing divs (need an extra closing div since we wrapped it all in flex-1 flex col)
code = code.replace("    </div>\n  );\n}", "    </div>\n    </div>\n  );\n}");

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched WatchRoom");
