const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Remove header from App.tsx
app = app.replace(
  `      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md p-4 flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
            <Youtube className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">WatchParty</h1>
        </div>
      </header>`,
  ""
);
fs.writeFileSync('src/App.tsx', app);
console.log("Patched App.tsx");
