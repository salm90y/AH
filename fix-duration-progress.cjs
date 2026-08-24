const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const target = `  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isSeeking.current) {
      setPlayedSeconds(state.playedSeconds);
    }
  };`;

const replacement = `  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isSeeking.current) {
      setPlayedSeconds(state.playedSeconds);
    }
    if (playerRef.current) {
      const d = playerRef.current.getDuration();
      if (d && d !== duration) {
        setDuration(d);
      }
    }
  };`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/WatchRoom.tsx', code);
  console.log("Replaced handleProgress");
} else {
  console.log("Not found");
}
