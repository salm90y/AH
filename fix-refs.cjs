const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

code = code.replace(/playerRef\.current\?\.seekTo\(([^,]+), 'seconds'\)/g, 'if (playerRef.current) playerRef.current.currentTime = $1');
code = code.replace(/playerRef\.current\?\.getCurrentTime\(\)/g, 'playerRef.current?.currentTime');

fs.writeFileSync('src/components/WatchRoom.tsx', code);
