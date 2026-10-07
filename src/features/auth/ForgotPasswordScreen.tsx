import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
}) => {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.success) {
      setIsSubmitted(true);
    } else if (result.error) {
      setErrorMessage(typeof result.error === 'string' ? result.error : 'Password reset failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f3] flex items-center justify-center p-4 sm:p-6 selection:bg-lime-400 selection:text-forest-950">
      <div className="w-full max-w-md bg-white rounded-4xl p-6 sm:p-8 border border-slate-200/80 shadow-card space-y-6 animate-fade-in relative overflow-hidden">
        {/* Brand Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center justify-center relative">
            <div className="w-14 h-14 rounded-2xl bg-forest-900 text-lime-400 font-display font-extrabold text-2xl flex items-center justify-center shadow-lg border-2 border-white">
              F
            </div>
          </div>

          <div>
            <h1 className="font-display font-black text-2xl tracking-tight text-slate-900">
              Reset Password
            </h1>
            <p className="text-xs font-semibold text-forest-700 tracking-wide mt-0.5">
              We'll send a password recovery link to your email
            </p>
          </div>
        </div>

        {isSubmitted ? (
          <div className="space-y-4 text-center py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-forest-900 flex items-center justify-center mx-auto shadow-soft">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900">Check Your Inbox</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Password reset link sent to <span className="font-bold text-forest-900">{email}</span>.
            </p>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full py-3 rounded-2xl text-xs font-bold bg-forest-900 text-lime-400 hover:bg-forest-800 shadow-md"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-forest-900 text-lime-400 hover:bg-forest-800 shadow-card hover:shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-forest-700" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
