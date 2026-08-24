const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "const videos = r.videos.slice(0, 8).map(v => ({",
  "const videos = r.videos.map(v => ({"
);

fs.writeFileSync('server.ts', code);
console.log("Patched server search limit");
