import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  LogIn, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Shield, 
  AlertCircle, 
  Sparkles,
  KeyRound,
  CheckCircle2,
  Check
} from 'lucide-react';
import { loginUser } from '../utils/auth';
import { UserAccount } from '../types/user';
import { getItemSafe, setItemSafe } from '../utils/storage';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onBackToLanding: () => void;
}

export default function LoginPage({ onLoginSuccess, onBackToLanding }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved credentials on mount if available
  useEffect(() => {
    getItemSafe<{ username?: string; password?: string; remember?: boolean } | null>('ah_saved_login', null).then(saved => {
      if (saved && saved.remember) {
        if (saved.username) setUsername(saved.username);
        if (saved.password) setPassword(saved.password);
        setRememberMe(true);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginUser(username, password);
      if (res.success && res.user) {
        // Save or clear remembered credentials based on checkbox
        if (rememberMe) {
          await setItemSafe('ah_saved_login', {
            username: username.trim(),
            password: password.trim(),
            remember: true
          });
        } else {
          await setItemSafe('ah_saved_login', { remember: false });
        }

        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'فشل تسجيل الدخول، يرجى التحقق من البيانات');
      }
    } catch (err: any) {
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 py-12 selection:bg-purple-500/30 overflow-hidden" dir="rtl">
      {/* Ambient background lights */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-purple-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Back button */}
      <div className="w-full max-w-md mb-6 z-10">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/5 backdrop-blur-md cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للواجهة الرئيسية</span>
        </button>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-[#0f172a]/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-purple-950/40">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 p-[1px] shadow-xl shadow-purple-900/50 mb-4">
            <div className="w-full h-full bg-[#0b0f19] rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                AH
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">تسجيل الدخول للمنصة</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">أدخل بيانات حسابك للمتابعة إلى غرف البث والمشاهدة</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 backdrop-blur-md animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username input */}
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>اسم المستخدم (اليوزر)</span>
              <span className="text-[10px] text-slate-500 font-mono">Username</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                dir="ltr"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pr-10 pl-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono text-left"
                autoComplete="username"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>كلمة المرور (الباسورد)</span>
              <span className="text-[10px] text-slate-500 font-mono">Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pr-10 pl-10 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono text-left"
                autoComplete="current-password"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox (مربع حفظ) */}
          <div className="flex items-center justify-between pt-1">
            <label 
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div 
                className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                  rememberMe 
                    ? 'bg-purple-600 border-purple-500 shadow-sm shadow-purple-900/50' 
                    : 'bg-slate-900/80 border-slate-700 group-hover:border-slate-500'
                }`}
              >
                {rememberMe && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </div>
              <span className="text-xs text-slate-300 group-hover:text-white font-medium transition-colors">
                حفظ بيانات تسجيل الدخول (تذكرني)
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-purple-900/30 active:scale-[0.98] transition-all cursor-pointer border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جاري تسجيل الدخول...</span>
              </span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>دخول للمنصة</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
