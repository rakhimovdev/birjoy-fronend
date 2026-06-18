'use client';

import { backendApiBaseUrl } from '@/lib/api';
import type { OrderRequest, OrderRequestStatus } from '@/lib/types';

type CreateOrderInput = {
  adId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerUserId?: string;
  message?: string;
};

type RemoteOrder = Partial<OrderRequest>;

type OrderApiResponse = {
  message?: string;
  order?: RemoteOrder;
};

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

function normalizeStatus(status: string | undefined): OrderRequestStatus {
  if (status === 'new' || status === 'contacted' || status === 'completed') {
    return status;
  }

  return 'new';
}

export async function createOrderRequest(input: CreateOrderInput) {
  const response = await fetch(`${backendApiBaseUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => ({}))) as OrderApiResponse;

  if (!response.ok) {
    throw new Error(data.message || 'Buyurtma yuborilmadi.');
  }

  if (!data.order) {
    throw new Error('Buyurtma maʼlumoti qaytmadi.');
  }

  return normalizeOrder(data.order);
}
