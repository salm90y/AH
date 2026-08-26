import express from "express";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import multer from "multer";
import fs2 from "fs";
import ytSearch from "yt-search";
import { Innertube, UniversalCache } from "youtubei.js";
import { Readable } from "stream";
import http from "http";
import https from "https";
import { AccessToken } from "livekit-server-sdk";

const PORT = 3000;

let innertubeClient: any = null;
async function getInnertube() {
  if (!innertubeClient) {
    innertubeClient = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
  }
  return innertubeClient;
}

const searchSessions = new Map<string, { session: any, lastActive: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [id, val] of searchSessions.entries()) {
    if (now - val.lastActive > 15 * 60 * 1000) {
      searchSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

function mapInnertubeVideos(videos: any[]) {
  return videos.map((v: any) => {
    let thumbnail = "";
    if (v.thumbnails && v.thumbnails.length > 0) {
      thumbnail = v.thumbnails[v.thumbnails.length - 1]?.url || v.thumbnails[0]?.url || "";
    } else if (v.id) {
      thumbnail = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
    }
    return {
      videoId: v.id || v.videoId,
      title: v.title?.text || v.title?.toString() || "فيديو بدون عنوان",
      thumbnail: thumbnail,
      duration: v.duration?.text || v.duration?.toString() || "",
      author: v.author?.name || v.author?.text || ""
    };
  });
}

interface RoomMember {
  socketId: string;
  userId?: string;
  username: string;
  fullName: string;
  avatar: string;
  role: string;
  isOwner: boolean;
  isModerator?: boolean;
  joinedAt: number;
  isTalking?: boolean;
  isCameraOn?: boolean;
  isStealth?: boolean;
  isMutedAudio?: boolean;
  isMutedText?: boolean;
}

interface RoomState {
  id?: string;
  name: string;
  password?: string;
  creatorId?: string;
  creatorName?: string;
  creatorUsername?: string;
  isPublic?: boolean;
  createdAt?: number;
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
  messages: Array<{ id: string, text: string, sender: string, time: number, imageUrl?: string }>;
  m3uPlaylist?: Array<{ title: string; url: string; logo?: string }>;
  moderators?: string[];
  mutedAudioUsers?: string[];
  mutedTextUsers?: string[];
  bannedUsers?: string[];
}

const roomsFilePath = path.join(process.cwd(), 'uploads', 'rooms.json');

function loadRooms(): Record<string, RoomState> {
  try {
    if (fs2.existsSync(roomsFilePath)) {
      const data = fs2.readFileSync(roomsFilePath, 'utf8');
      const loaded = JSON.parse(data) || {};
      // Ensure defaults for older rooms
      for (const key of Object.keys(loaded)) {
        if (loaded[key].isPublic === undefined) loaded[key].isPublic = true;
        if (!loaded[key].createdAt) loaded[key].createdAt = Date.now();
        if (!loaded[key].creatorName) loaded[key].creatorName = "الإدارة";
        if (!Array.isArray(loaded[key].moderators)) loaded[key].moderators = [];
        if (!Array.isArray(loaded[key].mutedAudioUsers)) loaded[key].mutedAudioUsers = [];
        if (!Array.isArray(loaded[key].mutedTextUsers)) loaded[key].mutedTextUsers = [];
        if (!Array.isArray(loaded[key].bannedUsers)) loaded[key].bannedUsers = [];
      }
      return loaded;
    }
  } catch (e) {
    console.error('Error loading rooms from file:', e);
  }
  return {};
}

function saveRooms(roomsData: Record<string, RoomState>) {
  try {
    fs2.writeFileSync(roomsFilePath, JSON.stringify(roomsData, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving rooms to file:', e);
  }
}

const rooms: Record<string, RoomState> = loadRooms();
const roomActiveMembers = new Map<string, Map<string, RoomMember>>();

// Server-side Users Persistence
const usersFilePath = path.join(process.cwd(), 'uploads', 'users.json');

const DEFAULT_SERVER_ADMIN = {
  id: 'admin_ahmed_root',
  username: 'ahmed',
  password: '123456',
  fullName: 'أحمد (المدير العام)',
  birthDate: {
    day: 1,
    month: 1,
    year: 1990,
  },
  phone: '07700000000',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  role: 'admin',
  permissions: {
    canCreateRooms: true,
    canStream: true,
    canVoiceChat: true,
    canCamera: true,
    canManageUsers: true,
  },
  isBanned: false,
  createdAt: 1700000000000,
  notes: 'الحساب الرئيسي لإدارة منصة AH',
};

function loadUsers(): any[] {
  try {
    const dir = path.dirname(usersFilePath);
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }
    if (fs2.existsSync(usersFilePath)) {
      const data = fs2.readFileSync(usersFilePath, 'utf8');
      const list = JSON.parse(data);
      if (Array.isArray(list) && list.length > 0) {
        if (!list.some((u: any) => u.username?.toLowerCase() === 'ahmed')) {
          list.unshift(DEFAULT_SERVER_ADMIN);
          saveUsersFile(list);
        }
        return list;
      }
    }
  } catch (e) {
    console.error('Error loading users from file:', e);
  }
  const defaultList = [DEFAULT_SERVER_ADMIN];
  saveUsersFile(defaultList);
  return defaultList;
}

function saveUsersFile(usersData: any[]) {
  try {
    const dir = path.dirname(usersFilePath);
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }
    fs2.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving users to file:', e);
  }
}

let serverUsers: any[] = loadUsers();

function findRoom(key: string): { roomId: string; room: RoomState } | null {
  if (!key) return null;
  const trimmed = key.trim();
  const upper = trimmed.toUpperCase();

  // 1. Check exact key or uppercase ID
  if (rooms[upper]) return { roomId: upper, room: rooms[upper] };
  if (rooms[trimmed]) return { roomId: trimmed, room: rooms[trimmed] };

  // 2. Check by Room Name (case-insensitive)
  for (const [id, r] of Object.entries(rooms)) {
    if (r.name && r.name.trim().toLowerCase() === trimmed.toLowerCase()) {
      return { roomId: id, room: r };
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs2.existsSync(uploadDir)) {
    fs2.mkdirSync(uploadDir, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit
  
  app.use('/uploads', express.static(uploadDir));
  
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
  const httpServer = createServer(app);
  
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // API routes for Rooms
  app.get("/api/rooms", (req, res) => {
    const userId = req.query.userId as string;
    const username = (req.query.username as string || "").toLowerCase();
    const filter = req.query.filter as string; // 'public' | 'my' | 'all'

    const list: any[] = [];
    for (const [id, room] of Object.entries(rooms)) {
      const isPublic = room.isPublic !== false;
      const isCreator = (userId && room.creatorId === userId) || (username && room.creatorUsername && room.creatorUsername.toLowerCase() === username);
      
      const activeMap = roomActiveMembers.get(id);
      const activeCount = activeMap ? activeMap.size : (io.sockets.adapter.rooms.get(id)?.size || 0);

      const roomData = {
        id,
        name: room.name || "غرفة المشاهدة",
        isPublic,
        creatorId: room.creatorId || "",
        creatorName: room.creatorName || "مجهول",
        creatorUsername: room.creatorUsername || "",
        createdAt: room.createdAt || Date.now(),
        memberCount: activeCount,
        hasPassword: !!room.password,
        isPlaying: room.isPlaying,
        videoId: room.videoId,
        isCreator
      };

      if (filter === 'public' && isPublic) {
        list.push(roomData);
      } else if (filter === 'my' && isCreator) {
        list.push(roomData);
      } else if (!filter) {
        // Return public rooms OR my rooms
        if (isPublic || isCreator) {
          list.push(roomData);
        }
      } else if (filter === 'all') {
        list.push(roomData);
      }
    }

    // Sort by active viewers count descending then creation time descending
    list.sort((a, b) => (b.memberCount - a.memberCount) || (b.createdAt - a.createdAt));

    res.json({ success: true, rooms: list });
  });

  app.post("/api/rooms", (req, res) => {
    const { name, password, isPublic, creatorId, creatorName, creatorUsername } = req.body;
    if (!name || !password) return res.status(400).json({ error: "اسم الغرفة وكلمة المرور مطلوبة" });
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    rooms[roomId] = {
      id: roomId,
      name: name.trim(),
      password: password.trim(),
      isPublic: isPublic !== false, // default true
      creatorId: creatorId || undefined,
      creatorName: (creatorName || "").trim() || (creatorUsername || "عضو"),
      creatorUsername: (creatorUsername || "").trim().toLowerCase() || undefined,
      createdAt: Date.now(),
      videoId: "",
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now(),
      messages: [],
      m3uPlaylist: []
    };
    saveRooms(rooms);
    res.json({ 
      roomId, 
      name: name.trim(),
      isPublic: rooms[roomId].isPublic,
      creatorId: rooms[roomId].creatorId,
      creatorName: rooms[roomId].creatorName
    });
  });

  app.post("/api/rooms/verify", (req, res) => {
    const { roomId, password, userId, username, userRole } = req.body;
    if (!roomId) return res.status(400).json({ error: "رمز الغرفة أو اسمها مطلوب" });
    const found = findRoom(roomId);
    if (!found) return res.status(404).json({ error: "الغرفة غير موجودة" });
    
    // Check if user is room creator or platform admin (can enter without password)
    const isCreator = (userId && found.room.creatorId === userId) || (username && found.room.creatorUsername && found.room.creatorUsername.toLowerCase() === username.toLowerCase());
    const isAdmin = userRole === 'admin';
    const isPublic = found.room.isPublic !== false;

    // Password verification: bypassed for creator, platform admin, and public rooms without password
    if (!isCreator && !isAdmin && !isPublic && found.room.password) {
      if (!password || found.room.password !== password.trim()) {
        return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
      }
    }

    res.json({ 
      success: true, 
      roomId: found.roomId, 
      name: found.room.name,
      isCreator,
      isAdmin,
      isPublic
    });
  });

  app.post("/api/rooms/edit", (req, res) => {
    const { roomId, name, password, isPublic, userId, username, userRole } = req.body;
    if (!roomId) return res.status(400).json({ error: "رمز الغرفة مطلوب" });
    
    const found = findRoom(roomId);
    if (!found) return res.status(404).json({ error: "الغرفة غير موجودة" });

    const targetRoomId = found.roomId;
    const room = rooms[targetRoomId];

    const isCreator = (userId && room.creatorId === userId) || (username && room.creatorUsername && room.creatorUsername.toLowerCase() === username.toLowerCase());
    const isAdmin = userRole === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: "لا تملك صلاحية تعديل هذه الغرفة (فقط صاحب الغرفة أو إدارة المنصة يملكون هذه الصلاحية)" });
    }

    if (name && name.trim()) {
      room.name = name.trim();
    }
    if (password && password.trim()) {
      room.password = password.trim();
    }
    if (isPublic !== undefined) {
      room.isPublic = !!isPublic;
    }

    saveRooms(rooms);

    // Notify clients inside room
    io.to(targetRoomId).emit("room-updated", {
      name: room.name,
      isPublic: room.isPublic
    });

    res.json({ success: true, room: { id: targetRoomId, name: room.name, isPublic: room.isPublic } });
  });

  app.post("/api/rooms/delete", (req, res) => {
    const { roomId, password, userId, username, userRole } = req.body;
    if (!roomId) return res.status(400).json({ error: "رمز أو اسم الغرفة مطلوب" });
    const found = findRoom(roomId);
    if (!found) return res.status(404).json({ error: "الغرفة غير موجودة" });
    
    const targetRoomId = found.roomId;
    const room = rooms[targetRoomId];

    const isCreator = (userId && room.creatorId === userId) || (username && room.creatorUsername && room.creatorUsername.toLowerCase() === username.toLowerCase());
    const isAdmin = userRole === 'admin';
    const hasPasswordMatch = room.password && room.password === password?.trim();

    // Only Admin OR Creator OR someone with the room password can delete
    if (!isAdmin && !isCreator && !hasPasswordMatch) {
      return res.status(403).json({ error: "لا تملك صلاحية حذف هذه الغرفة (فقط صاحب الغرفة أو إدارة المنصة يحق لهم حذفها)" });
    }
    
    delete rooms[targetRoomId];
    roomActiveMembers.delete(targetRoomId);
    saveRooms(rooms);
    
    io.to(targetRoomId).emit("room-deleted");
    io.in(targetRoomId).socketsLeave(targetRoomId);
    res.json({ success: true });
  });

  // User Management & Authentication API routes
  app.get("/api/users", (req, res) => {
    serverUsers = loadUsers();
    res.json({ success: true, users: serverUsers });
  });

  app.post("/api/auth/login", (req, res) => {
    serverUsers = loadUsers();
    const { username, password } = req.body;
    const cleanUsername = (username || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({ success: false, error: "يرجى إدخال اسم المستخدم وكلمة المرور" });
    }

    const targetUser = serverUsers.find(
      (u: any) => u.username?.toLowerCase() === cleanUsername
    );

    if (!targetUser) {
      return res.status(404).json({ success: false, error: "اسم المستخدم غير مسجل في المنصة" });
    }

    if (targetUser.password !== cleanPassword) {
      return res.status(401).json({ success: false, error: "كلمة المرور غير صحيحة" });
    }

    if (targetUser.isBanned) {
      return res.status(403).json({
        success: false,
        error: `تم حظر هذا الحساب من قبل إدارة المنصة${targetUser.banReason ? ': ' + targetUser.banReason : ''}`
      });
    }

    targetUser.lastLogin = Date.now();
    saveUsersFile(serverUsers);

    res.json({ success: true, user: targetUser });
  });

  app.post("/api/users", (req, res) => {
    serverUsers = loadUsers();
    const data = req.body;
    const cleanUsername = (data.username || "").trim().toLowerCase();
    const cleanPassword = (data.password || "").trim();

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({ success: false, error: "اسم المستخدم وكلمة المرور مطلوبة" });
    }

    if (serverUsers.some((u: any) => u.username?.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ success: false, error: "اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم آخر" });
    }

    const newUser = {
      ...data,
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      username: cleanUsername,
      password: cleanPassword,
      fullName: (data.fullName || "").trim() || cleanUsername,
      phone: (data.phone || "").trim(),
      avatar: data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: data.role || "user",
      permissions: data.permissions || {
        canCreateRooms: true,
        canStream: true,
        canVoiceChat: true,
        canCamera: true,
        canManageUsers: false,
      },
      isBanned: false,
      createdAt: Date.now(),
      notes: (data.notes || "").trim()
    };

    serverUsers.push(newUser);
    saveUsersFile(serverUsers);

    res.json({ success: true, user: newUser, users: serverUsers });
  });

  app.put("/api/users/:id", (req, res) => {
    serverUsers = loadUsers();
    const { id } = req.params;
    const updates = req.body;
    const index = serverUsers.findIndex((u: any) => u.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: "لم يتم العثور على الحساب المطلوب" });
    }

    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase();
      const collision = serverUsers.find((u: any) => u.username?.toLowerCase() === cleanUsername && u.id !== id);
      if (collision) {
        return res.status(400).json({ success: false, error: "اسم المستخدم الجديد مستخدم بالفعل" });
      }
      updates.username = cleanUsername;
    }

    if (updates.password) {
      updates.password = updates.password.trim();
    }

    const updatedUser = {
      ...serverUsers[index],
      ...updates
    };

    serverUsers[index] = updatedUser;
    saveUsersFile(serverUsers);

    res.json({ success: true, user: updatedUser, users: serverUsers });
  });

  app.delete("/api/users/:id", (req, res) => {
    serverUsers = loadUsers();
    const { id } = req.params;
    const target = serverUsers.find((u: any) => u.id === id);

    if (!target) {
      return res.status(404).json({ success: false, error: "الحساب غير موجود" });
    }

    if (target.username?.toLowerCase() === 'ahmed') {
      return res.status(400).json({ success: false, error: "لا يمكن حذف حساب المدير العام الرئيسي (ahmed)" });
    }

    serverUsers = serverUsers.filter((u: any) => u.id !== id);
    saveUsersFile(serverUsers);

    res.json({ success: true, users: serverUsers });
  });

  app.post("/api/users/:id/ban", (req, res) => {
    serverUsers = loadUsers();
    const { id } = req.params;
    const { isBanned, banReason } = req.body;
    const target = serverUsers.find((u: any) => u.id === id);

    if (!target) {
      return res.status(404).json({ success: false, error: "الحساب غير موجود" });
    }

    if (target.username?.toLowerCase() === 'ahmed' && isBanned) {
      return res.status(400).json({ success: false, error: "لا يمكن حظر حساب المدير العام الرئيسي" });
    }

    target.isBanned = isBanned;
    target.banReason = isBanned ? (banReason || "تم الحظر بواسطة الإدارة") : undefined;
    saveUsersFile(serverUsers);

    res.json({ success: true, user: target, users: serverUsers });
  });

  // LiveKit Token API Endpoint
  app.post("/api/livekit/token", async (req, res) => {
    try {
      const { roomName, identity, name } = req.body;
      if (!roomName || !identity) {
        return res.status(400).json({ error: "اسم الغرفة واسم الممكن للاتصال مطلوبان" });
      }

      const apiKey = process.env.LIVEKIT_API_KEY || "APItVUCjzCaYjAU";
      const apiSecret = process.env.LIVEKIT_API_SECRET || "2nT2WmtherSFFeOKHbDomGiR1bjWJnnZgEGU2enQij3B";
      const livekitUrl = process.env.LIVEKIT_URL || "wss://ahmed-8rv42z70.livekit.cloud";

      const at = new AccessToken(apiKey, apiSecret, {
        identity: identity,
        name: name || identity,
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();
      res.json({ success: true, token, url: livekitUrl });
    } catch (err: any) {
      console.error("LiveKit token generation error:", err);
      res.status(500).json({ error: err.message || "فشل إنشاء رمز التوصيل بـ LiveKit" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) return res.json({ videos: [], hasMore: false, searchId: "" });
      
      try {
        const yt = await getInnertube();
        const search = await yt.search(query, { type: 'video' });
        const searchId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        searchSessions.set(searchId, { session: search, lastActive: Date.now() });
        const videos = mapInnertubeVideos(search.videos || []);
        res.json({
          videos,
          searchId,
          hasMore: !!search.has_continuation
        });
      } catch (innerErr) {
        console.warn("Innertube search fallback to yt-search:", innerErr);
        const r = await ytSearch(query);
        const videos = (r.videos || []).map(v => ({
          videoId: v.videoId,
          title: v.title,
          thumbnail: v.image,
          duration: v.timestamp,
          author: v.author.name
        }));
        res.json({
          videos,
          searchId: "",
          hasMore: false
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed", videos: [], hasMore: false });
    }
  });

  app.get("/api/search/more", async (req, res) => {
    try {
      const searchId = req.query.searchId as string;
      if (!searchId || !searchSessions.has(searchId)) {
        return res.json({ videos: [], hasMore: false, searchId: "" });
      }
      const item = searchSessions.get(searchId)!;
      if (!item.session || !item.session.has_continuation) {
        return res.json({ videos: [], hasMore: false, searchId });
      }
      const nextSearch = await item.session.getContinuation();
      item.session = nextSearch;
      item.lastActive = Date.now();
      const videos = mapInnertubeVideos(nextSearch.videos || []);
      res.json({
        videos,
        searchId,
        hasMore: !!nextSearch.has_continuation
      });
    } catch (error) {
      console.error("Search more error:", error);
      res.status(500).json({ error: "Failed to load more results", videos: [], hasMore: false });
    }
  });

  // Web Video Extractor: extracts MP4, M3U8, TS and streaming video links from any website
  app.post("/api/extract-web-video", express.json(), async (req, res) => {
    let rawUrl = (req.body?.url || "").trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, error: "رابط الموقع مطلوب" });
    }

    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      rawUrl = "https://" + rawUrl;
    }

    try {
      const parsedInitial = new URL(rawUrl);

      // Check if user directly provided a direct media link or YouTube link
      const lowerRaw = rawUrl.toLowerCase();
      if (lowerRaw.includes('.m3u8') || lowerRaw.includes('.mp4') || lowerRaw.includes('.ts') || lowerRaw.includes('.webm') || lowerRaw.includes('.mkv')) {
        let type = 'MP4';
        if (lowerRaw.includes('.m3u8')) type = 'M3U8';
        else if (lowerRaw.includes('.ts')) type = 'TS';
        else if (lowerRaw.includes('.webm')) type = 'WEBM';

        return res.json({
          success: true,
          title: `بث مباشر / ملف فيديو (${type})`,
          pageUrl: rawUrl,
          siteName: parsedInitial.hostname,
          thumbnail: '',
          streams: [
            {
              url: rawUrl,
              type: type,
              label: `رابط وسائط مباشر (${type})`,
              quality: 'Direct'
            }
          ]
        });
      }

      // Fetch webpage with standard browser User-Agent & US geo-headers to bypass regional blockers
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ar,en-US,en;q=0.9',
          'Referer': new URL(rawUrl).origin + '/',
          'Cookie': 'age_verified=1; accepted_cookies=1; is_sfw=0; over18=1; country=US; geo=US; xh_country=US; xh_geo=US; consent=1; legal_age=1; is_av_required=0; age_gate=1; notice_preferences=0:;',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        },
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeout);

      const finalUrl = response.url || rawUrl;
      const finalOrigin = new URL(finalUrl).origin;
      let html = await response.text();

      // Extract metadata (Title, OG tags)
      let title = "";
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                           html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim();
      }

      let thumbnail = "";
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                           html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        thumbnail = ogImageMatch[1].trim();
        try {
          thumbnail = new URL(thumbnail, finalUrl).toString();
        } catch {}
      }

      let siteName = new URL(finalUrl).hostname;
      const ogSiteName = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
      if (ogSiteName && ogSiteName[1]) {
        siteName = ogSiteName[1].trim();
      }

      const streamSet = new Set<string>();
      const detectedStreams: Array<{ url: string; type: string; label: string; quality?: string }> = [];

      const addStream = (urlStr: string, defaultType = 'STREAM', defaultLabel = 'فيديو متاح') => {
        if (!urlStr) return;
        let clean = urlStr.trim().replace(/\\/g, '').replace(/&amp;/g, '&');
        // Ignore tiny tracking pixels, subtitles, audio only, images
        if (clean.includes('.vtt') || clean.includes('.srt') || clean.includes('.png') || clean.includes('.jpg') || clean.includes('.jpeg') || clean.includes('.webp') || clean.includes('.gif') || clean.includes('.svg') || clean.includes('.css') || clean.includes('.js')) {
          return;
        }

        try {
          const full = new URL(clean, finalUrl).toString();
          if (streamSet.has(full)) return;
          streamSet.add(full);

          const lower = full.toLowerCase();
          let type = defaultType;
          if (lower.includes('.m3u8') || lower.includes('format=m3u8') || lower.includes('/hls/')) {
            type = 'M3U8';
          } else if (lower.includes('.mp4')) {
            type = 'MP4';
          } else if (lower.includes('.ts') || lower.includes('/ts/') || lower.includes('format=ts')) {
            type = 'TS';
          } else if (lower.includes('.webm')) {
            type = 'WEBM';
          } else if (lower.includes('.mkv')) {
            type = 'MKV';
          }

          let label = defaultLabel;
          if (label === 'فيديو متاح') {
            if (type === 'M3U8') label = 'بث HLS (M3U8)';
            else if (type === 'MP4') label = 'ملف فيديو MP4 مباشر';
            else if (type === 'TS') label = 'بث MPEG-TS مباشر';
            else if (type === 'WEBM') label = 'ملف فيديو WebM';
            else label = 'رابط وسائط مكتشف';
          }

          detectedStreams.push({
            url: full,
            type,
            label
          });
        } catch {}
      };

      // 0. Parse window.initials JSON (xHamster, modern tube engines, etc.)
      const initialsMatch = html.match(/window\.initials\s*=\s*(\{.*?\});/s);
      if (initialsMatch) {
        try {
          const initialsObj = JSON.parse(initialsMatch[1]);
          if (initialsObj.videoModel) {
            const vm = initialsObj.videoModel;
            if (vm.title && !title) title = vm.title;
            if (vm.thumbURL && !thumbnail) thumbnail = vm.thumbURL;
            if (vm.trailerURL) addStream(vm.trailerURL, 'WEBM', 'مقطع المعاينة / الفيديو المباشر');
            if (vm.downloadFile) addStream(vm.downloadFile, 'MP4', 'ملف الفيديو الأصلي');
          }
          if (initialsObj.xplayerSettings && initialsObj.xplayerSettings.sources) {
            const srcObj = initialsObj.xplayerSettings.sources;
            if (srcObj.hls) {
              if (typeof srcObj.hls === 'string') addStream(srcObj.hls, 'M3U8', 'بث HLS (جودة عالية)');
              else if (typeof srcObj.hls === 'object') {
                Object.values(srcObj.hls).forEach((u: any) => typeof u === 'string' && addStream(u, 'M3U8', 'بث HLS'));
              }
            }
            if (srcObj.mp4 && typeof srcObj.mp4 === 'object') {
              Object.entries(srcObj.mp4).forEach(([q, u]: [string, any]) => {
                if (typeof u === 'string') addStream(u, 'MP4', `فيديو MP4 (${q})`);
              });
            }
          }
        } catch {}
      }

      // 1. Check video and source tags
      const videoSrcRegex = /<video[^>]+src=["']([^"']+)["']/gi;
      let match: RegExpExecArray | null;
      while ((match = videoSrcRegex.exec(html)) !== null) {
        addStream(match[1], 'MP4', 'فيديو من وسم Video');
      }

      const sourceSrcRegex = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
      while ((match = sourceSrcRegex.exec(html)) !== null) {
        addStream(match[1], 'STREAM', 'فيديو من وسم Source');
      }

      // 2. Check OpenGraph & Twitter player meta tags
      const ogVideoMatches = [
        ...html.matchAll(/<meta\s+(?:property|name)=["'](?:og:video|og:video:url|og:video:secure_url|twitter:player:stream)["']\s+content=["']([^"']+)["']/gi),
        ...html.matchAll(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:video|og:video:url|og:video:secure_url|twitter:player:stream)["']/gi)
      ];
      for (const m of ogVideoMatches) {
        if (m[1]) addStream(m[1], 'STREAM', 'فيديو OpenGraph Meta');
      }

      // 3. Scan scripts for embedded streaming URLs (M3U8, MP4, TS, WEBM, MKV)
      const directUrlRegex = /(https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|ts|webm|mkv)(?:\?[^\s"'<>\\]*)?)/gi;
      while ((match = directUrlRegex.exec(html)) !== null) {
        addStream(match[1]);
      }

      // 4. Scan javascript key-value pairs (file: "...", source: "...", hls: "...")
      const jsStreamRegex = /(?:file|source|src|stream|hls|video_url|videoUrl)\s*:\s*["']([^"']+\.(?:m3u8|mp4|ts|webm|mkv)[^"']*)["']/gi;
      while ((match = jsStreamRegex.exec(html)) !== null) {
        addStream(match[1]);
      }

      // 5. Scan for JWPlayer / VideoJS source arrays
      const jwSourcesRegex = /sources\s*:\s*(\[[^\]]+\])/gi;
      while ((match = jwSourcesRegex.exec(html)) !== null) {
        const arrayStr = match[1];
        const innerFiles = arrayStr.matchAll(/["'](?:file|src)["']\s*:\s*["']([^"']+)["']/gi);
        for (const f of innerFiles) {
          if (f[1]) addStream(f[1]);
        }
      }

      // 6. Deep iframe inspection: if no streams or few streams found, check iframes embedded in the page
      if (detectedStreams.length === 0) {
        const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
        const iframeUrls: string[] = [];
        while ((match = iframeRegex.exec(html)) !== null) {
          const iframeSrc = match[1];
          if (iframeSrc && !iframeSrc.startsWith('javascript:') && !iframeSrc.includes('google') && !iframeSrc.includes('facebook')) {
            try {
              iframeUrls.push(new URL(iframeSrc, finalUrl).toString());
            } catch {}
          }
        }

        // Check top 3 iframes
        for (let i = 0; i < Math.min(iframeUrls.length, 3); i++) {
          const iframeTarget = iframeUrls[i];
          try {
            const ifrCtrl = new AbortController();
            const ifrTimer = setTimeout(() => ifrCtrl.abort(), 6000);
            const ifrRes = await fetch(iframeTarget, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': finalUrl
              },
              signal: ifrCtrl.signal
            });
            clearTimeout(ifrTimer);
            const ifrHtml = await ifrRes.text();

            let ifrMatch: RegExpExecArray | null;
            const ifrDirectUrlRegex = /(https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|ts|webm|mkv)(?:\?[^\s"'<>\\]*)?)/gi;
            while ((ifrMatch = ifrDirectUrlRegex.exec(ifrHtml)) !== null) {
              addStream(ifrMatch[1], 'STREAM', `بث مستخرج من مشغل IFrame (${i + 1})`);
            }

            const ifrJsRegex = /(?:file|source|src|stream|hls)\s*:\s*["']([^"']+\.(?:m3u8|mp4|ts|webm|mkv)[^"']*)["']/gi;
            while ((ifrMatch = ifrJsRegex.exec(ifrHtml)) !== null) {
              addStream(ifrMatch[1], 'STREAM', `بث مستخرج من مشغل IFrame (${i + 1})`);
            }
          } catch {}
        }
      }

      return res.json({
        success: true,
        title: title || "صفحة وسائط ويب",
        pageUrl: finalUrl,
        siteName,
        thumbnail,
        streams: detectedStreams
      });

    } catch (err: any) {
      console.error("Web video extraction error:", err);
      return res.status(500).json({
        success: false,
        error: err.name === 'AbortError' ? 'استغرق الموقع وقتاً طويلاً للاستجابة (انتهت المهلة)' : 'تعذر الوصول إلى الموقع المحدد أو استخراج الفيديوهات'
      });
    }
  });

  // Instant Search Suggestions API (Powered by Google Suggest)
  app.get("/api/search-suggest", async (req, res) => {
    const query = (req.query.q as string || "").trim();
    if (!query) {
      return res.json({ query: "", suggestions: [] });
    }

    try {
      const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ar&q=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(suggestUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json,text/plain,*/*'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.json({ query, suggestions: [] });
      }

      const data: any = await response.json();
      const suggestions: string[] = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=120');
      return res.json({ query, suggestions: suggestions.slice(0, 10) });
    } catch (err: any) {
      return res.json({ query, suggestions: [] });
    }
  });

  // Web Page Proxy: allows embedding film/video pages in an interactive iframe and intercepts clicked video streams
  app.get("/api/proxy-web-page", async (req, res) => {
    let rawUrl = (req.query.url as string || "").trim();
    if (!rawUrl) {
      rawUrl = "https://www.google.com/search?igu=1&q=";
    }

    // Convert search query or malformed URL to valid URL with Google Search & IFrame support
    try {
      if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
        if (!rawUrl.includes(".") || rawUrl.includes(" ")) {
          rawUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(rawUrl)}`;
        } else {
          rawUrl = "https://" + rawUrl;
        }
      }
      if (rawUrl.includes("google.com") && !rawUrl.includes("igu=1")) {
        rawUrl += (rawUrl.includes("?") ? "&" : "?") + "igu=1";
      }
    } catch (e) {
      rawUrl = `https://www.google.com/search?igu=1&q=`;
    }

    try {
      const parsedUrl = new URL(rawUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const isMobile = rawUrl.includes('youtube.com') || rawUrl.includes('m.');
      const userAgent = isMobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

      const response = await fetch(rawUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
          'Referer': parsedUrl.origin + '/',
          'Cookie': 'age_verified=1; accepted_cookies=1; is_sfw=0; over18=1; country=US; geo=US; xh_country=US; xh_geo=US; consent=1; legal_age=1; is_av_required=0; age_gate=1; notice_preferences=0:; has_consent=1; cookieconsent_status=allow;',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate'
        },
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeout);

      const finalUrl = response.url || rawUrl;
      const contentType = response.headers.get('content-type') || 'text/html';

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Type', contentType);

      if (!contentType.includes('text/html')) {
        const arrayBuf = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuf));
      }

      let html = await response.text();

      // Bypass age restrictions and geo-blocks in JSON payloads
      html = html.replace(/"isSfw"\s*:\s*true/g, '"isSfw":false');
      html = html.replace(/"isAgeVerified"\s*:\s*false/g, '"isAgeVerified":true');
      html = html.replace(/"isAgeVerificationRequired"\s*:\s*true/g, '"isAgeVerificationRequired":false');
      html = html.replace(/"isBlurredMedia"\s*:\s*true/g, '"isBlurredMedia":false');
      html = html.replace(/"isBlurredText"\s*:\s*true/g, '"isBlurredText":false');
      html = html.replace(/"shouldHideAdultContent"\s*:\s*true/g, '"shouldHideAdultContent":false');

      // Strip meta CSP & X-Frame headers inside HTML
      html = html.replace(/<meta[^>]+http-equiv=['"]?Content-Security-Policy['"]?[^>]*>/gi, '');
      html = html.replace(/<meta[^>]+http-equiv=['"]?X-Frame-Options['"]?[^>]*>/gi, '');

      // Base URL injection + Anti-Ad Shield & Video detection script & CSS Overrides
      const baseTag = `<base href="${finalUrl}">`;
      const interceptorStyles = `
        <style id="__proxy_injected_styles">
          [class*="ageVerification"], [class*="age-verification"], [class*="ageGate"], [class*="age_gate"],
          [class*="content-3b979"], [class*="avPlaceholder"], [data-role*="age"], [data-role*="cookie"],
          [data-role="dialog-manager"], [data-opt-hydration*="cookies"], [class*="cookies-dialog"], 
          [class*="cookie-modal"], [class*="cookie-banner"], [class*="cookieConsent"], #onetrust-consent-sdk,
          .modal-backdrop, [class*="modal-backdrop"], [id*="cookie-law"], [class*="pmWrapperProps"],
          [data-role="cookies-modal"], [data-role="consent-modal"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            z-index: -9999 !important;
          }
          * {
            filter: none !important;
            -webkit-filter: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          body, html {
            overflow: auto !important;
            position: static !important;
            pointer-events: auto !important;
          }
          @keyframes ravePulse {
            0% { transform: translateX(-50%) scale(1); box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 15px rgba(124,58,237,0.5); }
            50% { transform: translateX(-50%) scale(1.04); box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 25px rgba(236,72,153,0.8); }
            100% { transform: translateX(-50%) scale(1); box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 15px rgba(124,58,237,0.5); }
          }
        </style>
      `;

      const interceptorScript = `
        <script>
          (function() {
            var TARGET_BASE = "${finalUrl}";
            var PROXY_ORIGIN = window.location.origin;

            // Safe Frame protection without breaking JS code
            try {
              Object.defineProperty(window, 'top', { get: function() { return window.self; }, configurable: true });
            } catch(e) {}
            try {
              Object.defineProperty(window, 'parent', { get: function() { return window.self; }, configurable: true });
            } catch(e) {}

            function resolveUrl(u) { 
              if (!u) return '';
              try {
                var str = String(u).trim();
                if (str.startsWith('javascript:') || str.startsWith('data:') || str.startsWith('blob:') || str.startsWith('#')) {
                  return str;
                }
                if (str.startsWith('/api/proxy-web-page?url=')) {
                  return decodeURIComponent(str.replace('/api/proxy-web-page?url=', ''));
                }
                if (str.startsWith(PROXY_ORIGIN + '/api/proxy-web-page?url=')) {
                  return decodeURIComponent(str.replace(PROXY_ORIGIN + '/api/proxy-web-page?url=', ''));
                }
                // If browser auto-resolved relative URL against localhost
                if (str.startsWith(PROXY_ORIGIN)) {
                  var rel = str.replace(PROXY_ORIGIN, '');
                  return new URL(rel, TARGET_BASE).href;
                }
                if (str.startsWith('//')) {
                  var proto = TARGET_BASE.startsWith('https') ? 'https:' : 'http:';
                  return proto + str;
                }
                if (str.startsWith('http://') || str.startsWith('https://')) {
                  return str;
                }
                return new URL(str, TARGET_BASE).href;
              } catch(e) {
                return String(u);
              }
            }

            function isAdUrl(u) {
              if (!u) return false;
              var str = String(u).toLowerCase();
              var adKeywords = [
                'exoclick', 'trafficjunky', 'popads', 'adsterra', 'popcash', 
                'propellerads', 'juicyads', 'betting', '1xbet', 'casino', 
                'syndication', 'doubleclick', 'adnxs', 'adform', 'ad-score',
                'clickadu', 'hilltopads', 'ero-advertising', 'chaturbate',
                'bongacams', 'stripchat', 'livejasmin', 'onclick', 'redirect',
                'adk2', 'adxpansion', 'rtb-demand'
              ];
              for (var i = 0; i < adKeywords.length; i++) {
                if (str.includes(adKeywords[i])) return true;
              }
              return false;
            }

            function showFloatingRaveButton(videoUrl, title) {
              if (!videoUrl || isAdUrl(videoUrl)) return;
              try {
                var existing = document.getElementById('__rave_floating_bar');
                if (!existing && document.body) {
                  var bar = document.createElement('div');
                  bar.id = '__rave_floating_bar';
                  bar.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:2147483647; background:linear-gradient(135deg,#7c3aed,#ec4899); color:#fff; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; font-size:13px; font-weight:bold; padding:10px 18px; border-radius:30px; box-shadow:0 8px 25px rgba(0,0,0,0.6), 0 0 15px rgba(124,58,237,0.5); cursor:pointer; display:flex; align-items:center; gap:8px; border:2px solid rgba(255,255,255,0.4); text-shadow:0 1px 2px rgba(0,0,0,0.5); direction:rtl; animation:ravePulse 2s infinite; user-select:none;';
                  bar.innerHTML = '<span>🎬 تشغيل في الغرفة لجميع الأعضاء (Rave Play) ▶</span>';
                  bar.onclick = function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    notifyVideo(videoUrl, title);
                  };
                  document.body.appendChild(bar);
                }
              } catch(e) {}
            }

            function notifyVideo(url, title) {
              if (!url) return;
              var abs = resolveUrl(url);
              if (!abs || abs.startsWith('blob:') || abs.startsWith('javascript:')) return;
              if (isAdUrl(abs)) return;
              showFloatingRaveButton(abs, title);
              try {
                window.parent.postMessage({
                  type: 'TRANSFERRED_VIDEO_DETECTED',
                  videoUrl: abs,
                  title: title || document.title || 'فيديو موقع ويب'
                }, '*');
              } catch(e) {}
            }

            // Shield against unwanted popups while smoothly handling intended navigation
            try {
              window.open = function(url, target, features) {
                if (!url) return { focus: function(){}, close: function(){}, closed: false, document: { write: function(){} }, location: {} };
                var resolved = resolveUrl(url);
                if (resolved.match(/\\.(mp4|m3u8|ts|mkv|webm)(\\?.*)?$/i)) {
                  notifyVideo(resolved, document.title);
                  return { focus: function(){}, close: function(){}, closed: false, document: { write: function(){} }, location: {} };
                }
                if (isAdUrl(resolved)) {
                  console.log('Blocked ad popup:', resolved);
                  return { focus: function(){}, close: function(){}, closed: false, document: { write: function(){} }, location: {} };
                }
                // Smoothly navigate inside the proxy
                try {
                  window.parent.postMessage({ type: 'PROXY_NAVIGATION', url: resolved }, '*');
                } catch(e) {}
                window.location.href = PROXY_ORIGIN + '/api/proxy-web-page?url=' + encodeURIComponent(resolved);
                return { focus: function(){}, close: function(){}, closed: false, document: { write: function(){} }, location: {} };
              };
            } catch(e) {}

            // Hook HTMLMediaElement.prototype.play
            try {
              var origPlay = HTMLMediaElement.prototype.play;
              HTMLMediaElement.prototype.play = function() {
                var s = this.currentSrc || this.src;
                if (s && !isAdUrl(s)) notifyVideo(s, document.title);
                return origPlay.apply(this, arguments);
              };
            } catch(e) {}

            // Hook fetch & XHR to catch dynamic stream manifests (.m3u8 / .mp4 / etc.)
            try {
              var origFetch = window.fetch;
              window.fetch = function() {
                var urlArg = arguments[0];
                if (typeof urlArg === 'string' && urlArg.match(/\\.(m3u8|mp4|ts|mkv|webm)(\\?.*)?$/i)) {
                  if (!isAdUrl(urlArg)) notifyVideo(urlArg, document.title);
                }
                return origFetch.apply(this, arguments);
              };

              var origOpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url) {
                if (typeof url === 'string' && url.match(/\\.(m3u8|mp4|ts|mkv|webm)(\\?.*)?$/i)) {
                  if (!isAdUrl(url)) notifyVideo(url, document.title);
                }
                return origOpen.apply(this, arguments);
              };
            } catch(e) {}

            function removeInvisibleAdLayers() {
              try {
                document.querySelectorAll('div, a').forEach(function(el) {
                  var style = window.getComputedStyle(el);
                  if (style.position === 'fixed' || style.position === 'absolute') {
                    var z = parseInt(style.zIndex, 10);
                    if (z > 9999 && (parseFloat(style.opacity) < 0.1 || style.background === 'transparent')) {
                      el.remove();
                    }
                  }
                });
              } catch(e) {}
            }

            function bypassModalsAndConsent() {
              try {
                try {
                  document.cookie = "accepted_cookies=1; path=/; max-age=31536000";
                  document.cookie = "age_verified=1; path=/; max-age=31536000";
                  document.cookie = "consent=1; path=/; max-age=31536000";
                  document.cookie = "legal_age=1; path=/; max-age=31536000";
                  document.cookie = "cookie_accepted=1; path=/; max-age=31536000";
                  document.cookie = "cookieconsent_status=allow; path=/; max-age=31536000";
                  localStorage.setItem('cookies_accepted', 'true');
                  localStorage.setItem('age_verified', 'true');
                  localStorage.setItem('consent', 'true');
                  localStorage.setItem('legal_age', 'true');
                } catch(e) {}

                var modalSelectors = [
                  '[data-role="cookies-modal"]',
                  '[data-role="dialog-manager"]',
                  '[data-role="consent-modal"]',
                  '[data-role="age-gate"]',
                  '[data-opt-hydration="cookies-dialog-eu"]',
                  '[class*="cookies-dialog"]',
                  '[class*="cookie-modal"]',
                  '[class*="cookie-banner"]',
                  '[class*="cookieConsent"]',
                  '[class*="modal-backdrop"]',
                  '[class*="age-gate"]',
                  '[class*="age_gate"]',
                  '[class*="content-3b979"]',
                  '[class*="avPlaceholder"]',
                  '[id*="onetrust"]',
                  '#onetrust-consent-sdk',
                  '#cookie-law-info-bar',
                  '.cookie-banner',
                  '.consent-banner'
                ];

                document.querySelectorAll(modalSelectors.join(',')).forEach(function(el) {
                  el.remove();
                });

                if (document.documentElement) {
                  document.documentElement.style.setProperty('overflow', 'auto', 'important');
                  document.documentElement.style.setProperty('position', 'static', 'important');
                }
                if (document.body) {
                  document.body.style.setProperty('overflow', 'auto', 'important');
                  document.body.style.setProperty('position', 'static', 'important');
                  document.body.style.setProperty('pointer-events', 'auto', 'important');
                }
              } catch(e) {}
            }

            // Message receiver from parent window
            window.addEventListener('message', function(ev) {
              if (ev.data && (ev.data.type === 'AUTO_BYPASS_MODALS' || ev.data.type === 'BYPASS_MODALS' || ev.data.type === 'FORCE_UNLOCK')) {
                bypassModalsAndConsent();
                scanAndHook();
              }
            });

            function scanAndHook() {
              removeInvisibleAdLayers();
              bypassModalsAndConsent();

              document.querySelectorAll('video, audio').forEach(function(v) {
                if (v.__hooked) return;
                v.__hooked = true;
                function emitSrc() {
                  var src = v.currentSrc || v.src;
                  if (!src) {
                    var s = v.querySelector('source');
                    if (s) src = s.src;
                  }
                  if (src && !isAdUrl(src)) notifyVideo(src, document.title);
                }
                v.addEventListener('play', emitSrc);
                v.addEventListener('playing', emitSrc);
                v.addEventListener('canplay', emitSrc);
                v.addEventListener('loadeddata', emitSrc);
                v.addEventListener('click', emitSrc);
                if (v.src || v.currentSrc) emitSrc();
              });

              document.querySelectorAll('iframe').forEach(function(f) {
                if (f.__hooked) return;
                f.__hooked = true;
                if (f.src && (f.src.includes('.mp4') || f.src.includes('.m3u8') || f.src.includes('embed') || f.src.includes('player'))) {
                  if (!isAdUrl(f.src)) notifyVideo(f.src, document.title);
                }
              });
            }

            // Intercept form submissions to keep search and navigation inside proxy
            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (!form) return;
              var rawAction = form.getAttribute('action') || form.action || '';
              var actionUrl = resolveUrl(rawAction || TARGET_BASE);
              var method = (form.getAttribute('method') || form.method || 'GET').toUpperCase();
              
              if (method === 'GET') {
                e.preventDefault();
                e.stopPropagation();
                var formData = new FormData(form);
                var params = new URLSearchParams();
                for (var pair of formData.entries()) {
                  params.append(pair[0], pair[1]);
                }
                var finalDest = actionUrl + (actionUrl.includes('?') ? '&' : '?') + params.toString();
                if (finalDest.includes('google.com') && !finalDest.includes('igu=1')) {
                  finalDest += '&igu=1';
                }
                try { window.parent.postMessage({ type: 'PROXY_NAVIGATION', url: finalDest }, '*'); } catch(err) {}
                window.location.href = PROXY_ORIGIN + '/api/proxy-web-page?url=' + encodeURIComponent(finalDest);
              }
            }, true);

            // Intercept clicks on links or media cards
            document.addEventListener('click', function(e) {
              var target = e.target;
              if (!target) return;

              var mediaEl = target.closest('video, [data-video], [data-src], [data-video-url], [data-url]');
              if (mediaEl) {
                var directMedia = mediaEl.currentSrc || mediaEl.src || mediaEl.getAttribute('data-video') || mediaEl.getAttribute('data-src') || mediaEl.getAttribute('data-video-url') || mediaEl.getAttribute('data-url');
                if (directMedia && directMedia.match(/\\.(mp4|m3u8|ts|mkv|webm)(\\?.*)?$/i)) {
                  e.preventDefault();
                  e.stopPropagation();
                  notifyVideo(directMedia, document.title);
                  return;
                }
              }

              var a = target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
                var rawHref = a.getAttribute('href') || a.href;
                var resolved = resolveUrl(rawHref);

                if (isAdUrl(resolved)) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Blocked ad link click:', resolved);
                  return;
                }

                if (resolved.match(/\\.(mp4|m3u8|ts|mkv|webm)(\\?.*)?$/i)) {
                  e.preventDefault();
                  e.stopPropagation();
                  notifyVideo(resolved, a.textContent || document.title);
                  return;
                }
                
                if (!resolved.includes('/api/proxy-web-page')) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (resolved.includes('google.com') && !resolved.includes('igu=1')) {
                    resolved += (resolved.includes('?') ? '&' : '?') + 'igu=1';
                  }
                  try {
                    window.parent.postMessage({ type: 'PROXY_NAVIGATION', url: resolved }, '*');
                  } catch(err) {}
                  window.location.href = PROXY_ORIGIN + '/api/proxy-web-page?url=' + encodeURIComponent(resolved);
                }
              }
              setTimeout(scanAndHook, 300);
            }, true);

            var obs = new MutationObserver(function() { scanAndHook(); });
            obs.observe(document.documentElement, { childList: true, subtree: true });

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', scanAndHook);
            } else {
              scanAndHook();
            }

            setInterval(bypassModalsAndConsent, 1200);
          })();
        </script>
      `;

      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + baseTag + interceptorStyles + interceptorScript);
      } else if (html.includes('<html>')) {
        html = html.replace('<html>', '<html><head>' + baseTag + interceptorStyles + interceptorScript + '</head>');
      } else {
        html = baseTag + interceptorStyles + interceptorScript + html;
      }

      res.send(html);
    } catch (err: any) {
      console.error("Proxy web page error:", err);
      res.status(500).send("تعذر جلب صفحة الويب المحددة: " + (err?.message || ""));
    }
  });

  // Stream Proxy for IPTV, TS, M3U8 and direct streams (bypasses Mixed-Content & CORS)
  app.all("/api/proxy-stream", async (req, res) => {
    const targetUrl = (req.query.url as string || "").trim();
    if (!targetUrl) return res.status(400).send("URL parameter is required");

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Helper to fetch with redirect following and SSL tolerance
    const followProxyStream = (currentUrl: string, redirectCount = 0): void => {
      if (redirectCount > 5) {
        if (!res.headersSent) res.status(500).send("Too many redirects");
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(currentUrl);
      } catch (e) {
        if (!res.headersSent) res.status(400).send("Invalid stream URL");
        return;
      }

      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const proxyHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Host': parsedUrl.host,
      };

      if (req.headers.range) {
        proxyHeaders['Range'] = req.headers.range as string;
      }

      const reqOptions: any = {
        method: req.method || 'GET',
        headers: proxyHeaders,
        timeout: 15000,
      };

      if (isHttps) {
        reqOptions.rejectUnauthorized = false; // Allow self-signed or custom IPTV certs
        reqOptions.agent = new https.Agent({ rejectUnauthorized: false });
      }

      const proxyReq = client.request(currentUrl, reqOptions, (proxyRes) => {
        const status = proxyRes.statusCode || 200;

        // Handle Redirects (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(status) && proxyRes.headers.location) {
          const nextLocation = new URL(proxyRes.headers.location, currentUrl).toString();
          proxyReq.destroy();
          return followProxyStream(nextLocation, redirectCount + 1);
        }

        if (status >= 400) {
          res.status(status);
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return proxyRes.pipe(res);
        }

        let contentType = proxyRes.headers['content-type'] as string || '';
        
        // If it's an M3U8 playlist manifest, rewrite internal links to proxy
        const isM3u8Content = contentType.includes('mpegurl') || 
                              contentType.includes('m3u8') || 
                              currentUrl.includes('.m3u8') || 
                              currentUrl.includes('format=m3u8');

        if (isM3u8Content && status === 200) {
          let bodyChunks: Buffer[] = [];
          proxyRes.on('data', chunk => bodyChunks.push(chunk));
          proxyRes.on('end', () => {
            const bodyStr = Buffer.concat(bodyChunks).toString('utf8');
            if (bodyStr.startsWith('#EXTM3U')) {
              res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
              res.setHeader('Access-Control-Allow-Origin', '*');
              const lines = bodyStr.split('\n');
              const rewritten = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;
                if (trimmed.startsWith('#')) {
                  if (trimmed.includes('URI="')) {
                    return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
                      try {
                        const full = new URL(uri, currentUrl).toString();
                        return `URI="/api/proxy-stream?url=${encodeURIComponent(full)}"`;
                      } catch {
                        return `URI="${uri}"`;
                      }
                    });
                  }
                  return line;
                }
                try {
                  const fullSegmentUrl = new URL(trimmed, currentUrl).toString();
                  return `/api/proxy-stream?url=${encodeURIComponent(fullSegmentUrl)}`;
                } catch {
                  return line;
                }
              }).join('\n');
              return res.send(rewritten);
            } else {
              // Not an M3U8 text, return as binary stream
              if (!contentType || contentType === 'application/octet-stream') {
                contentType = 'video/mp2t';
              }
              res.setHeader('Content-Type', contentType);
              res.setHeader('Access-Control-Allow-Origin', '*');
              return res.send(Buffer.concat(bodyChunks));
            }
          });
          return;
        }

        if (!contentType || contentType === 'application/octet-stream') {
          if (currentUrl.includes('.ts') || currentUrl.includes('/stream/') || currentUrl.includes('/channel/') || currentUrl.includes('/live/')) {
            contentType = 'video/mp2t';
          } else if (currentUrl.includes('.m3u8')) {
            contentType = 'application/vnd.apple.mpegurl';
          } else if (currentUrl.includes('.mp4')) {
            contentType = 'video/mp4';
          } else {
            contentType = 'video/mp2t';
          }
        }

        res.status(status);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');

        if (proxyRes.headers['content-length']) {
          res.setHeader('Content-Length', proxyRes.headers['content-length']);
        }
        if (proxyRes.headers['content-range']) {
          res.setHeader('Content-Range', proxyRes.headers['content-range']);
        }
        if (proxyRes.headers['accept-ranges']) {
          res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
        }

        res.flushHeaders();

        proxyRes.pipe(res);

        req.on('close', () => {
          proxyReq.destroy();
        });

        proxyRes.on('error', (err) => {
          console.warn('Proxy response stream error:', err.message);
          if (!res.headersSent) res.status(502).end();
        });
      });

      proxyReq.on('error', (err) => {
        console.error("Proxy request error:", err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: "Proxy connection error", message: err.message });
        }
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
          res.status(504).json({ error: "Stream connection timeout" });
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });

      proxyReq.end();
    };

    followProxyStream(targetUrl, 0);
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    socket.on("join-room", (payload: any) => {
      let roomId = "";
      let userInfo: any = null;
      let isStealth = false;

      if (typeof payload === "string") {
        roomId = payload;
      } else if (payload && typeof payload === "object") {
        roomId = payload.roomId || "";
        userInfo = payload.user || null;
        isStealth = !!payload.isStealth && userInfo?.role === 'admin';
      }

      if (!roomId) return;

      const found = findRoom(roomId);
      if (!found) {
        socket.emit("room-error", "الغرفة غير موجودة");
        return;
      }
      const actualRoomId = found.roomId;
      const room = found.room;

      if (!Array.isArray(room.moderators)) room.moderators = [];
      if (!Array.isArray(room.mutedAudioUsers)) room.mutedAudioUsers = [];
      if (!Array.isArray(room.mutedTextUsers)) room.mutedTextUsers = [];
      if (!Array.isArray(room.bannedUsers)) room.bannedUsers = [];

      // Check if user is banned from this room
      const isBanned = (userInfo?.id && room.bannedUsers.includes(userInfo.id)) ||
                       (userInfo?.username && room.bannedUsers.includes(userInfo.username.toLowerCase()));

      if (isBanned && userInfo?.role !== 'admin') {
        socket.emit("room-banned", "تم حظرك من هذه الغرفة بواسطة إدارة الغرفة");
        return;
      }

      socket.join(actualRoomId);
      (socket as any).__isStealth = isStealth;
      (socket as any).__roomId = actualRoomId;
      console.log(`Socket ${socket.id} joined room ${actualRoomId}${isStealth ? ' [STEALTH MODE]' : ''}`);
      
      // Determine if this user is the room creator
      const isOwner = (userInfo?.id && userInfo.id === room.creatorId) || 
                      (userInfo?.username && room.creatorUsername && userInfo.username.toLowerCase() === room.creatorUsername.toLowerCase()) ||
                      (userInfo?.role === 'admin');

      const isModerator = isOwner || 
                          (userInfo?.id && room.moderators.includes(userInfo.id)) ||
                          (userInfo?.username && room.moderators.includes(userInfo.username.toLowerCase()));

      const isMutedAudio = (userInfo?.id && room.mutedAudioUsers.includes(userInfo.id)) ||
                           (userInfo?.username && room.mutedAudioUsers.includes(userInfo.username.toLowerCase()));

      const isMutedText = (userInfo?.id && room.mutedTextUsers.includes(userInfo.id)) ||
                          (userInfo?.username && room.mutedTextUsers.includes(userInfo.username.toLowerCase()));

      // Track member in roomActiveMembers
      if (!roomActiveMembers.has(actualRoomId)) {
        roomActiveMembers.set(actualRoomId, new Map());
      }
      const roomMap = roomActiveMembers.get(actualRoomId)!;

      const member: RoomMember = {
        socketId: socket.id,
        userId: userInfo?.id,
        username: userInfo?.username || `user_${socket.id.substring(0, 4)}`,
        fullName: userInfo?.fullName || userInfo?.username || `مستخدم ${socket.id.substring(0, 4)}`,
        avatar: userInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: userInfo?.role || 'user',
        isOwner: !!isOwner,
        isModerator: !!isModerator,
        isStealth: isStealth,
        isMutedAudio: !!isMutedAudio,
        isMutedText: !!isMutedText,
        joinedAt: Date.now(),
        isTalking: false,
        isCameraOn: false
      };

      if (!isStealth) {
        roomMap.set(socket.id, member);
      }

      // Send current state to the joining client with ownership & moderation info
      socket.emit("room-state", Object.assign({}, room, { 
        id: actualRoomId, 
        password: "", // do not expose password
        isOwner: !!isOwner,
        isModerator: !!isModerator,
        isStealth: isStealth,
        isMutedAudio: !!isMutedAudio,
        isMutedText: !!isMutedText,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        isPublic: room.isPublic !== false,
        moderators: room.moderators,
        mutedAudioUsers: room.mutedAudioUsers,
        mutedTextUsers: room.mutedTextUsers,
        bannedUsers: room.bannedUsers
      }));
      
      // Broadcast visible members list to everyone in the room (stealth users excluded)
      if (!isStealth) {
        const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
        io.to(actualRoomId).emit("room-members", visibleMembers);
        io.to(actualRoomId).emit("user-count", visibleMembers.length);
      } else {
        // Send existing members list directly to the stealth admin
        const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
        socket.emit("room-members", visibleMembers);
        socket.emit("user-count", visibleMembers.length);
      }
    });

    // Room Moderation Actions Handler
    socket.on("room-mod-action", (data: {
      roomId: string;
      action: 'promote_mod' | 'demote_mod' | 'kick' | 'ban' | 'mute_audio' | 'unmute_audio' | 'mute_text' | 'unmute_text' | 'disconnect_call';
      targetSocketId?: string;
      targetUserId?: string;
      targetUsername?: string;
      reason?: string;
      operatorName?: string;
    }) => {
      const { roomId, action, targetSocketId, targetUserId, targetUsername, reason, operatorName } = data;
      if (!roomId || !rooms[roomId]) return;

      const room = rooms[roomId];
      if (!Array.isArray(room.moderators)) room.moderators = [];
      if (!Array.isArray(room.mutedAudioUsers)) room.mutedAudioUsers = [];
      if (!Array.isArray(room.mutedTextUsers)) room.mutedTextUsers = [];
      if (!Array.isArray(room.bannedUsers)) room.bannedUsers = [];

      const roomMap = roomActiveMembers.get(roomId);
      const targetUserKey = (targetUserId || targetUsername || '').toLowerCase();

      switch (action) {
        case 'promote_mod':
          if (targetUserKey && !room.moderators.includes(targetUserKey)) {
            room.moderators.push(targetUserKey);
            saveRooms(rooms);
          }
          if (roomMap) {
            for (const mem of roomMap.values()) {
              if (mem.userId === targetUserId || mem.username.toLowerCase() === targetUserKey) {
                mem.isModerator = true;
              }
            }
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'promote',
            message: `تم تعيين ${targetUsername || 'عضو'} كمشرف للغرفة`
          });
          break;

        case 'demote_mod':
          room.moderators = room.moderators.filter(m => m.toLowerCase() !== targetUserKey);
          saveRooms(rooms);
          if (roomMap) {
            for (const mem of roomMap.values()) {
              if (mem.userId === targetUserId || mem.username.toLowerCase() === targetUserKey) {
                mem.isModerator = false;
              }
            }
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'demote',
            message: `تم إلغاء رتبة الإشراف عن ${targetUsername || 'عضو'}`
          });
          break;

        case 'kick':
          if (targetSocketId) {
            io.to(targetSocketId).emit("kicked-from-room", {
              reason: reason || "تم طردك من الغرفة بواسطة إدارة الغرفة",
              operator: operatorName
            });
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              targetSocket.leave(roomId);
            }
          }
          if (roomMap && targetSocketId) {
            roomMap.delete(targetSocketId);
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
            io.to(roomId).emit("user-count", visibleMembers.length);
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'kick',
            message: `تم طرد ${targetUsername || 'عضو'} من الغرفة`
          });
          break;

        case 'ban':
          if (targetUserKey && !room.bannedUsers.includes(targetUserKey)) {
            room.bannedUsers.push(targetUserKey);
            saveRooms(rooms);
          }
          if (targetSocketId) {
            io.to(targetSocketId).emit("banned-from-room", {
              reason: reason || "تم حظرك من هذه الغرفة نهائياً بواسطة الإدارة",
              operator: operatorName
            });
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              targetSocket.leave(roomId);
            }
          }
          if (roomMap && targetSocketId) {
            roomMap.delete(targetSocketId);
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
            io.to(roomId).emit("user-count", visibleMembers.length);
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'ban',
            message: `تم حظر ${targetUsername || 'عضو'} من الغرفة`
          });
          break;

        case 'mute_audio':
          if (targetUserKey && !room.mutedAudioUsers.includes(targetUserKey)) {
            room.mutedAudioUsers.push(targetUserKey);
            saveRooms(rooms);
          }
          if (targetSocketId) {
            io.to(targetSocketId).emit("audio-muted-by-mod", { isMuted: true });
          }
          if (roomMap) {
            for (const mem of roomMap.values()) {
              if (mem.userId === targetUserId || mem.username.toLowerCase() === targetUserKey) {
                mem.isMutedAudio = true;
              }
            }
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'mute_audio',
            message: `تم كتم صوت ${targetUsername || 'عضو'} في الغرفة`
          });
          break;

        case 'unmute_audio':
          room.mutedAudioUsers = room.mutedAudioUsers.filter(u => u.toLowerCase() !== targetUserKey);
          saveRooms(rooms);
          if (targetSocketId) {
            io.to(targetSocketId).emit("audio-muted-by-mod", { isMuted: false });
          }
          if (roomMap) {
            for (const mem of roomMap.values()) {
              if (mem.userId === targetUserId || mem.username.toLowerCase() === targetUserKey) {
                mem.isMutedAudio = false;
              }
            }
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'unmute_audio',
            message: `تم إلغاء كتم صوت ${targetUsername || 'عضو'}`
          });
          break;

        case 'mute_text':
          if (targetUserKey && !room.mutedTextUsers.includes(targetUserKey)) {
            room.mutedTextUsers.push(targetUserKey);
            saveRooms(rooms);
          }
          if (targetSocketId) {
            io.to(targetSocketId).emit("text-muted-by-mod", { isMuted: true });
          }
          if (roomMap) {
            for (const mem of roomMap.values()) {
              if (mem.userId === targetUserId || mem.username.toLowerCase() === targetUserKey) {
                mem.isMutedText = true;
              }
            }
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'mute_text',
            message: `تم كتم كتابة ${targetUsername || 'عضو'} في الدردشة`
          });
          break;

        case 'unmute_text':
          room.mutedTextUsers = room.mutedTextUsers.filter(u => u.toLowerCase() !== targetUserKey);
          saveRooms(rooms);
          if (targetSocketId) {
            io.to(targetSocketId).emit("text-muted-by-mod", { isMuted: false });
          }
          if (roomMap) {
            for (const mem of roomMap.values()) {
              if (mem.userId === targetUserId || mem.username.toLowerCase() === targetUserKey) {
                mem.isMutedText = false;
              }
            }
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'unmute_text',
            message: `تم إلغاء كتم كتابة ${targetUsername || 'عضو'}`
          });
          break;

        case 'disconnect_call':
          if (targetSocketId) {
            io.to(targetSocketId).emit("force-disconnect-call", {
              reason: "تم قطع اتصالك بواسطة إدارة الغرفة"
            });
          }
          io.to(roomId).emit("moderation-toast", {
            type: 'disconnect',
            message: `تم قطع اتصال ${targetUsername || 'عضو'}`
          });
          break;
      }
    });

    socket.on("video-change", (data: { roomId: string, videoId: string }) => {
      const { roomId, videoId } = data;
      if (rooms[roomId]) {
        rooms[roomId].videoId = videoId;
        rooms[roomId].currentTime = 0;
        rooms[roomId].isPlaying = true;
        rooms[roomId].lastUpdated = Date.now();
        // Broadcast to everyone else in the room
        socket.to(roomId).emit("video-change", videoId);
      }
    });

    socket.on("play", (data: { roomId: string, currentTime: number }) => {
      const { roomId, currentTime } = data;
      if (rooms[roomId]) {
        rooms[roomId].isPlaying = true;
        rooms[roomId].currentTime = currentTime;
        rooms[roomId].lastUpdated = Date.now();
        socket.to(roomId).emit("play", currentTime);
      }
    });

    socket.on("pause", (data: { roomId: string, currentTime: number }) => {
      const { roomId, currentTime } = data;
      if (rooms[roomId]) {
        rooms[roomId].isPlaying = false;
        rooms[roomId].currentTime = currentTime;
        rooms[roomId].lastUpdated = Date.now();
        socket.to(roomId).emit("pause", currentTime);
      }
    });

    socket.on("seek", (data: { roomId: string, currentTime: number }) => {
      const { roomId, currentTime } = data;
      if (rooms[roomId]) {
        rooms[roomId].currentTime = currentTime;
        rooms[roomId].lastUpdated = Date.now();
        socket.to(roomId).emit("seek", currentTime);
      }
    });
    
    socket.on("chat-message", (data: { roomId: string, text: string, sender: string, imageUrl?: string, userId?: string }) => {
      const { roomId, text, sender, imageUrl, userId } = data;
      if (rooms[roomId]) {
        const room = rooms[roomId];
        const isMuted = (userId && room.mutedTextUsers?.includes(userId)) ||
                        (sender && room.mutedTextUsers?.includes(sender.toLowerCase()));
        if (isMuted) {
          socket.emit("text-muted-by-mod", { isMuted: true });
          return;
        }

        const newMessage = { id: Math.random().toString(36).substr(2, 9), text, sender, time: Date.now(), imageUrl };
        rooms[roomId].messages.push(newMessage);
        // keep last 50 messages
        if (rooms[roomId].messages.length > 50) rooms[roomId].messages.shift();
        io.to(roomId).emit("chat-message", newMessage);
      }
    });

    socket.on("delete-message", (data: { roomId: string, messageId: string }) => {
      const { roomId, messageId } = data;
      if (rooms[roomId]) {
        rooms[roomId].messages = rooms[roomId].messages.filter((m: any) => m.id !== messageId);
        saveRooms(rooms);
        io.to(roomId).emit("message-deleted", { messageId });
      }
    });

    socket.on("clear-chat", (data: { roomId: string }) => {
      const { roomId } = data;
      if (rooms[roomId]) {
        rooms[roomId].messages = [];
        saveRooms(rooms);
        io.to(roomId).emit("chat-cleared");
      }
    });

    socket.on("playlist-update", (data: { roomId: string, playlist: any[] }) => {
      const { roomId, playlist } = data;
      if (rooms[roomId] && Array.isArray(playlist)) {
        rooms[roomId].m3uPlaylist = playlist;
        saveRooms(rooms);
        socket.to(roomId).emit("playlist-update", playlist);
      }
    });

    // Voice Chat / Walkie-Talkie (Push-to-Talk audio chunks & active status)
    socket.on("voice-status", (data: { roomId: string, sender: string, fullName?: string, avatar?: string, isTalking: boolean, userId?: string }) => {
      if (data && data.roomId && rooms[data.roomId]) {
        const room = rooms[data.roomId];
        const isMuted = (data.userId && room.mutedAudioUsers?.includes(data.userId)) ||
                        (data.sender && room.mutedAudioUsers?.includes(data.sender.toLowerCase()));
        if (isMuted) {
          socket.emit("audio-muted-by-mod", { isMuted: true });
          return;
        }

        const roomMap = roomActiveMembers.get(data.roomId);
        if (roomMap && roomMap.has(socket.id)) {
          const mem = roomMap.get(socket.id)!;
          mem.isTalking = !!data.isTalking;
          const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
          io.to(data.roomId).emit("room-members", visibleMembers);
        }
        socket.to(data.roomId).emit("voice-status", data);
      }
    });

    socket.on("voice-chunk", (data: { roomId: string, sender: string, fullName?: string, avatar?: string, chunk: string, format?: string, userId?: string }) => {
      if (data && data.roomId && data.chunk && rooms[data.roomId]) {
        const room = rooms[data.roomId];
        const isMuted = (data.userId && room.mutedAudioUsers?.includes(data.userId)) ||
                        (data.sender && room.mutedAudioUsers?.includes(data.sender.toLowerCase()));
        if (isMuted) return;

        socket.to(data.roomId).emit("voice-chunk", data);
      }
    });

    // Camera Video Sharing & Status
    socket.on("camera-status", (data: { roomId: string, sender: string, isCameraOn: boolean }) => {
      if (data && data.roomId) {
        const roomMap = roomActiveMembers.get(data.roomId);
        if (roomMap && roomMap.has(socket.id)) {
          const mem = roomMap.get(socket.id)!;
          mem.isCameraOn = !!data.isCameraOn;
          const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
          io.to(data.roomId).emit("room-members", visibleMembers);
        }
        socket.to(data.roomId).emit("camera-status", data);
      }
    });

    socket.on("camera-frame", (data: { roomId: string, sender: string, frame: string }) => {
      if (data && data.roomId && data.frame) {
        socket.to(data.roomId).emit("camera-frame", data);
      }
    });

    socket.on("sync-request", (roomId: string) => {
      if (rooms[roomId]) {
        let currentEstimatedTime = rooms[roomId].currentTime;
        if (rooms[roomId].isPlaying) {
            currentEstimatedTime += (Date.now() - rooms[roomId].lastUpdated) / 1000;
        }
        socket.emit("sync", { 
          currentTime: currentEstimatedTime, 
          isPlaying: rooms[roomId].isPlaying,
          videoId: rooms[roomId].videoId
        });
      }
    });

    socket.on("disconnecting", () => {
      const isStealth = !!(socket as any).__isStealth;
      if (isStealth) return;

      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          const roomMap = roomActiveMembers.get(roomId);
          if (roomMap) {
            roomMap.delete(socket.id);
            const visibleMembers = Array.from(roomMap.values()).filter(m => !m.isStealth);
            io.to(roomId).emit("room-members", visibleMembers);
            io.to(roomId).emit("user-count", visibleMembers.length);
          } else {
            const clientsInRoom = (io.sockets.adapter.rooms.get(roomId)?.size || 1) - 1;
            io.to(roomId).emit("user-count", clientsInRoom);
          }
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // API 404 catch-all handler to prevent falling back to HTML index.html for API calls
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
