import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  ArrowRight, 
  Video, 
  Lock, 
  Trash2, 
  Key, 
  Upload, 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  Shield, 
  LogOut, 
  User, 
  Globe, 
  Users, 
  Clock, 
  Crown, 
  Edit3, 
  Plus, 
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Tv,
  Film,
  BookmarkCheck
} from 'lucide-react';
import { setItemSafe, getItemSafe } from '../utils/storage';
import { UserAccount } from '../types/user';
import ProfileModal from './ProfileModal';

interface JoinRoomProps {
  onJoin: (id: string, isCreator?: boolean, roomName?: string, isStealth?: boolean) => void;
  initialRoomId?: string | null;
  currentUser?: UserAccount | null;
  onOpenAdmin?: () => void;
  onLogout?: () => void;
  onUserUpdated?: (user: UserAccount) => void;
}

const SAVED_PASSWORDS_KEY = 'ah_saved_room_passwords_v1';

export default function JoinRoom({ 
  onJoin, 
  initialRoomId, 
  currentUser, 
  onOpenAdmin, 
  onLogout,
  onUserUpdated 
}: JoinRoomProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'my' | 'history' | 'create' | 'join'>('public');
  
  // Create room state
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createIsPublic, setCreateIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Join specific room state
  const [joinId, setJoinId] = useState(initialRoomId || '');
  const [joinPassword, setJoinPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  // Server rooms state
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Profile Edit Modal state
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Admin Stealth Mode Choice Modal state
  const [stealthTargetRoom, setStealthTargetRoom] = useState<any | null>(null);

  // Helper: Saved Passwords in localStorage
  const getSavedRoomPassword = (id: string): string => {
    try {
      const all = JSON.parse(localStorage.getItem(SAVED_PASSWORDS_KEY) || '{}');
      return all[id] || '';
    } catch {
      return '';
    }
  };

  const saveRoomPasswordLocal = (id: string, pass: string) => {
    try {
      const all = JSON.parse(localStorage.getItem(SAVED_PASSWORDS_KEY) || '{}');
      all[id] = pass;
      localStorage.setItem(SAVED_PASSWORDS_KEY, JSON.stringify(all));
    } catch {}
  };

  // Edit Room Modal state
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Room Deletion Modal state
  const [roomToDelete, setRoomToDelete] = useState<any | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch rooms from server
  const fetchServerRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const url = `/api/rooms?userId=${currentUser?.id || ''}&username=${currentUser?.username || ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        setPublicRooms(data.rooms.filter((r: any) => r.isPublic !== false));
        if (currentUser) {
          const mine = data.rooms.filter((r: any) => 
            r.isCreator || 
            (currentUser.id && r.creatorId === currentUser.id) ||
            (currentUser.username && r.creatorUsername?.toLowerCase() === currentUser.username.toLowerCase())
          );
          setMyRooms(mine);
        }
      }
    } catch (e) {
      console.error("Failed to load server rooms:", e);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchServerRooms();
    const interval = setInterval(fetchServerRooms, 8000);
    return () => clearInterval(interval);
  }, [fetchServerRooms]);

  useEffect(() => {
    getItemSafe<any[]>('visitedRooms', []).then(parsed => {
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sorted = [...parsed].sort((a: any, b: any) => b.lastVisited - a.lastVisited);
        setHistory(sorted);
        if (initialRoomId) {
          const match = sorted.find((r: any) => r.id === initialRoomId || r.name === initialRoomId);
          if (match) setSelectedRoom(match);
          setActiveTab('join');
        }
      }
    });
  }, [initialRoomId]);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createPassword.trim()) {
      setError('يرجى إدخال اسم الغرفة وكلمة المرور');
      return;
    }
    
    setIsCreating(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: createName.trim(), 
          password: createPassword.trim(),
          isPublic: createIsPublic,
          creatorId: currentUser?.id,
          creatorName: currentUser?.fullName || currentUser?.username,
          creatorUsername: currentUser?.username
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء الإنشاء');
      
      saveRoomPasswordLocal(data.roomId, createPassword.trim());
      fetchServerRooms();
      onJoin(data.roomId, true, createName.trim(), false);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = selectedRoom?.id || joinId.trim();
    if (!query) {
      setError('يرجى إدخال اسم أو رمز الغرفة');
      return;
    }

    const isOwner = isUserOwnerOf(selectedRoom || { id: query });
    const isAdmin = currentUser?.role === 'admin';
    const isPublicNoPass = selectedRoom && selectedRoom.isPublic !== false && !selectedRoom.hasPassword;

    if (!isOwner && !isAdmin && !isPublicNoPass && !joinPassword.trim()) {
      setError('يرجى إدخال كلمة مرور الغرفة');
      return;
    }
    
    setIsJoining(true);
    setError('');
    try {
      const res = await fetch('/api/rooms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: query, 
          password: joinPassword.trim(),
          userId: currentUser?.id,
          username: currentUser?.username,
          userRole: currentUser?.role
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء الانضمام');
      
      if (rememberPassword && joinPassword.trim()) {
        saveRoomPasswordLocal(data.roomId || query, joinPassword.trim());
      }

      onJoin(data.roomId || query, data.isCreator, data.name, false);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSelectRoomForJoin = (room: any) => {
    setError('');
    const isOwner = isUserOwnerOf(room);
    const isAdmin = currentUser?.role === 'admin';
    const isPublic = room.isPublic !== false && !room.hasPassword;

    // Admin stealth choice modal
    if (isAdmin) {
      setStealthTargetRoom(room);
      return;
    }

    // Room creator joins directly without password!
    if (isOwner) {
      onJoin(room.id, true, room.name, false);
      return;
    }

    // Public room without password joins directly!
    if (isPublic) {
      onJoin(room.id, false, room.name, false);
      return;
    }

    // Check saved password
    const savedPass = getSavedRoomPassword(room.id);
    if (savedPass) {
      setJoinPassword(savedPass);
      setIsJoining(true);
      fetch('/api/rooms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          password: savedPass,
          userId: currentUser?.id,
          username: currentUser?.username,
          userRole: currentUser?.role
        })
      }).then(async res => {
        const data = await res.json();
        if (res.ok) {
          onJoin(data.roomId || room.id, data.isCreator, data.name, false);
        } else {
          setSelectedRoom(room);
          setJoinId(room.name || room.id);
          setJoinPassword('');
          setActiveTab('join');
        }
      }).catch(() => {
        setSelectedRoom(room);
        setJoinId(room.name || room.id);
        setActiveTab('join');
      }).finally(() => {
        setIsJoining(false);
      });
      return;
    }

    setSelectedRoom(room);
    setJoinId(room.name || room.id);
    setJoinPassword('');
    setActiveTab('join');
    setTimeout(() => {
      document.getElementById('joinPassword')?.focus();
    }, 100);
  };

  const handleAdminStealthJoin = (isStealth: boolean) => {
    if (!stealthTargetRoom) return;
    const room = stealthTargetRoom;
    setStealthTargetRoom(null);
    onJoin(room.id, true, room.name, isStealth);
  };

  const handleOpenEdit = (room: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoom(room);
    setEditName(room.name || '');
    setEditPassword('');
    setEditIsPublic(room.isPublic !== false);
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editName.trim()) {
      setEditError('اسم الغرفة مطلوب');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      const res = await fetch('/api/rooms/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: editingRoom.id,
          name: editName.trim(),
          password: editPassword.trim() || undefined,
          isPublic: editIsPublic,
          userId: currentUser?.id,
          username: currentUser?.username,
          userRole: currentUser?.role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'تعذر تعديل بيانات الغرفة');
        return;
      }

      // Update visited history if exists
      getItemSafe<any[]>('visitedRooms', []).then(hist => {
        if (Array.isArray(hist)) {
          const item = hist.find((r: any) => r.id === editingRoom.id);
          if (item) {
            item.name = editName.trim();
            setItemSafe('visitedRooms', hist).catch(() => {});
          }
        }
      });

      setEditingRoom(null);
      fetchServerRooms();
    } catch (e: any) {
      setEditError('حدث خطأ أثناء تعديل الغرفة');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenDelete = (room: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoomToDelete(room);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomToDelete) return;

    setIsDeleting(true);
    setDeleteError('');

    const isOwner = currentUser && (
      currentUser.role === 'admin' || 
      (roomToDelete.creatorId && currentUser.id === roomToDelete.creatorId) ||
      (roomToDelete.creatorUsername && currentUser.username?.toLowerCase() === roomToDelete.creatorUsername.toLowerCase()) ||
      roomToDelete.isCreator
    );

    // If not owner/admin, password is required
    if (!isOwner && !deletePassword.trim()) {
      setDeleteError('يرجى إدخال كلمة مرور الغرفة');
      setIsDeleting(false);
      return;
    }

    try {
      const res = await fetch('/api/rooms/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: roomToDelete.id, 
          password: deletePassword.trim(),
          userId: currentUser?.id,
          username: currentUser?.username,
          userRole: currentUser?.role
        })
      });

      if (res.status === 404) {
        // Room not on server, remove from local history
        removeLocalHistory(roomToDelete.id);
        setRoomToDelete(null);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'لا تملك صلاحية حذف هذه الغرفة');
        return;
      }

      // Success
      removeLocalHistory(roomToDelete.id);
      setRoomToDelete(null);
      fetchServerRooms();
    } catch (err: any) {
      setDeleteError('حدث خطأ أثناء الاتصال بالخادم للحذف');
    } finally {
      setIsDeleting(false);
    }
  };

  const removeLocalHistory = (id: string) => {
    const newHistory = history.filter(r => r.id !== id);
    setHistory(newHistory);
    setItemSafe('visitedRooms', newHistory).catch(() => {});
    if (joinId === id) setJoinId('');
  };

  const isUserOwnerOf = (room: any) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (room.creatorId && currentUser.id === room.creatorId) return true;
    if (room.creatorUsername && currentUser.username?.toLowerCase() === room.creatorUsername.toLowerCase()) return true;
    if (room.isCreator) return true;
    return false;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Platform Header */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl p-3 sm:p-4 flex items-center justify-between px-4 sm:px-6 h-16 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-[1px] shadow-md shadow-purple-900/40">
            <div className="w-full h-full bg-[#0b0f19] rounded-xl flex items-center justify-center">
              <span className="text-sm font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                AH
              </span>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#0b0f19]"></div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
              منصة AH
              <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-full font-mono">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">مشاهدة وبث تفاعلي متزامن</p>
          </div>
        </div>

        {/* User profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 px-2.5 py-1.5 rounded-xl transition-all group cursor-pointer text-right"
              title="انقر لتعديل بيانات حسابك وصورتك الرمزية"
            >
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.fullName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover border border-purple-500/50 group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-600 rounded-full flex items-center justify-center text-[7px] text-white">
                  ✎
                </span>
              </div>
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-white leading-tight group-hover:text-purple-300 transition-colors">
                    {currentUser.fullName}
                  </p>
                  <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-purple-400" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-mono" dir="ltr">@{currentUser.username}</span>
                  {currentUser.role === 'admin' && (
                    <span className="text-[8px] bg-purple-500/30 text-purple-300 border border-purple-500/40 px-1 rounded font-bold">
                      أدمن
                    </span>
                  )}
                </div>
              </div>
            </button>
          )}

          {currentUser?.role === 'admin' && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              title="فتح لوحة التحكم وإدارة الحسابات (خاص بالأدمن فقط)"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-200 border border-red-500/30 text-xs font-medium transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-white/10 p-2 rounded-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setActiveTab('public'); setError(''); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'public'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-4 h-4 text-blue-300" />
              <span>الغرف العامة</span>
              {publicRooms.length > 0 && (
                <span className="bg-blue-900/60 border border-blue-400/30 text-blue-200 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {publicRooms.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('my'); setError(''); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'my'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>غرفي الخاصة</span>
              {myRooms.length > 0 && (
                <span className="bg-purple-900/60 border border-purple-400/30 text-purple-200 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {myRooms.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('history'); setError(''); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-4 h-4 text-indigo-300" />
              <span>الغرف السابقة</span>
              {history.length > 0 && (
                <span className="bg-indigo-900/60 border border-indigo-400/30 text-indigo-200 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {history.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('create'); setError(''); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء غرفة جديدة</span>
            </button>

            <button
              type="button"
              onClick={fetchServerRooms}
              className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors"
              title="تحديث الغرف"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRooms ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* TAB 1: Public Rooms */}
        {activeTab === 'public' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  الغرف العامة المتاحة حالياً
                </h2>
                <p className="text-xs text-slate-400">انضم لأي غرفة عامة للمشاهدة والتفاعل الجماعي الفوري</p>
              </div>
            </div>

            {publicRooms.length === 0 ? (
              <div className="bg-slate-900/50 border border-dashed border-white/15 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Globe className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">لا توجد غرف عامة نشطة حالياً</h3>
                <p className="text-xs text-slate-400 max-w-sm">كن أول من ينشئ غرفة عامة للمشاهدة الآن وابدأ سهرة ممتعة مع الأصدقاء!</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  + إنشاء أول غرفة عامة
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicRooms.map((room) => {
                  const isOwner = isUserOwnerOf(room);
                  return (
                    <div
                      key={room.id}
                      onClick={() => handleSelectRoomForJoin(room)}
                      className="bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-blue-900/20 relative overflow-hidden"
                    >
                      {/* Live Indicator */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>{room.memberCount || 0} مشاهد الآن</span>
                        </span>

                        <div className="flex items-center gap-1">
                          {room.hasPassword && (
                            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1" title="محمية بكلمة مرور">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                          {isOwner && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                              <Crown className="w-3 h-3 text-amber-400" />
                              صاحب الغرفة
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Room Info */}
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                          {room.name || 'غرفة المشاهدة'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span>المنشئ: <strong className="text-slate-200">{room.creatorName || 'الإدارة'}</strong></span>
                        </div>
                      </div>

                      {/* Footer & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
                        <span className="font-mono text-xs text-slate-400 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                          #{room.id}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleOpenEdit(room, e)}
                                className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                title="تعديل الغرفة"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleOpenDelete(room, e)}
                                className="p-1.5 text-red-400 hover:text-red-300 bg-red-600/10 hover:bg-red-600/20 rounded-lg transition-colors"
                                title="حذف الغرفة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1">
                            دخول
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: My Rooms */}
        {activeTab === 'my' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  غرفي الخاصة (أنت صاحب الغرفة)
                </h2>
                <p className="text-xs text-slate-400">الغرف التي قمت بإنشائها، يمكنك تعديلها أو حذفها والتحكم بها في أي وقت</p>
              </div>
            </div>

            {myRooms.length === 0 ? (
              <div className="bg-slate-900/50 border border-dashed border-white/15 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Crown className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">لم تقم بإنشاء أي غرفة بعد</h3>
                <p className="text-xs text-slate-400 max-w-sm">أنشئ غرفتك الخاصة الآن واختر ما إذا كانت عامة للجميع أو خاصة بك وبأصدقائك!</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  + إنشاء غرفة جديدة الآن
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-slate-900/80 hover:bg-slate-800/90 border border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        room.isPublic !== false 
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                          : 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {room.isPublic !== false ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {room.isPublic !== false ? 'غرفة عامة' : 'غرفة خاصة'}
                      </span>

                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        <Users className="w-3 h-3" />
                        <span>{room.memberCount || 0} حاضر</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{room.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">رمز الغرفة: {room.id}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(room, e)}
                          className="p-1.5 text-purple-300 hover:text-white bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleOpenDelete(room, e)}
                          className="p-1.5 text-red-300 hover:text-white bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectRoomForJoin(room)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <span>دخول الغرفة</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Visited History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  الغرف السابقة والمحفوظة
                </h2>
                <p className="text-xs text-slate-400">الغرف التي زرتها مسبقاً على هذا المتصفح للوصول السريع</p>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="bg-slate-900/50 border border-dashed border-white/15 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-3">
                <Clock className="w-10 h-10 text-slate-600" />
                <h3 className="text-base font-bold text-white">لا يوجد سجل غرف سابقة</h3>
                <p className="text-xs text-slate-400">ستظهر هنا أي غرفة تنضم إليها لتسهيل العودة إليها لاحقاً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((room) => {
                  const isOwner = isUserOwnerOf(room);
                  return (
                    <div
                      key={room.id}
                      onClick={() => handleSelectRoomForJoin(room)}
                      className="bg-slate-900/70 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer group shadow"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold shrink-0 text-sm">
                          {room.name ? room.name.substring(0, 1) : 'غ'}
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-white truncate">{room.name || 'غرفة المشاهدة'}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-400">رمز: {room.id}</span>
                            {isOwner && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 rounded font-semibold">
                                صاحب الغرفة
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleOpenDelete(room, e)}
                          className="p-1.5 text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                          title="حذف من السجل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Create New Room */}
        {activeTab === 'create' && (
          <div className="max-w-md mx-auto w-full bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">إنشاء غرفة مشاهدة جديدة</h3>
                <p className="text-xs text-slate-400">ستكون أنت صاحب الغرفة وبإمكانك إدارتها دائماً</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الغرفة</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="مثال: سهرة الأفلام والأنمي"
                  className="w-full bg-black/40 border border-white/15 focus:border-red-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة مرور الغرفة</label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="أدخل كلمة مرور لحماية الغرفة"
                  className="w-full bg-black/40 border border-white/15 focus:border-red-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  dir="ltr"
                />
              </div>

              {/* Room Privacy Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع وخصوصية الغرفة</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setCreateIsPublic(true)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                      createIsPublic
                        ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-900/20'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>غرفة عامة</span>
                    </div>
                    <p className="text-[10px] text-slate-400">تظهر لجميع الأعضاء في قائمة الغرف العامة</p>
                  </div>

                  <div
                    onClick={() => setCreateIsPublic(false)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                      !createIsPublic
                        ? 'bg-purple-600/20 border-purple-500 shadow-md shadow-purple-900/20'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      <span>غرفة خاصة</span>
                    </div>
                    <p className="text-[10px] text-slate-400">تظهر في "غرفي" ولا يدخلها أحد إلا برمز الغرفة</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating || !createName.trim() || !createPassword.trim()}
                className="w-full mt-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                {isCreating ? "جاري الإنشاء..." : "إنشاء وبدء المشاهدة فوراً"}
                <Play className="w-4 h-4 fill-current" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: Join Specific Room */}
        {activeTab === 'join' && (
          <div className="max-w-md mx-auto w-full bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">الانضمام لغرفة</h3>
                <p className="text-xs text-slate-400">أدخل رمز الغرفة أو اسمها مع كلمة المرور</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs text-center">
                {error}
              </div>
            )}

            {selectedRoom && (
              <div className="bg-blue-600/10 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0 text-xs">
                    {selectedRoom.name ? selectedRoom.name.substring(0, 1) : 'غ'}
                  </div>
                  <div className="truncate text-right">
                    <div className="text-xs text-blue-300 font-semibold">الغرفة المحددة:</div>
                    <div className="text-sm font-bold text-white truncate">{selectedRoom.name || 'غرفة المشاهدة'}</div>
                    <div className="text-[11px] font-mono text-slate-400">الرمز: {selectedRoom.id}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedRoom(null); setJoinId(''); }}
                  className="text-xs text-slate-300 hover:text-white px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            )}

            <form onSubmit={handleJoinExisting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الغرفة أو رمزها (ID)</label>
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => {
                    setJoinId(e.target.value);
                    if (selectedRoom && e.target.value !== selectedRoom.name && e.target.value !== selectedRoom.id) {
                      setSelectedRoom(null);
                    }
                  }}
                  placeholder="أدخل رمز الغرفة أو اسمها"
                  className="w-full bg-black/40 border border-white/15 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة مرور الغرفة</label>
                <input
                  id="joinPassword"
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور الغرفة"
                  className="w-full bg-black/40 border border-white/15 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  dir="ltr"
                />
              </div>

              {/* Remember Password Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none bg-black/20 p-2.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                  حفظ كلمة المرور لهذه الغرفة (عدم طلبها مجدداً على هذا الجهاز)
                </span>
              </label>

              <button
                type="submit"
                disabled={isJoining || (!selectedRoom && !joinId.trim()) || !joinPassword.trim()}
                className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                {isJoining ? "جاري الدخول..." : "دخول الغرفة"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Edit Room Modal (For Room Owner / Admin) */}
      {editingRoom && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setEditingRoom(null)}
        >
          <div 
            className="bg-[#0f172a] border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl z-[100000] text-right"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">تعديل بيانات الغرفة</h3>
              </div>
              <button 
                onClick={() => setEditingRoom(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الغرفة الجديد</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">تغيير كلمة المرور (اتركه فارغاً للإبقاء على الحالية)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="كلمة مرور جديدة (اختياري)"
                  className="w-full bg-black/40 border border-white/15 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع الخصوصية</label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setEditIsPublic(true)}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5 ${
                      editIsPublic 
                        ? 'bg-blue-600 text-white border-blue-400' 
                        : 'bg-black/30 text-slate-300 border-white/10'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>عامة للجميع</span>
                  </div>
                  <div
                    onClick={() => setEditIsPublic(false)}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs font-bold flex items-center justify-center gap-1.5 ${
                      !editIsPublic 
                        ? 'bg-purple-600 text-white border-purple-400' 
                        : 'bg-black/30 text-slate-300 border-white/10'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>خاصة بي</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="flex-1 py-2.5 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editName.trim()}
                  className="flex-1 py-2.5 text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                >
                  {isSavingEdit ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal */}
      {roomToDelete && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setRoomToDelete(null)}
        >
          <div 
            className="bg-[#0f172a] border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl z-[100000] text-right"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">حذف الغرفة</h3>
              </div>
              <button 
                onClick={() => setRoomToDelete(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black/30 p-3 rounded-xl mb-4 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">{roomToDelete.name || 'غرفة المشاهدة'}</div>
                <div className="text-xs font-mono text-slate-400">رمز الغرفة: {roomToDelete.id}</div>
              </div>
              {isUserOwnerOf(roomToDelete) && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                  أنت صاحب الغرفة
                </span>
              )}
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              {!isUserOwnerOf(roomToDelete) && (
                <div>
                  <label className="block text-xs font-medium text-red-200 mb-1.5">
                    أدخل كلمة مرور الغرفة لتأكيد الحذف:
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="كلمة مرور الغرفة"
                    className="w-full bg-black/40 border border-red-500/40 focus:border-red-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                    dir="ltr"
                    autoFocus
                  />
                </div>
              )}

              {isUserOwnerOf(roomToDelete) && (
                <p className="text-xs text-slate-300 bg-red-950/30 border border-red-500/30 p-3 rounded-xl leading-relaxed">
                  بصفتك صاحب الغرفة أو إدارة المنصة، يمكنك حذف هذه الغرفة نهائياً من الخادم وسيتم إغلاقها فوراً أمام جميع المشاهدين.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoomToDelete(null)}
                  className="flex-1 py-2.5 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="flex-1 py-2.5 text-xs bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? "جاري الحذف..." : "تأكيد الحذف النهائي"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Admin Stealth Mode Choice Modal */}
      {stealthTargetRoom && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setStealthTargetRoom(null)}
        >
          <div 
            className="bg-[#0b1120] border border-purple-500/40 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl z-[100000] text-right"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">صلاحيات الأدمن العام</h3>
                  <p className="text-xs text-purple-300 font-mono">تخطي كلمة المرور لغرفة: {stealthTargetRoom.name || stealthTargetRoom.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setStealthTargetRoom(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed bg-purple-950/30 p-3.5 rounded-2xl border border-purple-500/20">
              بصفتك الأدمن العام للمنصة، يمكنك الدخول لأي غرفة بدون كلمة مرور. اختر وضع الدخول المناسب:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
              {/* Stealth / Casper Mode */}
              <button
                type="button"
                onClick={() => handleAdminStealthJoin(true)}
                className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-purple-950/40 border-2 border-purple-500/40 hover:border-purple-400 flex flex-col gap-2.5 text-right transition-all group hover:scale-[1.02] cursor-pointer shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 group-hover:bg-purple-500/30 transition-colors">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>وضع التخفي (كاسبر)</span>
                    <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded-md font-mono">مخفي 100%</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    اختفاء كامل داخل الغرفة، لا يظهر اسمك أو صورتك أو رقم الحضور (مثل الشبح كاسبر) للمراقبة الصامتة.
                  </p>
                </div>
              </button>

              {/* Visible Admin Mode */}
              <button
                type="button"
                onClick={() => handleAdminStealthJoin(false)}
                className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-blue-950/40 border-2 border-blue-500/40 hover:border-blue-400 flex flex-col gap-2.5 text-right transition-all group hover:scale-[1.02] cursor-pointer shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 group-hover:bg-blue-500/30 transition-colors">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>الدخول المرئي العادي</span>
                    <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded-md font-mono">شارة أدمن</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    الدخول كأدمن رسمي مرئي للجميع مع شارة الإدارة والظهور في قائمة الأعضاء والمشاهدة المشتركة.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStealthTargetRoom(null)}
                className="px-5 py-2 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showProfileModal && currentUser && (
        <ProfileModal
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUserUpdated={(updatedUser) => {
            if (onUserUpdated) onUserUpdated(updatedUser);
          }}
        />
      )}
    </div>
  );
}
