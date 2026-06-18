'use client';

import { backendApiBaseUrl } from '@/lib/api';
import type { AdminProfile, OrderRequest, OrderRequestStatus } from '@/lib/types';

export const adminTokenStorageKey = 'birjoy-admin-token';
export const adminProfileStorageKey = 'birjoy-admin-profile';

type RemoteAdmin = Partial<AdminProfile>;
type RemoteOrder = Partial<OrderRequest>;

type AdminApiResponse = {
  code?: string;
  message?: string;
  token?: string;
  admin?: RemoteAdmin;
  orders?: RemoteOrder[];
  order?: RemoteOrder;
};

type AdminApiError = Error & {
  code?: string;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function normalizeAdmin(admin: RemoteAdmin | undefined): AdminProfile {
  return {
    login: admin?.login || 'birjoy-admin',
    name: admin?.name || 'BirJoy Admin',
    role: 'admin',
  };
}

function normalizeStatus(status: string | undefined): OrderRequestStatus {
  if (status === 'new' || status === 'contacted' || status === 'completed') {
    return status;
  }

  return 'new';
}

function normalizeOrder(order: RemoteOrder): OrderRequest {
  return {
    id: order.id || '',
    adId: order.adId || '',
    adTitle: order.adTitle || '',
    adPrice: typeof order.adPrice === 'number' ? order.adPrice : 0,
    sellerName: order.sellerName || '',
    sellerPhone: order.sellerPhone || '',
    customerName: order.customerName || '',
    customerEmail: order.customerEmail || '',
    customerPhone: order.customerPhone || '',
    customerUserId: order.customerUserId || '',
    message: order.message || '',
    status: normalizeStatus(order.status),
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt || new Date().toISOString(),
  };
}

function readStoredJson<T>(key: string, fallback: T) {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeAdminSession(token: string, admin: AdminProfile) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(adminTokenStorageKey, token);
  window.localStorage.setItem(adminProfileStorageKey, JSON.stringify(admin));
}

export function getStoredAdminToken() {
  if (!isBrowser()) {
    return '';
  }

  return window.localStorage.getItem(adminTokenStorageKey) || '';
}

export function getStoredAdminProfile() {
  return readStoredJson<AdminProfile | null>(adminProfileStorageKey, null);
}

export function signOutAdmin() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(adminTokenStorageKey);
  window.localStorage.removeItem(adminProfileStorageKey);
}

async function requestAdminApi(
  path: string,
  init?: RequestInit,
  options?: { requiresAuth?: boolean }
) {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options?.requiresAuth) {
    const token = getStoredAdminToken();

    if (!token) {
      const authError = new Error('Admin autentifikatsiyasi talab qilinadi.') as AdminApiError;
      authError.code = 'unauthorized';
      throw authError;
    }

    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${backendApiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as AdminApiResponse;

  if (!response.ok) {
    if (options?.requiresAuth && (response.status === 401 || response.status === 403)) {
      signOutAdmin();
    }

    const error = new Error(data.message || 'So‘rov bajarilmadi.') as AdminApiError;
    error.code =
      data.code || (response.status === 401 || response.status === 403 ? 'unauthorized' : 'request_failed');
    throw error;
  }

  return data;
}

export async function loginAdmin(input: { login: string; password: string }) {
  const data = await requestAdminApi('/admin/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const token = data.token || '';
  const admin = normalizeAdmin(data.admin);

  if (!token) {
    throw new Error('Admin token qaytmadi.');
  }

  writeAdminSession(token, admin);
  return admin;
}

export async function fetchAdminOrders() {
  const data = await requestAdminApi('/admin/orders', undefined, { requiresAuth: true });
  return Array.isArray(data.orders) ? data.orders.map(normalizeOrder) : [];
}

export async function updateAdminOrderStatus(orderId: string, status: OrderRequestStatus) {
  const data = await requestAdminApi(
    `/admin/orders/${orderId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    { requiresAuth: true }
  );

  if (!data.order) {
    throw new Error('Yangilangan buyurtma maʼlumoti qaytmadi.');
  }

  return normalizeOrder(data.order);
}
