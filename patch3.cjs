const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// Fix handleProgress / onTimeUpdate
const handleProgressTarget = `  const handleProgress = (state: { playedSeconds: number }) => {
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
const handleProgressReplacement = `  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!isSeeking.current) {
      setPlayedSeconds(e.currentTarget.currentTime);
    }
    const d = e.currentTarget.duration;
    if (d && !isNaN(d) && d !== duration) {
      setDuration(d);
    }
  };`;
code = code.replace(handleProgressTarget, handleProgressReplacement);

// Fix onReady getDuration
const onReadyTarget = `                  onReady={() => {
                    setIsReady(true);
                    if (playerRef.current) {
                      setDuration(playerRef.current.getDuration() || 0);
                    }
                  }}`;
const onReadyReplacement = `                  onReady={() => {
                    setIsReady(true);
                    if (playerRef.current && !isNaN(playerRef.current.duration)) {
                      setDuration(playerRef.current.duration || 0);
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (d && !isNaN(d)) setDuration(d);
                  }}`;
code = code.replace(onReadyTarget, onReadyReplacement);

// Fix seekTo
const seekToTarget = `    // ReactPlayer uses seekTo(time, 'seconds') instead of setting currentTime
    if (playerRef.current) playerRef.current.seekTo(time, 'seconds');`;
const seekToReplacement = `    if (playerRef.current) playerRef.current.currentTime = time;`;
code = code.replace(seekToTarget, seekToReplacement);

// Change onProgress to onTimeUpdate in JSX
const jsxOnProgressTarget = `onProgress={handleProgress}`;
const jsxOnProgressReplacement = `onTimeUpdate={handleTimeUpdate}`;
code = code.replace(jsxOnProgressTarget, jsxOnProgressReplacement);

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched successfully");
