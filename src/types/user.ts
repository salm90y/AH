export type UserRole = 'admin' | 'moderator' | 'vip' | 'user';

export interface UserPermissions {
  canCreateRooms: boolean;
  canStream: boolean;
  canVoiceChat: boolean;
  canCamera: boolean;
  canManageUsers: boolean;
}

export interface BirthDate {
  day: number;
  month: number;
  year: number;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  birthDate: BirthDate;
  phone: string;
  avatar: string;
  role: UserRole;
  permissions: UserPermissions;
  isBanned: boolean;
  banReason?: string;
  createdAt: number;
  lastLogin?: number;
  notes?: string;
}

export interface AuthSession {
  user: UserAccount;
  token: string;
  loginTime: number;
}
