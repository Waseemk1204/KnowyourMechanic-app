import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { signOut } from '../lib/auth';

interface UserData {
    _id: string;
    firebaseUid: string;
    phoneNumber: string;
    role: 'customer' | 'garage';
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (!firebaseUser) {
                setUserData(null);
                setLoading(false);
                localStorage.removeItem('userRole');
                localStorage.removeItem('userData');
            } else {
                // Check local storage first
                const savedUserData = localStorage.getItem('userData');
                if (savedUserData) {
                    try {
                        const parsed = JSON.parse(savedUserData);
                        setUserData(parsed);
                        setLoading(false);
                    } catch (e) {
                        console.error('Error parsing saved user data:', e);
                        // If parse fails, fetch from API
                        fetchUserProfile();
                    }
                } else {
                    // No local data, fetch from API
                    fetchUserProfile();
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUserProfile = async () => {
        try {
            // dynamic import to avoid circular dependency if possible, or just standard import
            const { getCurrentUserData } = await import('../lib/api');
            const result = await getCurrentUserData();

            if (result.data) {
                setUserData(result.data);
                localStorage.setItem('userData', JSON.stringify(result.data));
                localStorage.setItem('userRole', result.data.role);
            } else {
                console.log('User profile not found in backend (New User)');
                // Ideally redirect to role selection, but for now we leave userData null
                // effectively treating as "Need Onboarding"
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut();
            setUserData(null);
            localStorage.removeItem('userRole');
            localStorage.removeItem('userData');
            localStorage.removeItem('garageOnboarded');
            localStorage.removeItem('garageProfile');
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
