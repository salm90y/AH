import { getItemSafe, setItemSafe } from './storage';
import { UserAccount, UserRole, UserPermissions } from '../types/user';

const USERS_STORAGE_KEY = 'ah_platform_users_v1';
const CURRENT_USER_KEY = 'ah_platform_current_user_v1';

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    canCreateRooms: true,
    canStream: true,
    canVoiceChat: true,
    canCamera: true,
    canManageUsers: true,
  },
  moderator: {
    canCreateRooms: true,
    canStream: true,
    canVoiceChat: true,
    canCamera: true,
    canManageUsers: false,
  },
  vip: {
    canCreateRooms: true,
    canStream: true,
    canVoiceChat: true,
    canCamera: true,
    canManageUsers: false,
  },
  user: {
    canCreateRooms: true,
    canStream: true,
    canVoiceChat: true,
    canCamera: true,
    canManageUsers: false,
  },
};

export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
];

export const DEFAULT_ADMIN: UserAccount = {
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

// Initialize users list ensuring default admin exists
export async function getUsers(): Promise<UserAccount[]> {
  const localUsers = await getItemSafe<UserAccount[]>(USERS_STORAGE_KEY, []);

  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        const mergedMap = new Map<string, UserAccount>();

        if (Array.isArray(localUsers)) {
          localUsers.forEach(u => {
            if (u && u.username) {
              mergedMap.set(u.username.toLowerCase(), u);
            }
          });
        }

        data.users.forEach((u: UserAccount) => {
          if (u && u.username) {
            mergedMap.set(u.username.toLowerCase(), u);
          }
        });

        const mergedList = Array.from(mergedMap.values());
        await setItemSafe(USERS_STORAGE_KEY, mergedList);
        return mergedList;
      }
    }
  } catch (err) {
    console.warn('Could not fetch users from server, fallback to local storage:', err);
  }

  const users = Array.isArray(localUsers) ? [...localUsers] : [];
  if (users.length === 0) {
    const initialList = [DEFAULT_ADMIN];
    await setItemSafe(USERS_STORAGE_KEY, initialList);
    return initialList;
  }
  
  // Ensure default admin ahmed always exists with admin rights
  const adminIndex = users.findIndex(u => u && u.username && u.username.toLowerCase() === 'ahmed');
  if (adminIndex === -1) {
    users.unshift(DEFAULT_ADMIN);
    await setItemSafe(USERS_STORAGE_KEY, users);
  }
  
  return users;
}

export async function saveUsers(users: UserAccount[]): Promise<void> {
  await setItemSafe(USERS_STORAGE_KEY, users);
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  const user = await getItemSafe<UserAccount | null>(CURRENT_USER_KEY, null);
  if (!user) return null;
  
  // Refresh user data from latest users DB to reflect permission/ban changes
  const allUsers = await getUsers();
  const fresh = allUsers.find(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
  if (fresh) {
    if (fresh.isBanned) {
      await setCurrentUser(null);
      return null;
    }
    await setCurrentUser(fresh);
    return fresh;
  }
  return user;
}

export async function setCurrentUser(user: UserAccount | null): Promise<void> {
  await setItemSafe(CURRENT_USER_KEY, user);
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' };
  }

  // 1. Try server login first
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
    });
    const data = await res.json();
    if (data.success && data.user) {
      await setCurrentUser(data.user);
      // Also update local users cache
      getUsers().catch(() => {});
      return { success: true, user: data.user };
    } else if (res.status === 401 || res.status === 403 || res.status === 404) {
      return { success: false, error: data.error || 'بيانات الدخول غير صحيحة' };
    }
  } catch (err) {
    console.warn('Server login error, checking local storage:', err);
  }

  // 2. Fallback to local storage
  const users = await getUsers();
  const targetUser = users.find(u => u.username.toLowerCase() === cleanUsername);

  if (!targetUser) {
    return { success: false, error: 'اسم المستخدم غير مسجل في المنصة' };
  }

  if (targetUser.password !== cleanPassword) {
    return { success: false, error: 'كلمة المرور غير صحيحة' };
  }

  if (targetUser.isBanned) {
    return { 
      success: false, 
      error: `تم حظر هذا الحساب من قبل إدارة المنصة${targetUser.banReason ? ': ' + targetUser.banReason : ''}` 
    };
  }

  // Update last login
  targetUser.lastLogin = Date.now();
  await saveUsers(users);
  await setCurrentUser(targetUser);

  return { success: true, user: targetUser };
}

export async function logoutUser(): Promise<void> {
  await setCurrentUser(null);
}

export async function createUser(data: Omit<UserAccount, 'id' | 'createdAt'>): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanUsername = data.username.trim().toLowerCase();
  const cleanPassword = data.password.trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبة' };
  }

  // 1. Try server creation
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        username: cleanUsername,
        password: cleanPassword,
      }),
    });
    const result = await res.json();
    if (result.success && result.user) {
      if (Array.isArray(result.users)) {
        await setItemSafe(USERS_STORAGE_KEY, result.users);
      }
      return { success: true, user: result.user };
    } else if (result.error) {
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.warn('Server user creation failed, falling back to local storage:', err);
  }

  // 2. Fallback to local storage
  const users = await getUsers();

  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: 'اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم آخر' };
  }

  const newUser: UserAccount = {
    ...data,
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    username: cleanUsername,
    password: cleanPassword,
    fullName: data.fullName.trim() || cleanUsername,
    phone: data.phone.trim(),
    avatar: data.avatar || AVATAR_PRESETS[0],
    isBanned: false,
    createdAt: Date.now(),
  };

  users.push(newUser);
  await saveUsers(users);
  return { success: true, user: newUser };
}

export async function updateUser(id: string, updates: Partial<UserAccount>): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  // 1. Try server update
  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const result = await res.json();
    if (result.success && result.user) {
      if (Array.isArray(result.users)) {
        await setItemSafe(USERS_STORAGE_KEY, result.users);
      }
      // If current logged-in user is this user, refresh it
      const current = await getItemSafe<UserAccount | null>(CURRENT_USER_KEY, null);
      if (current && current.id === id) {
        await setCurrentUser(result.user);
      }
      return { success: true, user: result.user };
    } else if (result.error) {
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.warn('Server user update failed, falling back to local storage:', err);
  }

  // 2. Fallback to local storage
  const users = await getUsers();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return { success: false, error: 'لم يتم العثور على الحساب المطلوب' };
  }

  // If changing username, check collision
  if (updates.username) {
    const cleanUsername = updates.username.trim().toLowerCase();
    const collision = users.find(u => u.username.toLowerCase() === cleanUsername && u.id !== id);
    if (collision) {
      return { success: false, error: 'اسم المستخدم الجديد مستخدم بالفعل' };
    }
    updates.username = cleanUsername;
  }

  const updatedUser: UserAccount = {
    ...users[index],
    ...updates,
  };

  users[index] = updatedUser;
  await saveUsers(users);

  // If current logged-in user is this user, refresh it
  const current = await getItemSafe<UserAccount | null>(CURRENT_USER_KEY, null);
  if (current && current.id === id) {
    await setCurrentUser(updatedUser);
  }

  return { success: true, user: updatedUser };
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  // 1. Try server delete
  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (result.success) {
      if (Array.isArray(result.users)) {
        await setItemSafe(USERS_STORAGE_KEY, result.users);
      }
      const current = await getItemSafe<UserAccount | null>(CURRENT_USER_KEY, null);
      if (current && current.id === id) {
        await setCurrentUser(null);
      }
      return { success: true };
    } else if (result.error) {
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.warn('Server delete failed, falling back to local storage:', err);
  }

  // 2. Fallback to local storage
  const users = await getUsers();
  const target = users.find(u => u.id === id);

  if (!target) {
    return { success: false, error: 'الحساب غير موجود' };
  }

  if (target.username.toLowerCase() === 'ahmed') {
    return { success: false, error: 'لا يمكن حذف حساب المدير العام الرئيسي (ahmed)' };
  }

  const filtered = users.filter(u => u.id !== id);
  await saveUsers(filtered);

  // If deleted user was logged in, log out
  const current = await getItemSafe<UserAccount | null>(CURRENT_USER_KEY, null);
  if (current && current.id === id) {
    await setCurrentUser(null);
  }

  return { success: true };
}

export async function toggleBanUser(id: string, isBanned: boolean, banReason?: string): Promise<{ success: boolean; error?: string }> {
  // 1. Try server ban
  try {
    const res = await fetch(`/api/users/${id}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBanned, banReason }),
    });
    const result = await res.json();
    if (result.success) {
      if (Array.isArray(result.users)) {
        await setItemSafe(USERS_STORAGE_KEY, result.users);
      }
      const current = await getItemSafe<UserAccount | null>(CURRENT_USER_KEY, null);
      if (current && current.id === id && isBanned) {
        await setCurrentUser(null);
      }
      return { success: true };
    } else if (result.error) {
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.warn('Server toggle ban failed, falling back to local storage:', err);
  }

  // 2. Fallback to local storage
  const users = await getUsers();
  const target = users.find(u => u.id === id);

  if (!target) {
    return { success: false, error: 'الحساب غير موجود' };
  }

  if (target.username.toLowerCase() === 'ahmed' && isBanned) {
    return { success: false, error: 'لا يمكن حظر حساب المدير العام الرئيسي' };
  }

  target.isBanned = isBanned;
  target.banReason = isBanned ? (banReason || 'تم الحظر بواسطة الإدارة') : undefined;

  await saveUsers(users);

  const current = await getItemSafe<UserAccount | null>(CURRENT_USER_KEY, null);
  if (current && current.id === id && isBanned) {
    await setCurrentUser(null);
  }

  return { success: true };
}
