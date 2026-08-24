import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  UserPlus, 
  Users, 
  Search, 
  Edit3, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  Calendar, 
  Key, 
  User, 
  X, 
  Save, 
  AlertTriangle, 
  Check, 
  Upload, 
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
  Radio,
  Video,
  Mic,
  Plus,
  RefreshCw
} from 'lucide-react';
import { UserAccount, UserRole, UserPermissions, BirthDate } from '../types/user';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  toggleBanUser, 
  AVATAR_PRESETS,
  DEFAULT_PERMISSIONS
} from '../utils/auth';

interface AdminDashboardProps {
  currentUser: UserAccount;
  onClose: () => void;
  onUserUpdated?: (user: UserAccount) => void;
}

export default function AdminDashboard({ currentUser, onClose, onUserUpdated }: AdminDashboardProps) {
  if (currentUser.role !== 'admin') {
    return null;
  }

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formDay, setFormDay] = useState<number>(1);
  const [formMonth, setFormMonth] = useState<number>(1);
  const [formYear, setFormYear] = useState<number>(2000);
  const [formPhone, setFormPhone] = useState('');
  const [formAvatar, setFormAvatar] = useState(AVATAR_PRESETS[0]);
  const [formRole, setFormRole] = useState<UserRole>('user');
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS.user);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Ban Modal
  const [banModalUser, setBanModalUser] = useState<UserAccount | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('مخالفة شروط وقواعد المنصة');
  const [banSaving, setBanSaving] = useState(false);

  // Delete Modal
  const [deleteModalUser, setDeleteModalUser] = useState<UserAccount | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadUsersList = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  // Update permissions when role changes in form
  const handleRoleChange = (newRole: UserRole) => {
    setFormRole(newRole);
    setFormPermissions(DEFAULT_PERMISSIONS[newRole]);
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setFormUsername('');
    setFormPassword('');
    setFormFullName('');
    setFormDay(1);
    setFormMonth(1);
    setFormYear(2000);
    setFormPhone('');
    setFormAvatar(AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)]);
    setFormRole('user');
    setFormPermissions(DEFAULT_PERMISSIONS.user);
    setFormNotes('');
    setFormError('');
    setShowUserModal(true);
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUserId(user.id);
    setFormUsername(user.username);
    setFormPassword(user.password);
    setFormFullName(user.fullName);
    setFormDay(user.birthDate?.day || 1);
    setFormMonth(user.birthDate?.month || 1);
    setFormYear(user.birthDate?.year || 2000);
    setFormPhone(user.phone || '');
    setFormAvatar(user.avatar || AVATAR_PRESETS[0]);
    setFormRole(user.role);
    setFormPermissions(user.permissions || DEFAULT_PERMISSIONS[user.role]);
    setFormNotes(user.notes || '');
    setFormError('');
    setShowUserModal(true);
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      setFormError('يرجى إدخال اسم المستخدم (اليوزر)');
      return;
    }
    if (!formPassword.trim()) {
      setFormError('يرجى إدخال كلمة المرور');
      return;
    }
    if (!formFullName.trim()) {
      setFormError('يرجى إدخال الاسم الكامل');
      return;
    }

    setFormSaving(true);
    setFormError('');

    const birthDate: BirthDate = {
      day: Number(formDay),
      month: Number(formMonth),
      year: Number(formYear),
    };

    try {
      if (editingUserId) {
        // Edit
        const res = await updateUser(editingUserId, {
          username: formUsername.trim(),
          password: formPassword.trim(),
          fullName: formFullName.trim(),
          birthDate,
          phone: formPhone.trim(),
          avatar: formAvatar,
          role: formRole,
          permissions: formPermissions,
          notes: formNotes.trim(),
        });

        if (!res.success) {
          setFormError(res.error || 'فشل تحديث الحساب');
          return;
        }

        if (res.user && editingUserId === currentUser.id) {
          onUserUpdated?.(res.user);
        }
      } else {
        // Create
        const res = await createUser({
          username: formUsername.trim(),
          password: formPassword.trim(),
          fullName: formFullName.trim(),
          birthDate,
          phone: formPhone.trim(),
          avatar: formAvatar,
          role: formRole,
          permissions: formPermissions,
          isBanned: false,
          notes: formNotes.trim(),
        });

        if (!res.success) {
          setFormError(res.error || 'فشل إنشاء الحساب');
          return;
        }
      }

      setShowUserModal(false);
      await loadUsersList();
    } catch (err: any) {
      setFormError('حدث خطأ أثناء الحفظ');
    } finally {
      setFormSaving(false);
    }
  };

  const handleConfirmBan = async () => {
    if (!banModalUser) return;
    setBanSaving(true);
    try {
      const nextStatus = !banModalUser.isBanned;
      await toggleBanUser(banModalUser.id, nextStatus, nextStatus ? banReasonInput : undefined);
      setBanModalUser(null);
      await loadUsersList();
    } catch (e) {
      console.error(e);
    } finally {
      setBanSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    setDeleteSaving(true);
    try {
      await deleteUser(deleteModalUser.id);
      setDeleteModalUser(null);
      await loadUsersList();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteSaving(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && !u.isBanned) || 
      (statusFilter === 'banned' && u.isBanned);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Stats
  const totalCount = users.length;
  const activeCount = users.filter(u => !u.isBanned).length;
  const bannedCount = users.filter(u => u.isBanned).length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16]/95 backdrop-blur-2xl flex flex-col text-white overflow-hidden selection:bg-purple-500/30" dir="rtl">
      {/* Top Navbar */}
      <header className="px-4 sm:px-8 py-4 bg-[#0f172a]/90 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1px] shadow-md shadow-purple-900/50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white">لوحة تحكم منصة AH</h1>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                إدارة المستخدمين
              </span>
            </div>
            <p className="text-xs text-slate-400">إدارة الحسابات، الصلاحيات، الحظر، وإنشاء المستخدمين الجدد</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-900/30 transition-all cursor-pointer active:scale-95 border border-white/10"
          >
            <UserPlus className="w-4 h-4" />
            <span>إنشاء حساب جديد</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">إجمالي الحسابات</p>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">{totalCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">الحسابات النشطة</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">الحسابات المحظورة</p>
              <h3 className="text-xl sm:text-2xl font-black text-red-400 mt-1">{bannedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Ban className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">المدراء والمشرفين</p>
              <h3 className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">{adminCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، اسم المستخدم (اليوزر)، أو الهاتف..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">جميع الرتب</option>
              <option value="admin">مدير عام (Admin)</option>
              <option value="moderator">مشرف (Moderator)</option>
              <option value="vip">عضو مميز (VIP)</option>
              <option value="user">عضو عادي (User)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">النشط فقط</option>
              <option value="banned">المحظور فقط</option>
            </select>

            <button
              onClick={loadUsersList}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Users List Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800/80">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">لا توجد حسابات مطابقة</h3>
              <p className="text-xs text-slate-500 mt-1">جرب تغيير كلمات البحث أو الفلاتر</p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const isAdmin = user.role === 'admin';
              const isAhmedRoot = user.username.toLowerCase() === 'ahmed';

              return (
                <div
                  key={user.id}
                  className={`relative p-5 rounded-2xl bg-slate-900/90 border transition-all duration-200 flex flex-col justify-between gap-4 ${
                    user.isBanned 
                      ? 'border-red-900/50 bg-red-950/20' 
                      : isAdmin 
                      ? 'border-purple-500/40 shadow-lg shadow-purple-950/20' 
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Section: Avatar, Info, Role */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={user.avatar || AVATAR_PRESETS[0]}
                          alt={user.fullName}
                          referrerPolicy="no-referrer"
                          className="w-13 h-13 rounded-2xl object-cover border-2 border-slate-700/80 shadow-md"
                        />
                        <span 
                          className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                            user.isBanned ? 'bg-red-500' : 'bg-emerald-400'
                          }`}
                          title={user.isBanned ? 'محظور' : 'نشط'}
                        />
                      </div>

                      <div className="text-right">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {user.fullName}
                          {isAhmedRoot && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                              ROOT
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-purple-300/90 font-mono" dir="ltr">@{user.username}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">كلمة المرور: <span className="font-mono text-slate-300">{user.password}</span></p>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div>
                      {user.role === 'admin' && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                          مدير عام
                        </span>
                      )}
                      {user.role === 'moderator' && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">
                          مشرف
                        </span>
                      )}
                      {user.role === 'vip' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                          VIP مميز
                        </span>
                      )}
                      {user.role === 'user' && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                          عضو
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata fields: Phone, Birthday */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>التولد:</span>
                      </span>
                      <span className="text-slate-200 font-mono">
                        {user.birthDate?.day || 1} / {user.birthDate?.month || 1} / {user.birthDate?.year || 2000}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>رقم الهاتف:</span>
                      </span>
                      <span className="text-slate-200 font-mono" dir="ltr">{user.phone || 'غير مسجل'}</span>
                    </div>

                    {/* Permissions summary */}
                    <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500">الصلاحيات:</span>
                      {user.permissions?.canCreateRooms && (
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">غرف</span>
                      )}
                      {user.permissions?.canStream && (
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">بث</span>
                      )}
                      {user.permissions?.canVoiceChat && (
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">صوت</span>
                      )}
                      {user.permissions?.canCamera && (
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">كاميرا</span>
                      )}
                    </div>

                    {user.isBanned && (
                      <div className="mt-2 p-2 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-[11px]">
                        <strong>محظور:</strong> {user.banReason || 'مخالفة الشروط'}
                      </div>
                    )}
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                      <span>تعديل</span>
                    </button>

                    {!isAhmedRoot && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setBanModalUser(user);
                            setBanReasonInput(user.isBanned ? '' : 'مخالفة شروط وقواعد المنصة');
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                            user.isBanned
                              ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{user.isBanned ? 'إلغاء الحظر' : 'حظر'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteModalUser(user)}
                          className="p-2 rounded-xl bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-red-200 text-xs font-semibold transition-colors cursor-pointer border border-red-500/30"
                          title="حذف الحساب نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <button
              onClick={() => setShowUserModal(false)}
              className="absolute left-6 top-6 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                {editingUserId ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-white">
                  {editingUserId ? 'تعديل بيانات الحساب والصلاحيات' : 'إنشاء حساب جديد في منصة AH'}
                </h3>
                <p className="text-xs text-slate-400">املأ البيانات المطلوبة لإنشاء أو تعديل حساب العضو</p>
              </div>
            </div>

            {formError && (
              <div className="mb-5 p-3 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-5 text-right">
              {/* Avatar Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">الصورة الرمزية (الأفاتار)</label>
                <div className="flex items-center gap-4">
                  <img
                    src={formAvatar}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500 shadow-md"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {AVATAR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormAvatar(preset)}
                          className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            formAvatar === preset ? 'border-purple-500 scale-105' : 'border-slate-700 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={preset} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-purple-400" />
                        <span>رفع صورة من الجهاز</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">اسم المستخدم (اليوزر) *</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="مثال: ali_99"
                    dir="ltr"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">كلمة المرور (الباسورد) *</label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">الاسم الكامل *</label>
                  <input
                    type="text"
                    value={formFullName}
                    onChange={e => setFormFullName(e.target.value)}
                    placeholder="مثال: علي كريم"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">رقم الهاتف</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="07700000000"
                    dir="ltr"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date of Birth (تولد: يوم، شهر، سنة) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>تاريخ التولد (يوم / شهر / سنة) *</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Day */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">اليوم</label>
                    <select
                      value={formDay}
                      onChange={e => setFormDay(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">الشهر</label>
                    <select
                      value={formMonth}
                      onChange={e => setFormMonth(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none cursor-pointer"
                    >
                      {[
                        '1 - كانون الثاني (يناير)',
                        '2 - شباط (فبراير)',
                        '3 - آذار (مارس)',
                        '4 - نيسان (أبريل)',
                        '5 - أيار (مايو)',
                        '6 - حزيران (يونيو)',
                        '7 - تموز (يوليو)',
                        '8 - آب (أغسطس)',
                        '9 - أيلول (سبتمبر)',
                        '10 - تشرين الأول (أكتوبر)',
                        '11 - تشرين الثاني (نوفمبر)',
                        '12 - كانون الأول (ديسمبر)'
                      ].map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">السنة</label>
                    <select
                      value={formYear}
                      onChange={e => setFormYear(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none cursor-pointer font-mono"
                    >
                      {Array.from({ length: 80 }, (_, i) => 2026 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الرتبة والصلاحية الأساسية *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'user', label: 'عضو عادي', desc: 'مشاهدة ومشاركة' },
                    { id: 'vip', label: 'عضو مميز VIP', desc: 'أولوية وميزات' },
                    { id: 'moderator', label: 'مشرف غرف', desc: 'إدارة الغرف' },
                    { id: 'admin', label: 'مدير عام', desc: 'كامل الصلاحيات' },
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleChange(r.id as UserRole)}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        formRole === r.id
                          ? 'bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <p className={`text-xs font-bold ${formRole === r.id ? 'text-white' : 'text-slate-300'}`}>{r.label}</p>
                      <p className="text-[10px] text-slate-500">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Permissions */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300">تخصيص الصلاحيات الدقيقة</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canCreateRooms}
                      onChange={e => setFormPermissions(p => ({ ...p, canCreateRooms: e.target.checked }))}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>إنشاء غرف مشاهدة جديدة</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canStream}
                      onChange={e => setFormPermissions(p => ({ ...p, canStream: e.target.checked }))}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>تغيير الفيديو وتشغيل البثوث المباشرة</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canVoiceChat}
                      onChange={e => setFormPermissions(p => ({ ...p, canVoiceChat: e.target.checked }))}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>استخدام الدردشة الصوتية (ووكي توكي)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canCamera}
                      onChange={e => setFormPermissions(p => ({ ...p, canCamera: e.target.checked }))}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>فتح الكاميرا المباشرة</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={formSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-900/30 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{formSaving ? 'جاري الحفظ...' : editingUserId ? 'حفظ التعديلات' : 'إنشاء الحساب الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BAN / UNBAN MODAL */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-3xl p-6 shadow-2xl text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <Ban className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white">
              {banModalUser.isBanned ? 'إلغاء حظر الحساب' : 'تأكيد حظر الحساب'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {banModalUser.isBanned 
                ? `هل أنت متأكد من رغبتك في رفع الحظر عن العضو (${banModalUser.fullName})؟` 
                : `سيتم منع العضو (${banModalUser.fullName}) من تسجيل الدخول ودخول الغرف.`}
            </p>

            {!banModalUser.isBanned && (
              <div className="mt-4 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">سبب الحظر (سيظهر للعضو عند محاولة الدخول):</label>
                <input
                  type="text"
                  value={banReasonInput}
                  onChange={e => setBanReasonInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                تراجع
              </button>

              <button
                type="button"
                onClick={handleConfirmBan}
                disabled={banSaving}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-all ${
                  banModalUser.isBanned ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {banSaving ? 'جاري التنفيذ...' : banModalUser.isBanned ? 'رفع الحظر الآن' : 'تأكيد الحظر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-red-900/50 rounded-3xl p-6 shadow-2xl text-right">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white">حذف الحساب نهائياً</h3>
            <p className="text-xs text-slate-400 mt-1">
              هل أنت متأكد من حذف حساب ({deleteModalUser.fullName} - @{deleteModalUser.username})؟ لا يمكن التراجع عن هذه الخطوة.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSaving}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                {deleteSaving ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
