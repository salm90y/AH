const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const target = `            <button
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
            >`;

const replacement = `            <button
              onClick={async () => {
                const pwd = window.prompt('لحذف الغرفة بشكل نهائي، يرجى إدخال كلمة المرور:');
                if (pwd === null) return;
                
                try {
                  const res = await fetch('/api/rooms/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, password: pwd })
                  });
                  const data = await res.json();
                  
                  if (!res.ok) {
                    alert(data.error || 'كلمة المرور غير صحيحة أو الغرفة غير موجودة');
                    return;
                  }
                  
                  alert('تم حذف الغرفة بنجاح');
                  const h = localStorage.getItem('visitedRooms');
                  if (h) {
                    const parsed = JSON.parse(h).filter((r: any) => r.id !== roomId);
                    localStorage.setItem('visitedRooms', JSON.stringify(parsed));
                  }
                  onLeave();
                } catch (err) {
                  alert('حدث خطأ أثناء الاتصال بالخادم');
                }
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-900/40 hover:bg-red-900/60 text-red-100 font-medium px-4 py-2 rounded-xl transition-colors text-sm border border-red-500/50 backdrop-blur-md"
            >`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched WatchRoom API delete");
