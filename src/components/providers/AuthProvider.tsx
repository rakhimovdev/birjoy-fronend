'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  authSessionStorageKey,
  authSyncEventName,
  authUsersStorageKey,
  getStoredSessionUser,
  restoreAuthSession,
  signInUser,
  signInWithGoogleUser,
  signOutUser,
  signUpUser,
  syncStoredUser,
  type SignInInput,
  type SignUpInput,
} from '@/lib/auth';
import type { UserProfile } from '@/lib/types';

type AuthContextValue = {
  user: UserProfile | null;
  isReady: boolean;
  signIn: (input: SignInInput) => Promise<Awaited<ReturnType<typeof signInUser>>>;
  signInWithGoogle: (credential: string) => Promise<Awaited<ReturnType<typeof signInWithGoogleUser>>>;
  signUp: (input: SignUpInput) => Promise<Awaited<ReturnType<typeof signUpUser>>>;
  signOut: () => void;
  isFavorite: (adId: string) => boolean;
  toggleFavorite: (adId: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    setUser(getStoredSessionUser());

    void (async () => {
      const restoredUser = await restoreAuthSession();

      if (!isActive) {
        return;
      }

      setUser(restoredUser);
      setIsReady(true);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    function syncUserFromStorage() {
      setUser(getStoredSessionUser());
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === authSessionStorageKey ||
        event.key === authUsersStorageKey ||
        event.key === null
      ) {
        syncUserFromStorage();
      }
    }

    window.addEventListener(authSyncEventName, syncUserFromStorage);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(authSyncEventName, syncUserFromStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const signIn = async (input: SignInInput) => {
    const result = await signInUser(input);

    if (result.ok) {
      setUser(result.user);
    }

    return result;
  };

  const signInWithGoogle = async (credential: string) => {
    const result = await signInWithGoogleUser(credential);

    if (result.ok) {
      setUser(result.user);
    }

    return result;
  };

  const signUp = async (input: SignUpInput) => {
    const result = await signUpUser(input);

    if (result.ok) {
      setUser(result.user);
    }

    return result;
  };

  const signOut = () => {
    signOutUser();
    setUser(null);
  };

  const isFavorite = (adId: string) => {
    return user?.favorites.includes(adId) ?? false;
  };

  const toggleFavorite = (adId: string) => {
    if (!user) {
      return false;
    }

    const nextFavorites = user.favorites.includes(adId)
      ? user.favorites.filter((favoriteId) => favoriteId !== adId)
      : [...user.favorites, adId];

    const nextUser = {
      ...user,
      favorites: nextFavorites,
    };

    syncStoredUser(nextUser);
    setUser(nextUser);

    return nextFavorites.includes(adId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        isFavorite,
        toggleFavorite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
