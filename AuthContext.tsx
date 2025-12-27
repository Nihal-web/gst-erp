
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
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId) // Check by Auth ID first
        .single();

      if (data) {
        setUser({ ...data, email });
        setOriginalRole(data.role as UserRole);
      } else {
        // ID mismatch? Check if legacy user exists by email
        const { data: legacyUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (legacyUser) {
          console.log("Found legacy user, migrating to new Auth ID...", legacyUser);
          // Migrate legacy record to new Auth ID
          const { data: migrated, error: migrateError } = await supabase
            .from('users')
            .update({ id: userId }) // Update DB ID to match Auth ID
            .eq('email', email)
            .select()
            .single();

          if (migrated) {
            setUser({ ...migrated, email });
            setOriginalRole(migrated.role as UserRole);
            return;
          } else {
            console.error("Migration failed", migrateError);
          }
        }

        // If no legacy user, or migration failed, create new
        // Fallback/Init
        const newUser = {
          id: userId, email, name: 'User', role: UserRole.ADMIN, shopName: 'My Shop', status: 'active', plan: 'free'
        };

        // Try inserting to persist
        await supabase.from('users').insert([newUser]);

        setUser(newUser as User);
        setOriginalRole(newUser.role as UserRole);
      }
    } catch (e) {
      console.error("Profile fetch error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signup = async (email: string, password: string, name: string, shopName: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { name, shop_name: shopName, role } // Store metadata for trigger
      }
    });
    if (error) throw new Error(error.message);

    // Manually insert into public.users if trigger isn't set up
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

      const { error: dbError } = await supabase.from('users').insert([newUser]);
      if (dbError) console.error("Failed to create public user record", dbError);

      setUser(newUser as unknown as User);
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
