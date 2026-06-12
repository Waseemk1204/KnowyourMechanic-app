import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getOtpProvider } from "./provider";
import type { AuthProfile } from "./authTypes";

type AuthContextValue = {
  profile: AuthProfile | null;
  loading: boolean;
  requestOtp(phoneNumber: string): Promise<void>;
  verifyOtp(phoneNumber: string, otp: string): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const provider = useMemo(() => getOtpProvider(), []);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    provider
      .restoreSession()
      .then((restoredProfile) => {
        if (isMounted) {
          setProfile(restoredProfile);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [provider]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      async requestOtp(phoneNumber: string) {
        await provider.requestOtp(phoneNumber);
      },
      async verifyOtp(phoneNumber: string, otp: string) {
        const verifiedProfile = await provider.verifyOtp(phoneNumber, otp);
        setProfile(verifiedProfile);
      },
      async signOut() {
        await provider.signOut();
        setProfile(null);
      }
    }),
    [loading, profile, provider]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
