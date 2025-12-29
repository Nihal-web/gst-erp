
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
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsLoading(true);
        await fetchProfile(session.user.id, session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setOriginalRole(null);
        setIsLoading(false);
      } else {
        // Handle INITIAL_SESSION with no user
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      // Get auth user metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const meta = authUser?.user_metadata || {};

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        // Update user record if metadata has more info (sync)
        if (meta.name && (data.name === 'User' || !data.name)) {
          const { data: updated } = await supabase.from('users').update({
            name: meta.name,
            shop_name: meta.shop_name || data.shop_name
          }).eq('id', userId).select().single();

          if (updated) {
            setUser({ ...updated, email, name: meta.name || updated.name, shopName: meta.shop_name || updated.shop_name });
            setOriginalRole(updated.role as UserRole);
            return;
          }
        }
        setUser({ ...data, email, name: meta.name || data.name, shopName: meta.shop_name || data.shop_name });
        setOriginalRole(data.role as UserRole);
      } else {
        // Check for legacy user by email
        const { data: legacyUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (legacyUser) {
          const { data: migrated } = await supabase
            .from('users')
            .update({ id: userId, name: meta.name || legacyUser.name })
            .eq('email', email)
            .select()
            .single();

          if (migrated) {
            setUser({ ...migrated, email, name: meta.name || migrated.name, shopName: meta.shop_name || migrated.shop_name });
            setOriginalRole(migrated.role as UserRole);
            return;
          }
        }

        // Create new profile if it doesn't exist
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
          console.error("Failed to create/fetch profile", insErr);
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
