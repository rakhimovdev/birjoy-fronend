'use client';

import { getStoredAuthToken, signOutUser } from '@/lib/auth';
import { backendApiBaseUrl } from '@/lib/api';
import type {
  ChatConversation,
  ChatConversationSummary,
  ChatMessage,
  ChatParticipant,
  ChatParticipantRole,
} from '@/lib/types';

type RemoteChatParticipant = Partial<ChatParticipant>;
type RemoteChatMessage = Partial<ChatMessage>;
type RemoteChatConversation = Partial<ChatConversation> & {
  otherParticipant?: RemoteChatParticipant;
  seller?: RemoteChatParticipant;
  buyer?: RemoteChatParticipant;
  messages?: RemoteChatMessage[];
};

type ChatApiResponse = {
  conversation?: RemoteChatConversation;
  conversations?: RemoteChatConversation[];
  message?: string;
};

function normalizeRole(role: string | undefined): ChatParticipantRole {
  return role === 'seller' ? 'seller' : 'buyer';
}

function normalizeParticipant(participant: RemoteChatParticipant | undefined): ChatParticipant {
  return {
    id: participant?.id || '',
    role: normalizeRole(participant?.role),
    name: participant?.name || '',
    avatar: participant?.avatar || '',
    phone: participant?.phone || '',
  };
}

function normalizeMessage(message: RemoteChatMessage | undefined): ChatMessage {
  return {
    id: message?.id || '',
    text: message?.text || '',
    senderId: message?.senderId || '',
    senderRole: normalizeRole(message?.senderRole),
    createdAt: message?.createdAt || new Date().toISOString(),
    updatedAt: message?.updatedAt || message?.createdAt || new Date().toISOString(),
  };
}

function normalizeConversationSummary(
  conversation: RemoteChatConversation | undefined
): ChatConversationSummary {
  return {
    id: conversation?.id || '',
    adId: conversation?.adId || '',
    adTitle: conversation?.adTitle || '',
    adPrice: typeof conversation?.adPrice === 'number' ? conversation.adPrice : 0,
    adImage: conversation?.adImage || '',
    viewerRole: normalizeRole(conversation?.viewerRole),
    otherParticipant: normalizeParticipant(conversation?.otherParticipant),
    seller: normalizeParticipant(conversation?.seller),
    buyer: normalizeParticipant(conversation?.buyer),
    lastMessageText: conversation?.lastMessageText || '',
    lastMessageAt:
      conversation?.lastMessageAt || conversation?.updatedAt || conversation?.createdAt || new Date().toISOString(),
    createdAt: conversation?.createdAt || new Date().toISOString(),
    updatedAt: conversation?.updatedAt || conversation?.createdAt || new Date().toISOString(),
  };
}

function normalizeConversation(conversation: RemoteChatConversation | undefined): ChatConversation {
  return {
    ...normalizeConversationSummary(conversation),
    messages: Array.isArray(conversation?.messages)
      ? conversation.messages.map(normalizeMessage)
      : [],
  };
}

async function requestChatApi(path: string, init?: RequestInit) {
  if (!backendApiBaseUrl) {
    throw new Error('Chat is unavailable right now.');
  }

  const token = getStoredAuthToken();

  if (!token) {
    throw new Error('Authentication is required.');
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${backendApiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as ChatApiResponse;

  if (response.status === 401) {
    signOutUser();
  }

  if (!response.ok) {
    throw new Error(data.message || 'Chat request failed.');
  }

  return data;
}

export async function fetchChatConversations() {
  const data = await requestChatApi('/chats');
  return Array.isArray(data.conversations) ? data.conversations.map(normalizeConversationSummary) : [];
}

export async function fetchChatConversationById(conversationId: string) {
  const data = await requestChatApi(`/chats/${conversationId}`);

  if (!data.conversation) {
    throw new Error('Conversation was not found.');
  }

  return normalizeConversation(data.conversation);
}

export async function createChatConversation(adId: string) {
  const data = await requestChatApi('/chats', {
    method: 'POST',
    body: JSON.stringify({
      adId,
    }),
  });

  if (!data.conversation) {
    throw new Error('Conversation could not be opened.');
  }

  return normalizeConversation(data.conversation);
}

export async function sendChatMessage(conversationId: string, text: string) {
  const data = await requestChatApi(`/chats/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      text,
    }),
  });

  if (!data.conversation) {
    throw new Error('Message could not be sent.');
  }

  return normalizeConversation(data.conversation);
}
