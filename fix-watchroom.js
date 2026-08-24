const fs = require('fs');

let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// Add states
code = code.replace(
  "const [isPlaying, setIsPlaying] = useState(false);",
  `const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [userName] = useState(() => 'ضيف-' + Math.floor(Math.random() * 10000));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);`
);

// Add socket listeners for chat
code = code.replace(
  "newSocket.on('user-count'",
  `newSocket.on('chat-message', (msg: any) => {
      setMessages(prev => [...prev, msg].slice(-50));
    });
    newSocket.on('user-count'`
);

code = code.replace(
  "if (state.videoId) {",
  `if (state.messages) setMessages(state.messages);
      if (state.videoId) {`
);

// We need lucide icons for custom controls (Play, Pause, Volume2, VolumeX, Send)
code = code.replace(
  "import { Users, LogOut, Copy, Check, PlaySquare, Search } from 'lucide-react';",
  "import { Users, LogOut, Copy, Check, PlaySquare, Search, Play, Pause, Volume2, VolumeX, Send } from 'lucide-react';"
);

// Add custom controls and chat
fs.writeFileSync('src/components/WatchRoom.tsx', code);
