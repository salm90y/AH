const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const target = "aspect-video border border-white/10 shadow-2xl flex flex-col items-center justify-center group ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl'}";
const replacement = "border border-white/10 shadow-2xl flex flex-col items-center justify-center group ${isFullscreen ? 'fixed inset-0 z-50 rounded-none aspect-auto' : 'aspect-video rounded-2xl'}";

code = code.replace(target, replacement);

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched aspect-video");
