const fs = require('fs');

let watch = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');
watch = watch.replace('value={inputUrl}', 'value={inputUrl || ""}');
watch = watch.replace('value={playedSeconds}', 'value={playedSeconds || 0}');
watch = watch.replace('value={volume}', 'value={volume ?? 1}');
watch = watch.replace('value={chatInput}', 'value={chatInput || ""}');
fs.writeFileSync('src/components/WatchRoom.tsx', watch);

let join = fs.readFileSync('src/components/JoinRoom.tsx', 'utf8');
join = join.replace('value={roomId}', 'value={roomId || ""}');
fs.writeFileSync('src/components/JoinRoom.tsx', join);
