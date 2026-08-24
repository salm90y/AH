const fs = require('fs');

const code = `import { useState, useEffect } from 'react';
import { Play, ArrowRight, Video, Lock, Trash2, Key } from 'lucide-react';

interface JoinRoomProps {
  onJoin: (id: string, isCreator?: boolean) => void;
  initialRoomId?: string | null;
}

export default function JoinRoom({ onJoin, initialRoomId }: JoinRoomProps) {
  const [mode, setMode] = useState<'join' | 'create'>(initialRoomId ? 'join' : 'create');
  
  // Create state
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Join state
  const [joinId, setJoinId] = useState(initialRoomId || '');
  const [joinPassword, setJoinPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    try {
      const h = localStorage.getItem('visitedRooms');
      if (h) {
        let parsed = JSON.parse(h);
        parsed.sort((a: any, b: any) => b.lastVisited - a.lastVisited);
        setHistory(parsed);
      }
    } catch(e) {}
  }, []);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createPassword.trim()) {
      setError('يرجى إدخال اسم الغرفة وكلمة المرور');
      return;
    }
    
    setIsCreating(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), password: createPassword.trim() })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء الإنشاء');
      
      onJoin(data.roomId, true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim() || !joinPassword.trim()) {
      setError('يرجى إدخال رمز الغرفة وكلمة المرور');
      return;
    }
    
    setIsJoining(true);
    setError('');
    try {
      const res = await fetch('/api/rooms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: joinId.trim().toUpperCase(), password: joinPassword.trim() })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء الانضمام');
      
      onJoin(joinId.trim().toUpperCase(), false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleHistoryJoin = (room: any) => {
    setMode('join');
    setJoinId(room.id);
    setJoinPassword('');
    setError('يرجى إدخال كلمة المرور للغرفة لإعادة الانضمام');
    // document.getElementById('joinPassword')?.focus();
  };

  const handleHistoryDelete = async (room: any, e: React.MouseEvent) => {
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
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        <div className="flex justify-center mb-6 relative z-10">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
            <Video className="w-7 h-7 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-6 relative z-10">WatchParty</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl relative z-10">
          <button
            type="button"
            onClick={() => { setMode('create'); setError(''); }}
            className={\`flex-1 py-2 text-sm font-medium rounded-lg transition-colors \${mode === 'create' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}\`}
          >
            إنشاء غرفة
          </button>
          <button
            type="button"
            onClick={() => { setMode('join'); setError(''); }}
            className={\`flex-1 py-2 text-sm font-medium rounded-lg transition-colors \${mode === 'join' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}\`}
          >
            انضمام لغرفة
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={handleCreateNew} className="space-y-4 relative z-10">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">اسم الغرفة</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="مثال: سهرة الأصدقاء"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">كلمة المرور للغرفة</label>
              <input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="أدخل كلمة مرور قوية"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-sm transition-all"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating || !createName.trim() || !createPassword.trim()}
              className="mt-2 w-full bg-red-600/80 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 backdrop-blur-md"
            >
              {isCreating ? "جاري الإنشاء..." : "إنشاء وبدء المشاهدة"}
              <Play className="w-4 h-4 fill-current" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinExisting} className="space-y-4 relative z-10">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">رمز الغرفة (ID)</label>
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="مثال: ABC123"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-sm transition-all uppercase"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">كلمة المرور</label>
              <input
                id="joinPassword"
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="كلمة مرور الغرفة"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-sm transition-all"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={isJoining || !joinId.trim() || !joinPassword.trim()}
              className="mt-2 w-full bg-red-600/80 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 backdrop-blur-md"
            >
              {isJoining ? "جاري الدخول..." : "دخول الغرفة"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {history.length > 0 && (
          <div className="mt-8 relative z-10">
            <h3 className="text-gray-400 text-sm mb-3">الغرف السابقة:</h3>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {history.map((room) => (
                <div key={room.id} className="flex items-center justify-between bg-black/20 hover:bg-black/40 border border-white/5 p-3 rounded-xl transition-colors cursor-pointer group" onClick={() => handleHistoryJoin(room)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono">{room.id.substring(0,2)}</div>
                    <div>
                      <div className="font-mono text-sm">{room.id}</div>
                      {room.isCreator && <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">منشئ الغرفة</span>}
                    </div>
                  </div>
                  <button onClick={(e) => handleHistoryDelete(room, e)} className="p-2 text-gray-400 hover:text-red-400 transition-all bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-1" title="حذف الغرفة">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/JoinRoom.tsx', code);
console.log("Patched JoinRoom");
