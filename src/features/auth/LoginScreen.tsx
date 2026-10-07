import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  User,
  AlertCircle
} from 'lucide-react';

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
}) => {
  const { signIn, signInWithGoogle, signInAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateEmail = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    if (!email.trim()) {
      setEmailError('Please enter your campus email');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address (e.g. alex@campus.edu)');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Please enter your password');
      isValid = false;
    }

    if (!isValid) return;

    setLoading(true);
    setErrorMessage(null);

    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (!result.success && result.error) {
      setErrorMessage(typeof result.error === 'string' ? result.error : 'Sign in failed. Please verify credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f3] flex items-center justify-center p-4 sm:p-6 selection:bg-lime-400 selection:text-forest-950">
      <div className="w-full max-w-md bg-white rounded-4xl p-6 sm:p-8 border border-slate-200/80 shadow-card space-y-6 animate-fade-in relative overflow-hidden">
        {/* Subtle decorative background gradient node */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-lime-300/20 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Brand Logo & Tagline */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center justify-center relative group">
            <div className="w-14 h-14 rounded-2xl bg-forest-900 text-lime-400 font-display font-extrabold text-2xl flex items-center justify-center shadow-lg border-2 border-white group-hover:scale-105 transition-transform">
              F
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-lime-400 border-2 border-white" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-display font-black text-2xl tracking-tight text-slate-900">FYND</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-lime-100 text-forest-900 border border-lime-300 uppercase tracking-wider">
                Campus PWA
              </span>
            </div>
            <p className="text-xs font-semibold text-forest-700 tracking-wide mt-0.5">
              Find it. Verify it. Return it.
            </p>
          </div>
        </div>

        {/* 2. Google One-Click Login Button */}
        <div className="space-y-3 relative z-10">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:border-forest-600 text-slate-700 text-xs sm:text-sm font-bold shadow-soft hover:shadow-card flex items-center justify-center gap-3 transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center pt-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
              or with campus email
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* 3. Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Campus Email</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="email"
                placeholder="e.g. alex.rivera@campus.edu"
                value={email}
                onChange={handleEmailChange}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-forest-700 font-medium transition-colors ${
                  emailError ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                }`}
              />
            </div>
            {emailError && <p className="text-[11px] text-rose-600 font-semibold mt-1">{emailError}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">Password</label>
              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-[11px] font-bold text-forest-700 hover:text-forest-900"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                className={`w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-forest-700 font-medium transition-colors ${
                  passwordError ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && <p className="text-[11px] text-rose-600 font-semibold mt-1">{passwordError}</p>}
          </div>

          {/* Primary Action Button in Deep Forest Green + Lime */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-forest-900 text-lime-400 hover:bg-forest-800 shadow-card hover:shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to FYND</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 4. One-Click Demo Mode Buttons */}
        <div className="p-3.5 rounded-3xl bg-forest-50 border border-forest-200/80 space-y-2 relative z-10">
          <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-forest-900">
            <Sparkles className="w-3.5 h-3.5 text-forest-700" />
            <span>Instant Demo Accounts</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => signInAsDemo('student')}
              className="py-2 px-3 rounded-xl bg-forest-900 text-lime-400 text-xs font-bold hover:bg-forest-800 shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <User className="w-3.5 h-3.5 text-lime-400" />
              <span>Student Alex</span>
            </button>
            <button
              type="button"
              onClick={() => signInAsDemo('moderator')}
              className="py-2 px-3 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Officer Jenkins</span>
            </button>
          </div>
        </div>

        {/* 5. Switch to Sign Up */}
        <div className="text-center pt-1 relative z-10">
          <p className="text-xs text-slate-500">
            New to campus recovery?{' '}
            <button
              type="button"
              onClick={onNavigateToSignUp}
              className="font-bold text-forest-900 hover:text-forest-700 hover:underline"
            >
              Create an Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
