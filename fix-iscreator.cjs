const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const target = "const [chatInput, setChatInput] = useState('');";
const replacement = `const [chatInput, setChatInput] = useState('');
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    try {
      const historyStr = localStorage.getItem('visitedRooms');
      if (historyStr) {
        const history = JSON.parse(historyStr);
        const room = history.find((r: any) => r.id === roomId);
        if (room && room.isCreator) setIsCreator(true);
      }
    } catch (e) {}
  }, [roomId]);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Fixed isCreator");
