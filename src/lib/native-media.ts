'use client';

import { Camera, MediaTypeSelection } from '@capacitor/camera';

const MOBILE_UPLOAD_QUALITY = 82;
const MOBILE_UPLOAD_TARGET_WIDTH = 1600;
const MOBILE_UPLOAD_TARGET_HEIGHT = 1600;

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

function toUploadFile(blob: Blob, index = 0) {
  const mimeType = blob.type || 'image/jpeg';
  const fileName = buildNativeImageFileName(index, mimeType);

  if (typeof File === 'function') {
    return new File([blob], fileName, {
      type: mimeType,
    });
  }

  return blob;
}

async function loadMediaBlob(webPath?: string, thumbnail?: string) {
  if (webPath) {
    const response = await fetch(webPath);

    if (!response.ok) {
      throw new Error('Failed to load selected image.');
    }

    const blob = await response.blob();

    if (!blob.size) {
      throw new Error('Selected image is empty.');
    }

    return blob;
  }

  if (thumbnail) {
    const response = await fetch(`data:image/jpeg;base64,${thumbnail}`);

    if (!response.ok) {
      throw new Error('Failed to read selected image.');
    }

    return response.blob();
  }

  throw new Error('Selected image is missing.');
}

export async function chooseNativeImages(limit: number) {
  const { results } = await Camera.chooseFromGallery({
    allowMultipleSelection: true,
    limit,
    mediaType: MediaTypeSelection.Photo,
    quality: MOBILE_UPLOAD_QUALITY,
    targetWidth: MOBILE_UPLOAD_TARGET_WIDTH,
    targetHeight: MOBILE_UPLOAD_TARGET_HEIGHT,
    correctOrientation: true,
  });

  return Promise.all(
    results.map(async (result, index) => {
      const blob = await loadMediaBlob(result.webPath, result.thumbnail);
      return toUploadFile(blob, index);
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
  });

  const blob = await loadMediaBlob(result.webPath, result.thumbnail);
  return toUploadFile(blob);
}
