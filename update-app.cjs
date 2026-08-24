const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetEffect = `  useEffect(() => {
    // Check URL parameters for room on initial load
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      // Do NOT setRoomId automatically to avoid bypassing user interaction!
      // Bypassing interaction causes browser autoplay policies to block the video
      setInitialRoomParam(roomParam);
    }`;

const replaceEffect = `  useEffect(() => {
    // Check URL parameters for room on initial load
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const savedRoom = localStorage.getItem('watchRoomId');
    
    if (roomParam) {
      setInitialRoomParam(roomParam);
      setRoomId(roomParam);
      localStorage.setItem('watchRoomId', roomParam);
    } else if (savedRoom) {
      setRoomId(savedRoom);
      const newUrl = \`\${window.location.pathname}?room=\${savedRoom}\`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }`;

code = code.replace(targetEffect, replaceEffect);

const targetJoin = `  const handleJoin = (id: string) => {
    const newUrl = \`\${window.location.pathname}?room=\${id}\`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(id);
  };`;

const replaceJoin = `  const handleJoin = (id: string) => {
    const newUrl = \`\${window.location.pathname}?room=\${id}\`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(id);
    localStorage.setItem('watchRoomId', id);
  };`;
  
code = code.replace(targetJoin, replaceJoin);

const targetLeave = `  const handleLeave = () => {
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(null);
  };`;
  
const replaceLeave = `  const handleLeave = () => {
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(null);
    localStorage.removeItem('watchRoomId');
  };`;

code = code.replace(targetLeave, replaceLeave);

fs.writeFileSync('src/App.tsx', code);
