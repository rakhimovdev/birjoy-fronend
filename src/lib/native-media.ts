'use client';

import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const MOBILE_UPLOAD_QUALITY = 82;
const MOBILE_UPLOAD_TARGET_WIDTH = 1600;
const MOBILE_UPLOAD_TARGET_HEIGHT = 1600;

type NativeMediaMetadata = {
  format?: string;
};

type NativeMediaAsset = {
  format?: string;
  metadata?: NativeMediaMetadata;
  path?: string;
  thumbnail?: string;
  uri?: string;
  webPath?: string;
};

function normalizeString(value: string | undefined) {
  return String(value || '').trim();
}

function normalizeImageMimeType(format?: string) {
  const normalizedFormat = normalizeString(format).toLowerCase();

  switch (normalizedFormat) {
    case 'jpg':
    case 'jpeg':
    case 'image/jpeg':
      return 'image/jpeg';
    case 'png':
    case 'image/png':
      return 'image/png';
    case 'webp':
    case 'image/webp':
      return 'image/webp';
    case 'heic':
    case 'image/heic':
    case 'heif':
    case 'image/heif':
      return 'image/jpeg';
    default:
      return 'image/jpeg';
  }
}

function extensionFromMimeType(mimeType?: string) {
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

function buildNativeImageFileName(index = 0, mimeType?: string) {
  return `native-image-${Date.now()}-${index + 1}.${extensionFromMimeType(mimeType)}`;
}

function normalizeBlobMimeType(blob: Blob, mimeType: string) {
  if (blob.type === mimeType || !mimeType) {
    return blob;
  }

  if (blob.type) {
    return blob;
  }

  return blob.slice(0, blob.size, mimeType);
}

function toUploadFile(blob: Blob, index = 0, mimeType = blob.type || 'image/jpeg') {
  const normalizedBlob = normalizeBlobMimeType(blob, mimeType);
  const fileName = buildNativeImageFileName(index, mimeType);

  if (typeof File === 'function') {
    return new File([normalizedBlob], fileName, {
      type: mimeType,
    });
  }

  return normalizedBlob;
}

function buildDataUrl(base64: string, mimeType: string) {
  return `data:${mimeType};base64,${base64}`;
}

async function blobFromFetch(url: string, mimeType: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to load selected image.');
  }

  const blob = await response.blob();

  if (!blob.size) {
    throw new Error('Selected image is empty.');
  }

  return normalizeBlobMimeType(blob, mimeType);
}

async function imageElementFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(new Error('Failed to load selected image.'));
    };

    image.src = url;
  });
}

async function blobFromImageElement(url: string, mimeType: string) {
  const image = await imageElementFromUrl(url);
  const canvas = document.createElement('canvas');
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error('Selected image is empty.');
  }

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to read selected image.');
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob || !nextBlob.size) {
          reject(new Error('Selected image is empty.'));
          return;
        }

        resolve(nextBlob);
      },
      mimeType,
      mimeType === 'image/png' ? undefined : MOBILE_UPLOAD_QUALITY / 100
    );
  });

  return normalizeBlobMimeType(blob, mimeType);
}

function buildMediaSourceCandidates(asset: NativeMediaAsset) {
  const candidates = [
    normalizeString(asset.webPath),
    normalizeString(asset.path ? Capacitor.convertFileSrc(asset.path) : ''),
    normalizeString(asset.uri ? Capacitor.convertFileSrc(asset.uri) : ''),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

function getNativeMediaMimeType(asset: NativeMediaAsset) {
  return normalizeImageMimeType(asset.metadata?.format || asset.format);
}

async function loadMediaBlob(asset: NativeMediaAsset) {
  const mimeType = getNativeMediaMimeType(asset);
  let lastError: unknown = null;

  for (const candidateUrl of buildMediaSourceCandidates(asset)) {
    try {
      return await blobFromImageElement(candidateUrl, mimeType);
    } catch (error) {
      lastError = error;
    }

    try {
      return await blobFromFetch(candidateUrl, mimeType);
    } catch (error) {
      lastError = error;
    }
  }

  const thumbnail = normalizeString(asset.thumbnail);

  if (thumbnail) {
    try {
      return await blobFromFetch(buildDataUrl(thumbnail, mimeType), mimeType);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Selected image is missing.');
}

function getGalleryResults(payload: { photos?: NativeMediaAsset[]; results?: NativeMediaAsset[] }) {
  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.photos)) {
    return payload.photos;
  }

  return [];
}

export async function chooseNativeImages(limit: number) {
  const selection = await Camera.chooseFromGallery({
    allowMultipleSelection: true,
    limit,
    mediaType: MediaTypeSelection.Photo,
    quality: MOBILE_UPLOAD_QUALITY,
    targetWidth: MOBILE_UPLOAD_TARGET_WIDTH,
    targetHeight: MOBILE_UPLOAD_TARGET_HEIGHT,
    correctOrientation: true,
    includeMetadata: true,
  });
  const results = getGalleryResults(selection);

  return Promise.all(
    results.map(async (result, index) => {
      const blob = await loadMediaBlob(result);
      return toUploadFile(blob, index, getNativeMediaMimeType(result));
    })
  );
}

export async function takeNativePhoto() {
  const result = await Camera.takePhoto({
    quality: MOBILE_UPLOAD_QUALITY,
    targetWidth: MOBILE_UPLOAD_TARGET_WIDTH,
    targetHeight: MOBILE_UPLOAD_TARGET_HEIGHT,
    correctOrientation: true,
    saveToGallery: false,
    includeMetadata: true,
  });

  const blob = await loadMediaBlob(result);
  return toUploadFile(blob, 0, getNativeMediaMimeType(result));
}
