const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const target = "const [chatInput, setChatInput] = useState('');";
const replacement = `const [chatInput, setChatInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched");
