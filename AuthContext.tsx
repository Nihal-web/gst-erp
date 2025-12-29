
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { supabase } from './supabaseClient';
// import { loginUser, signupUser } from './services/apiService'; // Deprecated

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, shopName: string, role: UserRole) => Promise<void>;
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
    // Fail-safe: Force loading to stop after 6 seconds to prevent permanent hang
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth initialization timed out - forcing loading: false");
        setIsLoading(false);
      }
    }, 6000);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth State Change:", event, session?.user?.id);

      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setOriginalRole(null);
        setIsLoading(false);
      }
    });

    // Handle initial check as well (some browsers delay the event)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !user) {
        fetchProfile(session.user.id, session.user.email!);
      } else if (!session) {
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
        } else if (insErr) {
          console.error("Profile creation failed", insErr);
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
    <AuthContext.Provider value={{ user, login, signup, logout, switchRole, isLoading, originalRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
