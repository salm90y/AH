import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  X, 
  Save, 
  Upload, 
  Sparkles, 
  Lock, 
  Phone, 
  Calendar, 
  Check, 
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { UserAccount, BirthDate } from '../types/user';
import { updateUser, AVATAR_PRESETS } from '../utils/auth';

interface ProfileModalProps {
  currentUser: UserAccount;
  onClose: () => void;
  onUserUpdated: (user: UserAccount) => void;
}

const EXTENDED_AVATARS = [
  ...AVATAR_PRESETS,
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&auto=format&fit=crop&q=80',
];

export default function ProfileModal({ currentUser, onClose, onUserUpdated }: ProfileModalProps) {
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [password, setPassword] = useState(currentUser.password || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || EXTENDED_AVATARS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [day, setDay] = useState<number>(currentUser.birthDate?.day || 1);
  const [month, setMonth] = useState<number>(currentUser.birthDate?.month || 1);
  const [year, setYear] = useState<number>(currentUser.birthDate?.year || 2000);
  const [notes, setNotes] = useState(currentUser.notes || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeAvatarTab, setActiveAvatarTab] = useState<'presets' | 'custom' | 'upload'>('presets');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً، الحد الأقصى هو 5 ميغابايت');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('فشل رفع الصورة إلى الخادم');
      }

      const data = await res.json();
      if (data.url) {
        setAvatar(data.url);
        setCustomAvatarUrl(data.url);
        setSuccessMsg('تم رفع الصورة الرمزية بنجاح!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err: any) {
      // Fallback to local Data URL
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
          setCustomAvatarUrl(reader.result);
          setSuccessMsg('تم تعيين الصورة الرمزية محلياً');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAvatarUrl.trim()) return;
    setAvatar(customAvatarUrl.trim());
    setSuccessMsg('تم تعيين رابط الصورة بنجاح');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('يرجى إدخال الاسم الكامل');
      return;
    }
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const birthDate: BirthDate = {
        day: Number(day),
        month: Number(month),
        year: Number(year),
      };

      const result = await updateUser(currentUser.id, {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        password: password.trim(),
        phone: phone.trim(),
        avatar: avatar.trim(),
        birthDate,
        notes: notes.trim(),
      });

      if (!result.success || !result.user) {
        throw new Error(result.error || 'فشل حفظ التعديلات');
      }

      onUserUpdated(result.user);
      setSuccessMsg('تم تحديث بيانات ملفك الشخصي بنجاح!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الملف الشخصي');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      dir="rtl"
    >
      <div 
        className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/50 to-indigo-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center border border-purple-400/30 text-white shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>تعديل الملف الشخصي</span>
                {currentUser.role === 'admin' && (
                  <span className="text-[10px] bg-purple-600/40 text-purple-300 px-2 py-0.5 rounded-full border border-purple-400/30">
                    المدير العام
                  </span>
                )}
              </h3>
              <p className="text-xs text-purple-200/70">تحديث الصورة الرمزية والاسم وكلمة المرور وتفاصيل الحساب</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-2xl text-red-300 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Avatar Chooser */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <label className="text-xs font-bold text-gray-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>الصورة الرمزية (الأفاتار)</span>
              </span>
              <span className="text-[11px] text-gray-400">اختر من القائمة أو ارفع صورتك الخاصة</span>
            </label>

            {/* Current Selected Avatar Preview */}
            <div className="flex items-center gap-4 py-1">
              <div className="relative shrink-0">
                <img
                  src={avatar}
                  alt={fullName || username}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-purple-500 shadow-lg shadow-purple-500/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = EXTENDED_AVATARS[0];
                  }}
                />
                <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1 rounded-lg border border-white/20 shadow">
                  <Check className="w-3 h-3" />
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAvatarTab('presets')}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer border ${
                      activeAvatarTab === 'presets'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                    }`}
                  >
                    صور جاهزة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAvatarTab('upload');
                      fileInputRef.current?.click();
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer border flex items-center gap-1 ${
                      activeAvatarTab === 'upload'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة من الجهاز</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAvatarTab('custom')}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer border ${
                      activeAvatarTab === 'custom'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                    }`}
                  >
                    رابط مباشر
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {isUploading && (
                  <div className="flex items-center gap-2 text-xs text-purple-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري رفع الصورة...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Presets Grid */}
            {activeAvatarTab === 'presets' && (
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 pt-2 border-t border-white/10">
                {EXTENDED_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(preset)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer aspect-square ${
                      avatar === preset
                        ? 'border-purple-500 scale-105 shadow-md shadow-purple-500/40 ring-2 ring-purple-400/50'
                        : 'border-transparent hover:border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset}
                      alt={`Avatar ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Custom URL Input */}
            {activeAvatarTab === 'custom' && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <input
                  type="url"
                  value={customAvatarUrl}
                  onChange={e => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-left"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold shrink-0"
                >
                  تطبيق
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Core Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>الاسم الكامل المعروض:</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="مثال: أحمد العراقي"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-right"
                required
              />
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>اسم المستخدم (لتسجيل الدخول):</span>
                <span className="text-[10px] text-gray-400 font-mono">@username</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ahmed"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono text-left"
                dir="ltr"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                <span>كلمة المرور:</span>
              </label>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono text-left"
                dir="ltr"
                required
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-purple-400" />
                <span>رقم الهاتف:</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07700000000"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Birth Date (Day, Month, Year) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>المواليد / تاريخ الميلاد:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Day */}
              <select
                value={day}
                onChange={e => setDay(Number(e.target.value))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d} className="bg-slate-900 text-white">
                    يوم {d}
                  </option>
                ))}
              </select>

              {/* Month */}
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
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
                  '12 - كانون الأول (ديسمبر)',
                ].map((m, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>

              {/* Year */}
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {Array.from({ length: 80 }, (_, i) => 2026 - i).map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    سنة {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes / Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>نبذة تعريفية (Bio):</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اكتب نبذة قصيرة عنك أو ملاحظاتك الشخصية..."
              rows={2}
              className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-right resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
