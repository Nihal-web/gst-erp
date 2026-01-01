
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { supabase } from './supabaseClient';
// import { loginUser, signupUser } from './services/apiService'; // Deprecated

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, shopName: string, role: UserRole) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  isLoading: boolean;
  originalRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'gst_erp_registered_users';
const CURRENT_USER_KEY = 'gst_erp_current_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    // 1. Handle HashRouter + Supabase Auth fragment issue
    // Supabase tokens are appended after the hash, e.g., /#/reset-password#access_token=...
    // This can confuse Supabase's automatic parsing.
    const checkHashAuth = async () => {
      const hash = window.location.hash;
      if (hash.includes('access_token=') && hash.includes('refresh_token=')) {
        console.log("Detected auth tokens in URL hash. Attempting manual session establishment...");
        try {
          // Extract the part of the hash containing the params
          const searchParams = new URLSearchParams(hash.substring(hash.indexOf('access_token=')));
          const accessToken = searchParams.get('access_token');
          const refreshToken = searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (error) {
              console.error("Manual session set failed:", error.message);
            } else if (data.session) {
              console.log("Session manually established from hash. User ID:", data.session.user.id);
              // Trigger profile fetch immediately to speed up UI
              fetchProfile(data.session.user.id, data.session.user.email!);
            }
          }
        } catch (e) {
          console.error("Error parsing auth tokens from hash:", e);
        }
      }
    };

    checkHashAuth();

    // 2. Fail-safe: Force loading to stop after 15 seconds to prevent permanent hang
    const timer = setTimeout(() => {
      setIsLoading(current => {
        if (current) {
          console.warn("Auth initialization timed out - forcing loading: false");
          return false;
        }
        return false;
      });
    }, 15000);

    // 3. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth State Change:", event, session?.user?.id);

      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        // Only set null if we are sure there is no session
        // (onAuthStateChange triggers INITIAL_SESSION which might be null before setSession finishes)
        if (event !== 'INITIAL_SESSION' || !window.location.hash.includes('access_token=')) {
          setUser(null);
          setOriginalRole(null);
          setIsLoading(false);
        }
      }
    });

    // 4. Handle initial check as well (some browsers delay the event)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (!user) {
          fetchProfile(session.user.id, session.user.email!);
        }
      } else if (!window.location.hash.includes('access_token=')) {
        // Only stop loading if we're not expecting an async hash session set
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    console.log("Fetching profile for:", userId);
    try {
      // Get session instead of getUser for performance
      const { data: { session } } = await supabase.auth.getSession();
      const meta = session?.user?.user_metadata || {};

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setUser({ ...data, email, name: meta.name || data.name, shopName: meta.shop_name || data.shop_name });
        setOriginalRole(data.role as UserRole);
      } else {
        // Create new profile if it doesn't exist
        console.log("Creating new profile for:", email);
        const newUser = {
          id: userId,
          email,
          name: meta.name || 'User',
          role: meta.role || UserRole.ADMIN,
          shop_name: meta.shop_name || 'My Shop',
          status: 'active',
          plan: 'pro'
        };

        const { data: created, error: insErr } = await supabase
          .from('users')
          .upsert([newUser], { onConflict: 'id' })
          .select()
          .single();

        if (created) {
          setUser({ ...created, email, name: created.name, shopName: created.shop_name } as any);
          setOriginalRole(created.role as UserRole);
        } else {
          // Fallback: If DB insert fails/returns null (RLS?), use session data so user can at least login
          console.error("CRITICAL: Profile creation failed (Check DB Constraints!). Ensure you have run the update_schema.sql script.", insErr);
          const fallbackUser = {
            id: userId,
            email,
            name: meta.name || 'User',
            role: (meta.role as UserRole) || UserRole.ADMIN,
            shopName: meta.shop_name || 'My Shop',
            status: 'active'
          };
          setUser(fallbackUser as any);
          setOriginalRole(fallbackUser.role);
        }
      }
    } catch (e) {
      console.error("Profile fetch error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
    // Note: navigate('/') will still trigger in Login.tsx, but now 
    // ProtectedRoute will see isLoading=true while Profile is fetching.
  };

  const signup = async (email: string, password: string, name: string, shopName: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { name, shop_name: shopName, role }
      }
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      const newUser = {
        id: data.user.id,
        email,
        name,
        role,
        shop_name: shopName,
        status: 'active',
        plan: 'pro'
      };

      await supabase.from('users').upsert([newUser], { onConflict: 'id' });
      setUser({ ...newUser, shopName: newUser.shop_name } as unknown as User);
      setOriginalRole(newUser.role as UserRole);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOriginalRole(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const switchRole = (role: UserRole) => {
    if (!user) return;
    setUser({ ...user, role });
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, resetPassword, updatePassword, logout, switchRole, isLoading, originalRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
