import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { signOut } from '../lib/auth';

interface UserData {
    _id: string;
    firebaseUid: string;
    phoneNumber: string;
    role: 'customer' | 'garage' | 'admin' | 'employee' | 'support';
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    isAuthenticated: boolean;
    setUserData: (data: UserData | null) => void;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    loading: true,
    isAuthenticated: false,
    setUserData: () => { },
    setUser: () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    // Links the signed-in auth user to its profile row (by phone) and loads it.
    async function loadProfile() {
        try {
            const { data, error } = await supabase.rpc('link_current_auth_profile');
            if (error || !data) {
                // New user with no profile yet — handled by role selection elsewhere.
                setUserData(null);
                return;
            }
            const row = Array.isArray(data) ? data[0] : data;
            setUserData({
                _id: row.id,
                firebaseUid: row.auth_user_id,
                phoneNumber: row.phone_number,
                role: row.role,
            });
        } catch {
            setUserData(null);
        }
    }

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data }) => {
            const sessionUser = data.session?.user ?? null;
            setUser(sessionUser);
            if (sessionUser) {
                await loadProfile();
            }
            setLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            if (sessionUser) {
                loadProfile();
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return () => sub.subscription.unsubscribe();
    }, []);

    const logout = async () => {
        try {
            await signOut();
            setUser(null);
            setUserData(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const value: AuthContextType = {
        user,
        userData,
        loading,
        isAuthenticated: !!user,
        setUserData,
        setUser,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
