import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SignUpScreenProps {
  onNavigateToLogin: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ onNavigateToLogin }) => {
  const { signUp, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) return;

    setLoading(true);
    setErrorMessage(null);

    const result = await signUp(email.trim(), password, {
      displayName: fullName.trim(),
      department,
      studentId: studentId.trim() || 'STU-2026',
    });

    setLoading(false);

    if (result.success) {
      setIsSuccess(true);
    } else if (result.error) {
      setErrorMessage(typeof result.error === 'string' ? result.error : 'Registration failed.');
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f3] flex items-center justify-center p-4 sm:p-6 selection:bg-lime-400 selection:text-forest-950">
      <div className="w-full max-w-md bg-white rounded-4xl p-6 sm:p-8 border border-slate-200/80 shadow-card space-y-6 animate-fade-in relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-lime-300/20 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center justify-center relative">
            <div className="w-14 h-14 rounded-2xl bg-forest-900 text-lime-400 font-display font-extrabold text-2xl flex items-center justify-center shadow-lg border-2 border-white">
              F
            </div>
          </div>

          <div>
            <h1 className="font-display font-black text-2xl tracking-tight text-slate-900">
              Create FYND Account
            </h1>
            <p className="text-xs font-semibold text-forest-700 tracking-wide mt-0.5">
              Campus Identity & Recovery Network
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="space-y-4 text-center py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-forest-900 flex items-center justify-center mx-auto shadow-soft">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900">Account Created!</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your campus profile has been verified and registered. You can now access FYND.
            </p>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full py-3 rounded-2xl text-xs font-bold bg-forest-900 text-lime-400 hover:bg-forest-800 shadow-md"
            >
              Sign In to Continue
            </button>
          </div>
        ) : (
          <>
            {/* Google Fast Sign Up */}
            <div className="space-y-3 relative z-10">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={googleLoading || loading}
                className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:border-forest-600 text-slate-700 text-xs sm:text-sm font-bold shadow-soft flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
              >
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
                <span>Sign Up with Google</span>
              </button>

              <div className="relative flex items-center justify-center pt-1">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
                  or fill details
                </span>
              </div>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Full Name</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-forest-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Campus Email</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex.rivera@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-forest-700 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-forest-700 font-medium"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Business">Business</option>
                    <option value="Arts & Humanities">Arts</option>
                    <option value="Sciences">Sciences</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Student / Staff ID</label>
                  <input
                    type="text"
                    placeholder="CS-2026-8891"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-forest-700 font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Create Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-forest-700 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-forest-900 text-lime-400 hover:bg-forest-800 shadow-card hover:shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Campus Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-1 relative z-10">
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="font-bold text-forest-900 hover:text-forest-700 hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
