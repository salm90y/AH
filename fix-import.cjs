const fs = require('fs');
let code = fs.readFileSync('src/components/JoinRoom.tsx', 'utf8');

code = code.replace(
  "import { useState } from 'react';",
  "import { useState, useEffect } from 'react';"
);

code = code.replace(
  `  import('react').then(React => {
    React.useEffect(() => {
      try {
        const h = localStorage.getItem('visitedRooms');
        if (h) {
          let parsed = JSON.parse(h);
          parsed.sort((a: any, b: any) => b.lastVisited - a.lastVisited);
          setHistory(parsed);
        }
      } catch(e) {}
    }, []);
  });`,
  `  useEffect(() => {
    try {
      const h = localStorage.getItem('visitedRooms');
      if (h) {
        let parsed = JSON.parse(h);
        parsed.sort((a: any, b: any) => b.lastVisited - a.lastVisited);
        setHistory(parsed);
      }
    } catch(e) {}
  }, []);`
);

fs.writeFileSync('src/components/JoinRoom.tsx', code);
console.log("Fixed JoinRoom");
