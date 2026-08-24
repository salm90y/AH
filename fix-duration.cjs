const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const target = `onDuration={(d) => setDuration(d)}`;
if (code.includes(target)) {
  code = code.replace(target, '');
  
  // also modify onReady
  const onReadyTarget = `onReady={() => setIsReady(true)}`;
  const onReadyReplacement = `onReady={() => {
                    setIsReady(true);
                    if (playerRef.current) {
                      setDuration(playerRef.current.getDuration() || 0);
                    }
                  }}`;
  code = code.replace(onReadyTarget, onReadyReplacement);
  
  fs.writeFileSync('src/components/WatchRoom.tsx', code);
  console.log("Replaced");
} else {
  console.log("Not found");
}
