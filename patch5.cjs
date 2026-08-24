const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');
code = code.replace(
  '  time: number;\n}',
  '  time: number;\n  imageUrl?: string;\n}'
);
fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched ChatMessage interface");
