const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// The file should end properly. Let's find the end.
const lines = code.split('\n');
let newLines = [];
let foundExport = false;
for (let line of lines) {
  if (line.includes('// Just copying the Youtube')) break;
  if (line.includes("import { Youtube } from 'lucide-react';")) continue;
  newLines.push(line);
}
code = newLines.join('\n');

if (!code.includes("import { Youtube } from 'lucide-react';")) {
    code = "import { Youtube } from 'lucide-react';\n" + code;
}

code = code.replace(
  "    </div>\n  );\n}", 
  "    </div>\n    </div>\n  );\n}"
);

// wait, the error said "617:10: ERROR: Unterminated regular expression"
// actually let's check what's on line 617.
fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Fixed WatchRoom end");
