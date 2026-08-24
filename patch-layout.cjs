const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const target1 = `<div className="flex-1 flex flex-col gap-6 relative">`;
const replacement1 = `<div className="flex-1 flex flex-col gap-4 relative sticky top-0 z-40 bg-[#0f172a] lg:bg-transparent pt-4 lg:pt-0 pb-4 lg:pb-0 border-b border-white/10 lg:border-none shadow-2xl lg:shadow-none">`;

const target2 = `<div className="sticky top-4 z-40 flex flex-col gap-4 bg-[#0f172a] lg:bg-transparent pb-4 lg:pb-0 shadow-[0_20px_20px_-15px_rgba(15,23,42,1)] lg:shadow-none">`;
const replacement2 = `<div className="flex flex-col gap-4">`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched layout");
