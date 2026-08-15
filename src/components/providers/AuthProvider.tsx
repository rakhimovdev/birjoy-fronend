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
  updateCurrentUserProfile,
  type SignInInput,
  type SignUpInput,
  type UpdateCurrentUserInput,
  signInWithAppleUser,
} from '@/lib/auth';
import type { UserProfile } from '@/lib/types';

type AuthContextValue = {
  user: UserProfile | null;
  isReady: boolean;
  signIn: (input: SignInInput) => Promise<Awaited<ReturnType<typeof signInUser>>>;
  signInWithGoogle: (credential: string) => Promise<Awaited<ReturnType<typeof signInWithGoogleUser>>>;
  signUp: (input: SignUpInput) => Promise<Awaited<ReturnType<typeof signUpUser>>>;
  updateProfile: (
    input: UpdateCurrentUserInput
  ) => Promise<Awaited<ReturnType<typeof updateCurrentUserProfile>>>;
  signOut: () => void;
  isFavorite: (adId: string) => boolean;
  toggleFavorite: (adId: string) => Promise<{ ok: boolean; isFavorite: boolean; message?: string }>;
    signInWithApple?: (credential: string, audience?: string) => Promise<unknown>;
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

  const signInWithApple = async (credential: string, audience?: string) => {
    const result = await signInWithAppleUser(credential, audience);

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

  const updateProfile = async (input: UpdateCurrentUserInput) => {
    const result = await updateCurrentUserProfile(input);

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

  const toggleFavorite = async (adId: string) => {
    if (!user) {
      return {
        ok: false,
        isFavorite: false,
        message: 'Authentication is required.',
      };
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

    const result = await updateCurrentUserProfile({
      favorites: nextFavorites,
    });

    if (!result.ok) {
      syncStoredUser(user);
      setUser(user);

      return {
        ok: false,
        isFavorite: user.favorites.includes(adId),
        message: result.message,
      };
    }

    setUser(result.user);

    return {
      ok: true,
      isFavorite: result.user.favorites.includes(adId),
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signUp,
        updateProfile,
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
