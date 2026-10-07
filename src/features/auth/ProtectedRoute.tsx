import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { LoginScreen } from './LoginScreen';
import { SignUpScreen } from './SignUpScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

type AuthView = 'login' | 'signup' | 'forgot_password';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<AuthView>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f3] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-forest-900 text-lime-400 font-display font-extrabold text-2xl flex items-center justify-center shadow-md animate-pulse">
            F
          </div>
          <div className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading FYND...</div>
        </div>
      </div>
    );
  }

  // If user is authenticated, render the main website
  if (user) {
    return <>{children}</>;
  }

  // Otherwise, show Login Screen (or SignUp / ForgotPassword)
  return (
    <div className="min-h-screen bg-[#f1f5f3]">
      {currentView === 'login' && (
        <LoginScreen
          onNavigateToSignUp={() => setCurrentView('signup')}
          onNavigateToForgotPassword={() => setCurrentView('forgot_password')}
        />
      )}

      {currentView === 'signup' && (
        <SignUpScreen
          onNavigateToLogin={() => setCurrentView('login')}
        />
      )}

      {currentView === 'forgot_password' && (
        <ForgotPasswordScreen
          onNavigateToLogin={() => setCurrentView('login')}
        />
      )}
    </div>
  );
};
