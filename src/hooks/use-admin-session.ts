'use client';

import { useEffect, useState } from 'react';
import {
  fallbackAdminProfile,
  adminProfileStorageKey,
  adminSyncEventName,
  adminTokenStorageKey,
  getStoredAdminProfile,
  getStoredAdminToken,
} from '@/lib/admin';
import type { AdminProfile } from '@/lib/types';

export function useAdminSession() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    function syncAdminSession() {
      const token = getStoredAdminToken();
      const profile = getStoredAdminProfile();

      setAdmin(token ? profile || fallbackAdminProfile : null);
      setIsReady(true);
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === adminTokenStorageKey ||
        event.key === adminProfileStorageKey ||
        event.key === null
      ) {
        syncAdminSession();
      }
    }

    syncAdminSession();
    window.addEventListener(adminSyncEventName, syncAdminSession);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(adminSyncEventName, syncAdminSession);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return {
    admin,
    isAdmin: Boolean(admin),
    isReady,
  };
}
