const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

const target = `  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('chat-message', { roomId, text: chatInput, sender: userName });
    setChatInput('');
  };`;

const replacement = `  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        socket?.emit('chat-message', { roomId, text: '', sender: userName, imageUrl: data.url });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('chat-message', { roomId, text: chatInput.trim(), sender: userName });
    setChatInput('');
  };`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Patched");
