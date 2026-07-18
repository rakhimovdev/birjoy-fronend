'use client';

import { getStoredAuthToken, signOutUser } from '@/lib/auth';
import { backendApiBaseUrl } from '@/lib/api';

export type UploadedAdImage = {
  url: string;
  fileId: string;
  name: string;
  thumbnailUrl: string;
};

type ImageUploadSource = File | Blob | string;

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

function extensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    default:
      return 'jpg';
  }
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

async function createImageKitUploadSession(): Promise<ImageKitUploadSession> {
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

  const nextSession = {
    publicKey: normalizeString(upload.publicKey),
    urlEndpoint: normalizeString(upload.urlEndpoint),
    folder: normalizeString(upload.folder),
    token: normalizeString(upload.token),
    expire: Number(upload.expire),
    signature: normalizeString(upload.signature),
  } satisfies ImageKitUploadSession;
  return nextSession;
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

function resolveUploadFileName(source: ImageUploadSource, index = 0) {
  if (source instanceof File) {
    return sanitizeFileName(source.name) || `ad-image-${Date.now()}-${index + 1}.jpg`;
  }

  if (source instanceof Blob) {
    return `ad-image-${Date.now()}-${index + 1}.${extensionFromMimeType(source.type)}`;
  }

  return `ad-image-${Date.now()}-${index + 1}.jpg`;
}

function appendUploadFile(formData: FormData, source: ImageUploadSource, index = 0) {
  const fileName = resolveUploadFileName(source, index);

  if (typeof source === 'string') {
    formData.append('file', source);
  } else {
    formData.append('file', source, fileName);
  }

  formData.append('fileName', fileName);
}

function resolveBatchConcurrency(total: number) {
  if (total <= 1) {
    return total;
  }

  if (typeof navigator !== 'undefined') {
    const connection = (
      navigator as Navigator & {
        connection?: {
          effectiveType?: string;
        };
      }
    ).connection;

    if (connection?.effectiveType && /(slow-2g|2g|3g)/i.test(connection.effectiveType)) {
      return Math.min(2, total);
    }
  }

  return Math.min(3, total);
}

export async function uploadAdImageToImageKit(
  source: ImageUploadSource,
  index = 0
) {
  const activeUploadSession = await createImageKitUploadSession();
  const formData = new FormData();

  appendUploadFile(formData, source, index);
  formData.append('publicKey', activeUploadSession.publicKey);
  formData.append('token', activeUploadSession.token);
  formData.append('expire', String(activeUploadSession.expire));
  formData.append('signature', activeUploadSession.signature);
  formData.append('folder', activeUploadSession.folder);
  formData.append('useUniqueFileName', 'true');

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  return parseImageKitUploadResponse(response);
}

export async function uploadAdImagesToImageKit(sources: ImageUploadSource[]) {
  if (sources.length === 0) {
    return [];
  }
  const uploadedImagesByIndex: Array<UploadedAdImage | null> = new Array(sources.length).fill(
    null
  );
  const concurrency = resolveBatchConcurrency(sources.length);
  let nextIndex = 0;
  let firstError: unknown = null;

  const workers = Array.from({ length: concurrency }, async () => {
    while (nextIndex < sources.length) {
      const currentIndex = nextIndex;

      nextIndex += 1;

      if (firstError) {
        return;
      }

      try {
        uploadedImagesByIndex[currentIndex] = await uploadAdImageToImageKit(sources[currentIndex], currentIndex);
      } catch (error) {
        firstError = firstError ?? error;
        return;
      }
    }
  });

  await Promise.allSettled(workers);

  const uploadedImages = uploadedImagesByIndex.filter(
    (image): image is UploadedAdImage => Boolean(image)
  );

  if (firstError) {
    if (uploadedImages.length > 0) {
      await Promise.allSettled(uploadedImages.map((image) => deleteUploadedAdImage(image.fileId)));
    }

    throw firstError instanceof Error
      ? firstError
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
