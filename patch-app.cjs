const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `    const savedRoom = localStorage.getItem('watchRoomId');
    
    if (roomParam) {
      setInitialRoomParam(roomParam);
      setRoomId(roomParam);
      localStorage.setItem('watchRoomId', roomParam);
    } else if (savedRoom) {
      setRoomId(savedRoom);
      const newUrl = \`\${window.location.pathname}?room=\${savedRoom}\`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }`;

const replacement1 = `    if (roomParam) {
      setInitialRoomParam(roomParam);
      setRoomId(roomParam);
    }`;

const target2 = `  const handleJoin = (id: string) => {
    const newUrl = \`\${window.location.pathname}?room=\${id}\`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(id);
    localStorage.setItem('watchRoomId', id);
  };`;
const replacement2 = `  const handleJoin = (id: string, isCreator: boolean = false) => {
    const newUrl = \`\${window.location.pathname}?room=\${id}\`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(id);
    
    try {
      const historyStr = localStorage.getItem('visitedRooms');
      let history = historyStr ? JSON.parse(historyStr) : [];
      const existing = history.find((r: any) => r.id === id);
      if (existing) {
        existing.lastVisited = Date.now();
        // keep creator status if they already had it
        if (isCreator) existing.isCreator = true;
      } else {
        history.push({ id, isCreator, lastVisited: Date.now() });
      }
      localStorage.setItem('visitedRooms', JSON.stringify(history));
    } catch(e) {}
  };`;

const target3 = `  const handleLeave = () => {
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(null);
    localStorage.removeItem('watchRoomId');
  };`;
const replacement3 = `  const handleLeave = () => {
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(null);
  };`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);
code = code.replace(target3, replacement3);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
