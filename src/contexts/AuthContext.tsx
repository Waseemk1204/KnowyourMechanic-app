import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { signOut } from '../lib/auth';
import { getMyRoles, type AppRole } from '../lib/data';

interface UserData {
    _id: string;
    firebaseUid: string;
    phoneNumber: string;
    role: AppRole; // the ACTIVE role (which dashboard the user is in)
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    availableRoles: AppRole[]; // every role this number holds
    loading: boolean;
    isAuthenticated: boolean;
    setUserData: (data: UserData | null) => void;
    setUser: (user: User | null) => void;
    switchRole: (role: AppRole) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    availableRoles: [],
    loading: true,
    isAuthenticated: false,
    setUserData: () => { },
    setUser: () => { },
    switchRole: () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);

    // Links the signed-in auth user to its profile row (by phone) and loads it,
    // along with every role that number holds. The ACTIVE role is the one the
    // user last chose (localStorage) if they still have it, else their primary.
    async function loadProfile() {
        try {
            const { data, error } = await supabase.rpc('link_current_auth_profile');
            if (error || !data) {
                // New user with no profile yet — handled by role selection elsewhere.
                setUserData(null);
                setAvailableRoles([]);
                return;
            }
            const row = Array.isArray(data) ? data[0] : data;
            const roles = await getMyRoles();
            const primary = (row.role as AppRole);
            const known = roles.length > 0 ? roles : [primary];
            const stored = localStorage.getItem('userRole') as AppRole | null;
            const active = stored && known.includes(stored) ? stored : primary;
            setAvailableRoles(known);
            setUserData({
                _id: row.id,
                firebaseUid: row.auth_user_id,
                phoneNumber: row.phone_number,
                role: active,
            });
            localStorage.setItem('userRole', active);
        } catch {
            setUserData(null);
            setAvailableRoles([]);
        }
    }

    // Switch which role (dashboard) the user is operating as, without re-login.
    function switchRole(role: AppRole) {
        setUserData((prev) => (prev ? { ...prev, role } : prev));
        localStorage.setItem('userRole', role);
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
            setAvailableRoles([]);
            localStorage.removeItem('userRole');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const value: AuthContextType = {
        user,
        userData,
        availableRoles,
        loading,
        isAuthenticated: !!user,
        setUserData,
        setUser,
        switchRole,
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
