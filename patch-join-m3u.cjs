const fs = require('fs');
let code = fs.readFileSync('src/components/JoinRoom.tsx', 'utf8');

const importTarget = "import { Play, ArrowRight, Video, Lock, Trash2, Key } from 'lucide-react';";
const importReplacement = "import { Play, ArrowRight, Video, Lock, Trash2, Key, Upload } from 'lucide-react';";
code = code.replace(importTarget, importReplacement);

const insertTarget = `        <h2 className="text-2xl font-bold text-center mb-6 relative z-10">WatchParty</h2>`;
const insertReplacement = `        <h2 className="text-2xl font-bold text-center mb-6 relative z-10">WatchParty</h2>
        
        <div className="flex justify-center mb-6 relative z-10">
          <label className="cursor-pointer bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            إضافة ملف M3U شامل للموقع
            <input 
              type="file" 
              accept=".m3u,.m3u8" 
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  const content = event.target?.result;
                  if (typeof content === 'string') {
                    const lines = content.split('\\n');
                    const playlist = [];
                    let currentItem = {};
                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i].trim();
                      if (line.startsWith('#EXTINF:')) {
                        const titleMatch = line.split(',');
                        currentItem.title = titleMatch[1] || 'قناة غير معروفة';
                        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                        if (logoMatch) currentItem.logo = logoMatch[1];
                      } else if (line && !line.startsWith('#')) {
                        currentItem.url = line;
                        playlist.push(currentItem);
                        currentItem = {};
                      }
                    }
                    if (playlist.length > 0) {
                      localStorage.setItem('globalM3uPlaylist', JSON.stringify(playlist));
                      alert(\`تم إضافة \${playlist.length} قناة/فيديو بنجاح! ستكون متاحة في جميع الغرف.\`);
                    } else {
                      alert('الملف لا يحتوي على قنوات صالحة');
                    }
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>`;

code = code.replace(insertTarget, insertReplacement);

fs.writeFileSync('src/components/JoinRoom.tsx', code);
console.log("Patched JoinRoom with M3U");
