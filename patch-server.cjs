const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add express.json()
code = code.replace(
  "  const app = express();",
  "  const app = express();\n  app.use(express.json());"
);

// 2. Add name and password to RoomState
code = code.replace(
  "  videoId: string;",
  "  name?: string;\n  password?: string;\n  videoId: string;"
);

// 3. Add API routes for rooms
const apiTarget = `  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });`;

const apiReplacement = `  // API routes
  app.post("/api/rooms", (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: "اسم الغرفة وكلمة المرور مطلوبة" });
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = {
      name,
      password,
      videoId: "",
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now(),
      messages: []
    };
    res.json({ roomId });
  });

  app.post("/api/rooms/verify", (req, res) => {
    const { roomId, password } = req.body;
    const room = rooms[roomId];
    if (!room) return res.status(404).json({ error: "الغرفة غير موجودة" });
    if (room.password !== password) return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    res.json({ success: true, name: room.name });
  });

  app.post("/api/rooms/delete", (req, res) => {
    const { roomId, password } = req.body;
    const room = rooms[roomId];
    if (!room) return res.status(404).json({ error: "الغرفة غير موجودة" });
    if (room.password !== password) return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    
    delete rooms[roomId];
    io.to(roomId).emit("room-deleted");
    io.in(roomId).socketsLeave(roomId);
    res.json({ success: true });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });`;

code = code.replace(apiTarget, apiReplacement);

// 4. Update join-room event to not auto-create rooms, and return error if doesn't exist
const joinTarget = `    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      console.log(\`Socket \${socket.id} joined room \${roomId}\`);
      
      if (!rooms[roomId]) {
        rooms[roomId] = {
          videoId: "",
          isPlaying: false,
          currentTime: 0,
          lastUpdated: Date.now(),
          messages: []
        };
      }
      
      // Send current state to the joining client
      socket.emit("room-state", rooms[roomId]);
      
      // Broadcast that a new user joined (can be used for user counts)
      const clientsInRoom = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit("user-count", clientsInRoom);
    });`;

const joinReplacement = `    socket.on("join-room", (roomId: string) => {
      if (!rooms[roomId]) {
        socket.emit("room-error", "الغرفة غير موجودة");
        return;
      }
      socket.join(roomId);
      console.log(\`Socket \${socket.id} joined room \${roomId}\`);
      
      // Send current state to the joining client
      socket.emit("room-state", Object.assign({}, rooms[roomId], { password: "" })); // don't send password to client
      
      // Broadcast that a new user joined (can be used for user counts)
      const clientsInRoom = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit("user-count", clientsInRoom);
    });`;

code = code.replace(joinTarget, joinReplacement);

// 5. Remove delete-room from socket (since it's an API route now)
const deleteTarget = `    socket.on("delete-room", (roomId: string) => {
      if (rooms[roomId]) {
        delete rooms[roomId];
        io.to(roomId).emit("room-deleted");
        // force disconnect sockets from this room
        io.in(roomId).socketsLeave(roomId);
      }
    });`;

code = code.replace(deleteTarget, "");

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts for strict room creation");
