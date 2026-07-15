'use client';

import { getStoredAuthToken, signOutUser } from '@/lib/auth';
import { backendApiBaseUrl } from '@/lib/api';

export type UploadedAdImage = {
  url: string;
  fileId: string;
  name: string;
  thumbnailUrl: string;
};

type ImageKitUploadSession = {
  publicKey: string;
  urlEndpoint: string;
  folder: string;
  token: string;
  expire: number;
  signature: string;
};

type UploadApiResponse = {
  message?: string;
  upload?: Partial<ImageKitUploadSession>;
};

function normalizeString(value: string | undefined) {
  return String(value || '').trim();
}

function sanitizeFileName(value: string) {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.replace(/[^a-zA-Z0-9._-]/g, '-');
}

async function requestUploadApi(path: string, init?: RequestInit) {
  const token = getStoredAuthToken();
  const headers = new Headers(init?.headers);

  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${backendApiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => ({}))) as UploadApiResponse;

  if (response.status === 401) {
    signOutUser();
  }

  if (!response.ok) {
    throw new Error(data.message || 'Upload request failed.');
  }

  return data;
}

async function createImageKitUploadSession() {
  const data = await requestUploadApi('/uploads/imagekit/auth', {
    method: 'POST',
  });
  const upload = data.upload;

  if (
    !upload ||
    !normalizeString(upload.publicKey) ||
    !normalizeString(upload.folder) ||
    !normalizeString(upload.token) ||
    !normalizeString(upload.signature) ||
    !Number.isFinite(upload.expire)
  ) {
    throw new Error('ImageKit upload configuration is incomplete.');
  }

  return {
    publicKey: normalizeString(upload.publicKey),
    urlEndpoint: normalizeString(upload.urlEndpoint),
    folder: normalizeString(upload.folder),
    token: normalizeString(upload.token),
    expire: Number(upload.expire),
    signature: normalizeString(upload.signature),
  } satisfies ImageKitUploadSession;
}

function parseImageKitUploadAsset(data: {
  url?: string;
  fileId?: string;
  name?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
}) {
  const url = normalizeString(data.url);
  const fileId = normalizeString(data.fileId);
  const name = normalizeString(data.name);
  const thumbnailUrl = normalizeString(data.thumbnailUrl || data.thumbnail) || url;

  if (!url || !fileId) {
    throw new Error('ImageKit upload did not return a usable image.');
  }

  return {
    url,
    fileId,
    name: name || 'image',
    thumbnailUrl,
  } satisfies UploadedAdImage;
}

async function parseImageKitUploadResponse(response: Response) {
  const data = (await response.json().catch(() => ({}))) as {
    url?: string;
    fileId?: string;
    name?: string;
    thumbnailUrl?: string;
    thumbnail?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || 'ImageKit upload failed.');
  }

  return parseImageKitUploadAsset(data);
}

function resolveUploadFileName(source: File | string, index = 0) {
  if (source instanceof File) {
    return sanitizeFileName(source.name) || `ad-image-${Date.now()}-${index + 1}.jpg`;
  }

  return `ad-image-${Date.now()}-${index + 1}.jpg`;
}

export async function uploadAdImageToImageKit(source: File | string, index = 0) {
  const uploadSession = await createImageKitUploadSession();
  const formData = new FormData();

  formData.append('file', source);
  formData.append('fileName', resolveUploadFileName(source, index));
  formData.append('publicKey', uploadSession.publicKey);
  formData.append('token', uploadSession.token);
  formData.append('expire', String(uploadSession.expire));
  formData.append('signature', uploadSession.signature);
  formData.append('folder', uploadSession.folder);
  formData.append('useUniqueFileName', 'true');

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  return parseImageKitUploadResponse(response);
}

export async function uploadAdImagesToImageKit(sources: Array<File | string>) {
  if (sources.length === 0) {
    return [];
  }

  const uploadedImages: UploadedAdImage[] = [];

  try {
    for (const [index, source] of sources.entries()) {
      const uploadedImage = await uploadAdImageToImageKit(source, index);
      uploadedImages.push(uploadedImage);
    }
  } catch (error) {
    if (uploadedImages.length > 0) {
      await Promise.allSettled(
        uploadedImages.map((image) => deleteUploadedAdImage(image.fileId))
      );
    }

    throw error instanceof Error
      ? error
      : new Error('One or more images could not be uploaded.');
  }

  return uploadedImages;
}

export async function deleteUploadedAdImage(fileId: string) {
  if (!normalizeString(fileId)) {
    return;
  }

  await requestUploadApi('/uploads/imagekit', {
    method: 'DELETE',
    body: JSON.stringify({
      fileId,
    }),
  });
}
