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
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);

            if (!firebaseUser) {
                setUserData(null);
                localStorage.removeItem('userRole');
                localStorage.removeItem('userData');
            } else {
                const savedUserData = localStorage.getItem('userData');
                if (savedUserData) {
                    try {
                        setUserData(JSON.parse(savedUserData));
                    } catch (e) {
                        console.error('Error parsing saved user data:', e);
                    }
                }
            }
        });

        return () => unsubscribe();
    }, []);

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
