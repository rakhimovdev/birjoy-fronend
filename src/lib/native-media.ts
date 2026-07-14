'use client';

import { Camera, MediaTypeSelection } from '@capacitor/camera';

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image data.'));
    };

    reader.onerror = () => reject(new Error('Failed to read image data.'));
    reader.readAsDataURL(blob);
  });
}

async function mediaPathToDataUrl(webPath?: string, thumbnail?: string) {
  if (webPath) {
    const response = await fetch(webPath);

    if (!response.ok) {
      throw new Error('Failed to load selected image.');
    }

    return blobToDataUrl(await response.blob());
  }

  if (thumbnail) {
    return `data:image/jpeg;base64,${thumbnail}`;
  }

  throw new Error('Selected image is missing.');
}

export async function chooseNativeImages(limit: number) {
  const { results } = await Camera.chooseFromGallery({
    allowMultipleSelection: true,
    limit,
    mediaType: MediaTypeSelection.Photo,
  });

  return Promise.all(results.map((result) => mediaPathToDataUrl(result.webPath, result.thumbnail)));
}

export async function takeNativePhoto() {
  const result = await Camera.takePhoto({
    quality: 100,
    saveToGallery: false,
  });

  return mediaPathToDataUrl(result.webPath, result.thumbnail);
}
