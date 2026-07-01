'use client';

import { backendApiBaseUrl } from '@/lib/api';
import type { LocalizedText } from '@/lib/i18n';
import type { UserProfile } from '@/lib/types';

export const authUsersStorageKey = 'marketnest-auth-users';
export const authSessionStorageKey = 'marketnest-auth-session';
export const authTokenStorageKey = 'marketnest-auth-token';
export const authSyncEventName = 'marketnest-auth-sync';

type StoredAuthUser = UserProfile & {
  createdAt: string;
  password: string;
};

type RemoteAuthUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  avatar?: string;
  photoUrl?: string;
  googleId?: string;
  role?: 'user';
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  location?: string | LocalizedText;
  favorites?: string[];
};

type RemoteAuthResponse = {
  token?: string;
  user?: RemoteAuthUser;
  message?: string;
  code?: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
};

type GoogleAuthInput = {
  credential: string;
};

export type AuthResult =
  | { ok: true; user: UserProfile }
  | {
      ok: false;
      error:
        | 'email_in_use'
        | 'invalid_credentials'
        | 'server_unavailable'
        | 'validation_error';
      message?: string;
    };

export type DeleteAccountResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

function isBrowser() {
  return typeof window !== 'undefined';
}

function authDebugLog(step: string, data?: Record<string, unknown>) {
  if (!isBrowser()) {
    return;
  }

  console.info('[BirJoyAuth][backend]', step, data || {});
}

function notifyAuthSync() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(authSyncEventName));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toLocalizedText(value: string): LocalizedText {
  return {
    uz: value,
    ru: value,
    en: value,
  };
}

function createUserId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeUser(user: StoredAuthUser): UserProfile {
  const { password, ...safeUser } = user;
  return safeUser;
}

function normalizeRemoteUser(user: RemoteAuthUser): UserProfile {
  const normalizedLocation =
    typeof user.location === 'string'
      ? user.location.trim()
        ? toLocalizedText(user.location.trim())
        : undefined
      : user.location;

  return {
    id: user.id || user._id || createUserId(),
    name: user.name.trim(),
    email: normalizeEmail(user.email),
    avatar: user.avatar?.trim() || user.photoUrl?.trim() || undefined,
    googleId: user.googleId?.trim() || undefined,
    role: user.role || 'user',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    phone: user.phone?.trim() || undefined,
    location: normalizedLocation,
    favorites: Array.isArray(user.favorites) ? user.favorites : [],
  };
}

function parseJson<T>(value: string | null, fallback: T) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readStoredUsers() {
  if (!isBrowser()) {
    return [] as StoredAuthUser[];
  }

  return parseJson<StoredAuthUser[]>(
    window.localStorage.getItem(authUsersStorageKey),
    []
  );
}

function writeStoredUsers(users: StoredAuthUser[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(authUsersStorageKey, JSON.stringify(users));
}

function writeStoredToken(token: string | null) {
  if (!isBrowser()) {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(authTokenStorageKey);
    return;
  }

  window.localStorage.setItem(authTokenStorageKey, token);
}

export function getStoredAuthToken() {
  if (!isBrowser()) {
    return '';
  }

  return window.localStorage.getItem(authTokenStorageKey) || '';
}

export function getStoredSessionUser() {
  if (!isBrowser()) {
    return null as UserProfile | null;
  }

  return parseJson<UserProfile | null>(
    window.localStorage.getItem(authSessionStorageKey),
    null
  );
}

function writeStoredSessionUser(user: UserProfile | null) {
  if (!isBrowser()) {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(authSessionStorageKey);
    return;
  }

  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(user));
}

function deleteStoredUserById(userId: string) {
  const users = readStoredUsers();

  if (users.length === 0) {
    return;
  }

  const nextUsers = users.filter((user) => user.id !== userId);

  if (nextUsers.length === users.length) {
    return;
  }

  writeStoredUsers(nextUsers);
}

function signUpUserLocally(input: SignUpInput): AuthResult {
  const users = readStoredUsers();
  const normalizedEmail = normalizeEmail(input.email);

  if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
    return { ok: false, error: 'email_in_use' };
  }

  const storedUser: StoredAuthUser = {
    id: createUserId(),
    name: input.name.trim(),
    email: normalizedEmail,
    password: input.password,
    role: 'user',
    googleId: undefined,
    phone: input.phone?.trim() || undefined,
    avatar: undefined,
    location: input.location?.trim()
      ? toLocalizedText(input.location.trim())
      : undefined,
    favorites: [],
    createdAt: new Date().toISOString(),
  };

  users.unshift(storedUser);
  writeStoredUsers(users);

  const user = sanitizeUser(storedUser);
  writeStoredToken(null);
  writeStoredSessionUser(user);
  notifyAuthSync();

  return { ok: true, user };
}

function signInUserLocally(input: SignInInput): AuthResult {
  const users = readStoredUsers();
  const normalizedEmail = normalizeEmail(input.email);
  const matchedUser = users.find(
    (user) =>
      normalizeEmail(user.email) === normalizedEmail && user.password === input.password
  );

  if (!matchedUser) {
    return { ok: false, error: 'invalid_credentials' };
  }

  const user = sanitizeUser(matchedUser);
  writeStoredToken(null);
  writeStoredSessionUser(user);
  notifyAuthSync();

  return { ok: true, user };
}

async function callAuthEndpoint(
  endpoint: 'register' | 'login' | 'google',
  payload: SignUpInput | SignInInput | GoogleAuthInput
): Promise<AuthResult> {
  const requestUrl = `${backendApiBaseUrl}/auth/${endpoint}`;
  const sanitizedPayload =
    endpoint === 'google'
      ? {
          credentialPresent: Boolean((payload as GoogleAuthInput).credential),
          credentialLength: (payload as GoogleAuthInput).credential?.length || 0,
        }
      : endpoint === 'login'
        ? {
            email: (payload as SignInInput).email,
            passwordPresent: Boolean((payload as SignInInput).password),
          }
        : {
            email: (payload as SignUpInput).email,
            name: (payload as SignUpInput).name,
            phonePresent: Boolean((payload as SignUpInput).phone),
            locationPresent: Boolean((payload as SignUpInput).location),
            passwordPresent: Boolean((payload as SignUpInput).password),
          };

  authDebugLog('request-start', {
    endpoint,
    url: requestUrl,
    payload: sanitizedPayload,
  });

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as RemoteAuthResponse;
    authDebugLog('response-received', {
      endpoint,
      url: requestUrl,
      status: response.status,
      ok: response.ok,
      body: {
        code: data.code,
        message: data.message,
        hasToken: Boolean(data.token),
        hasUser: Boolean(data.user),
        userEmail: data.user?.email,
      },
    });

    if (!response.ok) {
      if (response.status === 409 || data.code === 'EMAIL_IN_USE') {
        return { ok: false, error: 'email_in_use', message: data.message };
      }

      if (response.status === 401 || data.code === 'INVALID_CREDENTIALS') {
        return { ok: false, error: 'invalid_credentials', message: data.message };
      }

      if (response.status >= 500) {
        return {
          ok: false,
          error: 'server_unavailable',
          message: data.message,
        };
      }

      return {
        ok: false,
        error: 'validation_error',
        message: data.message || 'Authentication request failed.',
      };
    }

    if (!data.user || !data.token) {
      return {
        ok: false,
        error: 'server_unavailable',
      };
    }

    const user = normalizeRemoteUser(data.user);
    authDebugLog('response-success', {
      endpoint,
      url: requestUrl,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
    });
    writeStoredToken(data.token);
    writeStoredSessionUser(user);
    notifyAuthSync();

    return { ok: true, user };
  } catch (error) {
    authDebugLog('request-failed', {
      endpoint,
      url: requestUrl,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      error: 'server_unavailable',
    };
  }
}

export async function signUpUser(input: SignUpInput): Promise<AuthResult> {
  if (!backendApiBaseUrl) {
    return signUpUserLocally(input);
  }

  return callAuthEndpoint('register', input);
}

export async function signInUser(input: SignInInput): Promise<AuthResult> {
  if (!backendApiBaseUrl) {
    return signInUserLocally(input);
  }

  return callAuthEndpoint('login', input);
}

export async function signInWithGoogleUser(credential: string): Promise<AuthResult> {
  if (!backendApiBaseUrl) {
    return {
      ok: false,
      error: 'server_unavailable',
    };
  }

  return callAuthEndpoint('google', { credential });
}

export async function restoreAuthSession() {
  const storedUser = getStoredSessionUser();
  const token = getStoredAuthToken();

  if (!backendApiBaseUrl || !token) {
    return storedUser;
  }

  try {
    const response = await fetch(`${backendApiBaseUrl}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      signOutUser();
      return null;
    }

    if (!response.ok) {
      return storedUser;
    }

    const data = (await response.json().catch(() => ({}))) as RemoteAuthResponse;

    if (!data.user) {
      return storedUser;
    }

    const user = normalizeRemoteUser(data.user);
    writeStoredSessionUser(user);
    notifyAuthSync();
    return user;
  } catch {
    return storedUser;
  }
}

export function signOutUser() {
  const token = getStoredAuthToken();

  if (backendApiBaseUrl && token) {
    void fetch(`${backendApiBaseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => undefined);
  }

  writeStoredToken(null);
  writeStoredSessionUser(null);
  notifyAuthSync();
}

export function syncStoredUser(nextUser: UserProfile) {
  const users = readStoredUsers();
  const targetIndex = users.findIndex((user) => user.id === nextUser.id);

  if (targetIndex === -1) {
    writeStoredSessionUser(nextUser);
    notifyAuthSync();
    return;
  }

  const currentUser = users[targetIndex];
  const updatedUser: StoredAuthUser = {
    ...currentUser,
    ...nextUser,
  };

  users[targetIndex] = updatedUser;
  writeStoredUsers(users);
  writeStoredSessionUser(sanitizeUser(updatedUser));
  notifyAuthSync();
}

export async function deleteCurrentUserAccount(): Promise<DeleteAccountResult> {
  const storedUser = getStoredSessionUser();
  const token = getStoredAuthToken();

  if (!storedUser) {
    return {
      ok: false,
      message: 'No signed-in user was found.',
    };
  }

  if (!backendApiBaseUrl || !token) {
    deleteStoredUserById(storedUser.id);
    writeStoredToken(null);
    writeStoredSessionUser(null);
    notifyAuthSync();

    return {
      ok: true,
    };
  }

  try {
    const response = await fetch(`${backendApiBaseUrl}/auth/me`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json().catch(() => ({}))) as RemoteAuthResponse;

    if (!response.ok) {
      return {
        ok: false,
        message: data.message || 'Account deletion failed.',
      };
    }

    deleteStoredUserById(storedUser.id);
    writeStoredToken(null);
    writeStoredSessionUser(null);
    notifyAuthSync();

    return {
      ok: true,
    };
  } catch {
    return {
      ok: false,
      message: 'Account deletion failed.',
    };
  }
}
