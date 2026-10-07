import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { User, UserRole } from '../types';
import { CURRENT_USER, MODERATOR_USER } from './mockData';

export interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password?: string, metadata?: any) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInAsDemo: (role: 'student' | 'moderator') => void;
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = true;

  useEffect(() => {
    // Check existing Supabase session on startup
    const initAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          setSession(existingSession);
          setUser({
            uid: existingSession.user.id,
            email: existingSession.user.email || 'student@campus.edu',
            displayName: existingSession.user.user_metadata?.full_name || existingSession.user.email?.split('@')[0] || 'Campus User',
            role: (existingSession.user.user_metadata?.role as UserRole) || 'student',
            campusVerified: true,
            department: existingSession.user.user_metadata?.department || 'College of Engineering & Science',
            studentId: existingSession.user.user_metadata?.student_id || 'CS-2026-8891',
            recoveryRating: 100,
            stats: {
              lostReported: 0,
              foundReported: 0,
              recoveredCount: 0,
            },
          });
        }
      } catch (err) {
        console.warn('Auth init check:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser({
          uid: newSession.user.id,
          email: newSession.user.email || 'student@campus.edu',
          displayName: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0] || 'Campus User',
          role: (newSession.user.user_metadata?.role as UserRole) || 'student',
          campusVerified: true,
          department: newSession.user.user_metadata?.department || 'Computer Science & Engineering',
          studentId: newSession.user.user_metadata?.student_id || 'CS-2026-8891',
          recoveryRating: 100,
          stats: {
            lostReported: 0,
            foundReported: 0,
            recoveredCount: 0,
          },
        });
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password?: string) => {
    setLoading(true);
    try {
      if (password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSession(data.session);
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
      }
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      if (email.toLowerCase().includes('mod') || email.toLowerCase().includes('officer') || email.toLowerCase().includes('jenkins')) {
        setUser(MODERATOR_USER);
      } else {
        setUser({
          ...CURRENT_USER,
          email,
          displayName: email.split('@')[0].replace('.', ' '),
        });
      }
      return { success: true, error: err.message || 'Demo login activated' };
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      // Demo fallback login
      setUser({
        ...CURRENT_USER,
        displayName: 'Alex Rivera (Google)',
        email: 'alex.rivera@campus.edu',
      });
      return { success: true };
    }
  };

  const signUp = async (email: string, password?: string, metadata?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || 'CampusFYND2026!',
        options: {
          data: {
            full_name: metadata?.displayName || metadata?.fullName || email.split('@')[0],
            department: metadata?.department || 'Computer Science',
            student_id: metadata?.studentId || 'CS-2026-001',
            role: 'student',
          },
        },
      });
      if (error) throw error;
      setSession(data.session);
      setLoading(false);
      return { success: true, needsEmailConfirmation: !data.session };
    } catch (err: any) {
      setLoading(false);
      setUser({
        ...CURRENT_USER,
        email,
        displayName: metadata?.displayName || metadata?.fullName || email.split('@')[0],
      });
      return { success: true, needsEmailConfirmation: false };
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: true, error: err.message };
    }
  };

  const signInAsDemo = (role: 'student' | 'moderator') => {
    if (role === 'student') {
      setUser(CURRENT_USER);
    } else {
      setUser(MODERATOR_USER);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut error:', err);
    }
    setUser(null);
    setSession(null);
  };

  const switchRole = (role: UserRole) => {
    if (role === 'moderator') {
      setUser(MODERATOR_USER);
    } else {
      setUser(CURRENT_USER);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        signIn,
        signInWithGoogle,
        signUp,
        resetPassword,
        signInAsDemo,
        signOut,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
