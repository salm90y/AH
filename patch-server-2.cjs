const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `        rooms[roomId] = {
          videoId: "",
          isPlaying: false,
          currentTime: 0,
          lastUpdated: Date.now(),
          messages: []
        };`;
const replacement1 = `        rooms[roomId] = {
          videoId: "",
          isPlaying: false,
          currentTime: 0,
          lastUpdated: Date.now(),
          messages: []
        };`;

const target2 = `    socket.on("sync-request", (roomId: string) => {`;
const replacement2 = `    socket.on("delete-room", (roomId: string) => {
      if (rooms[roomId]) {
        delete rooms[roomId];
        io.to(roomId).emit("room-deleted");
        // force disconnect sockets from this room
        io.in(roomId).socketsLeave(roomId);
      }
    });

    socket.on("sync-request", (roomId: string) => {`;

code = code.replace(target2, replacement2);
fs.writeFileSync('server.ts', code);
console.log("Patched server for delete-room");
