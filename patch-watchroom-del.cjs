const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// Add Trash2 to imports
code = code.replace(
  "Video, Image, Plus } from 'lucide-react';",
  "Video, Image, Plus, Trash2 } from 'lucide-react';"
);

// Add isCreator state
const stateTarget = `  const [chatInput, setChatInput] = useState("");`;
const stateReplacement = `  const [chatInput, setChatInput] = useState("");
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    try {
      const historyStr = localStorage.getItem('visitedRooms');
      if (historyStr) {
        const history = JSON.parse(historyStr);
        const room = history.find((r: any) => r.id === roomId);
        if (room && room.isCreator) setIsCreator(true);
      }
    } catch (e) {}
  }, [roomId]);`;
code = code.replace(stateTarget, stateReplacement);

// Add room-deleted listener
const socketEventTarget = `    newSocket.on("chat-message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });`;
const socketEventReplacement = `    newSocket.on("chat-message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    
    newSocket.on("room-deleted", () => {
      alert("تم حذف هذه الغرفة من قبل المنشئ");
      onLeave();
    });`;
code = code.replace(socketEventTarget, socketEventReplacement);

// Add Delete Button
const leaveBtnTarget = `          <button
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
          </button>`;
const leaveBtnReplacement = `          {isCreator && (
            <button
              onClick={() => {
                if (window.confirm('هل أنت متأكد من حذف الغرفة لجميع المستخدمين؟')) {
                  socket?.emit('delete-room', roomId);
                  const h = localStorage.getItem('visitedRooms');
                  if (h) {
                    const parsed = JSON.parse(h).filter((r: any) => r.id !== roomId);
                    localStorage.setItem('visitedRooms', JSON.stringify(parsed));
                  }
                  onLeave();
                }
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-900/40 hover:bg-red-900/60 text-red-100 font-medium px-4 py-2 rounded-xl transition-colors text-sm border border-red-500/50 backdrop-blur-md"
            >
              <Trash2 className="w-4 h-4" />
              حذف الغرفة
            </button>
          )}
          <button
            onClick={() => {
              onLeave();
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
          </button>`;
code = code.replace(leaveBtnTarget, leaveBtnReplacement);

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched WatchRoom.tsx for creator delete");
