import { useState, useEffect } from 'react';
import JoinRoom from './components/JoinRoom';
import WatchRoom from './components/WatchRoom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import { getCurrentUser, logoutUser } from './utils/auth';
import { UserAccount } from './types/user';
import { getItemSafe, setItemSafe } from './utils/storage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [view, setView] = useState<'landing' | 'login' | 'app'>('landing');
  const [showAdminDashboard, setShowAdminDashboard] = useState<boolean>(false);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [initialRoomParam, setInitialRoomParam] = useState<string | null>(null);
  const [isStealth, setIsStealth] = useState<boolean>(false);

  useEffect(() => {
    // Check current authenticated user
    getCurrentUser().then(user => {
      setCurrentUser(user);
      setAuthChecked(true);

      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const loginParam = params.get('login');

      if (roomParam) {
        setInitialRoomParam(roomParam);
        setRoomId(roomParam);
        // If room is specified and user is logged in, show app, otherwise user can see landing/login
        if (user) {
          setView('app');
        } else {
          setView('login');
        }
      } else if (loginParam === 'true') {
        setView('login');
      } else if (user) {
        setView('app');
      } else {
        setView('landing');
      }
    });

    // Handle browser back/forward buttons
    const handlePopState = () => {
      const currentParams = new URLSearchParams(window.location.search);
      setRoomId(currentParams.get('room'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setView('app');
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setShowAdminDashboard(false);
    setView('landing');
    setRoomId(null);
    setIsStealth(false);
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleJoin = (id: string, isCreator: boolean = false, roomName?: string, stealth: boolean = false) => {
    const newUrl = `${window.location.pathname}?room=${id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(id);
    setIsStealth(stealth);
    
    getItemSafe<any[]>('visitedRooms', []).then(history => {
      const safeHistory = Array.isArray(history) ? [...history] : [];
      const existing = safeHistory.find((r: any) => r.id === id);
      if (existing) {
        existing.lastVisited = Date.now();
        if (isCreator) existing.isCreator = true;
        if (roomName && (!existing.name || existing.name === 'غرفة المشاهدة')) {
          existing.name = roomName;
        }
      } else {
        safeHistory.push({ id, isCreator, name: roomName || 'غرفة المشاهدة', lastVisited: Date.now() });
      }
      setItemSafe('visitedRooms', safeHistory).catch(() => {});
    }).catch(() => {});
  };

  const handleLeave = () => {
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(null);
    setIsStealth(false);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-white" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/50 animate-pulse">
            <span className="text-base font-black">AH</span>
          </div>
          <p className="text-xs text-slate-400 font-mono">جاري تحميل منصة AH...</p>
        </div>
      </div>
    );
  }

  // 1. Landing View
  if (view === 'landing') {
    return <LandingPage onEnter={() => setView('login')} />;
  }

  // 2. Login View
  if (view === 'login') {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess} 
        onBackToLanding={() => setView('landing')} 
      />
    );
  }

  // 3. Main App View (Rooms & Player)
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-purple-500/30 flex flex-col relative overflow-hidden" dir="rtl">
      {/* Ambient background glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/15 blur-[140px]"></div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col">
        {roomId ? (
          <WatchRoom 
            roomId={roomId} 
            onLeave={handleLeave} 
            currentUser={currentUser}
            isStealth={isStealth}
            onOpenAdmin={() => setShowAdminDashboard(true)}
            onUserUpdated={user => setCurrentUser(user)}
          />
        ) : (
          <JoinRoom 
            onJoin={handleJoin} 
            initialRoomId={initialRoomParam} 
            currentUser={currentUser}
            onOpenAdmin={() => setShowAdminDashboard(true)}
            onLogout={handleLogout}
            onUserUpdated={user => setCurrentUser(user)}
          />
        )}
      </main>

      {/* Admin Dashboard Modal (Admins Only) */}
      {showAdminDashboard && currentUser && currentUser.role === 'admin' && (
        <AdminDashboard 
          currentUser={currentUser}
          onClose={() => setShowAdminDashboard(false)}
          onUserUpdated={user => setCurrentUser(user)}
        />
      )}
    </div>
  );
}
