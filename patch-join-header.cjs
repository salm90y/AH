const fs = require('fs');
let code = fs.readFileSync('src/components/JoinRoom.tsx', 'utf8');

const target = `    <div className="flex-1 flex items-center justify-center p-4">`;
const replacement = `    <div className="flex-1 flex flex-col">
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md p-4 flex items-center justify-between px-6 h-16 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
            <Video className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">WatchParty</h1>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">`;

code = code.replace(target, replacement);

const target2 = `  const handleHistoryDelete = async (room: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const pwd = window.prompt('أدخل كلمة المرور الخاصة بالغرفة للحذف من النظام:');
    if (pwd === null) return;
    
    try {
      const res = await fetch('/api/rooms/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, password: pwd })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'خطأ في حذف الغرفة');
        return;
      }
      
      alert('تم حذف الغرفة بنجاح');
      const newHistory = history.filter(r => r.id !== room.id);
      setHistory(newHistory);
      localStorage.setItem('visitedRooms', JSON.stringify(newHistory));
      
      if (joinId === room.id) setJoinId('');
    } catch (err: any) {
      alert('حدث خطأ أثناء الحذف');
    }
  };`;
const replacement2 = `  const handleHistoryDelete = async (room: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const pwd = window.prompt('أدخل كلمة المرور الخاصة بالغرفة للحذف من النظام:');
    if (pwd === null) return;
    
    try {
      const res = await fetch('/api/rooms/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, password: pwd })
      });
      
      // If the room is already deleted (404), remove it from local history anyway
      if (res.status === 404) {
        const newHistory = history.filter(r => r.id !== room.id);
        setHistory(newHistory);
        localStorage.setItem('visitedRooms', JSON.stringify(newHistory));
        alert('هذه الغرفة لم تعد موجودة في النظام وتم إزالتها من قائمتك.');
        if (joinId === room.id) setJoinId('');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'كلمة المرور غير صحيحة');
        return;
      }
      
      alert('تم حذف الغرفة بنجاح');
      const newHistory = history.filter(r => r.id !== room.id);
      setHistory(newHistory);
      localStorage.setItem('visitedRooms', JSON.stringify(newHistory));
      
      if (joinId === room.id) setJoinId('');
    } catch (err: any) {
      alert('حدث خطأ أثناء الحذف');
    }
  };`;
code = code.replace(target2, replacement2);
code = code.replace("    </div>\n  );", "    </div>\n    </div>\n  );");

fs.writeFileSync('src/components/JoinRoom.tsx', code);
console.log("Patched JoinRoom");
