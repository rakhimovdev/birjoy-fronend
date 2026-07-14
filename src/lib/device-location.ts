import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { Location } from '@/lib/map-types';
import { isNativeApp } from '@/lib/native-app';

export type DeviceLocationResult =
  | {
      status: 'success';
      location: Location;
    }
  | {
      status: 'denied' | 'unsupported' | 'error';
    };

type NativePermissionStatus = {
  location?: string;
  coarseLocation?: string;
};

function normalizeLocation(latitude: number, longitude: number): Location {
  return {
    lat: Number(latitude.toFixed(6)),
    lng: Number(longitude.toFixed(6)),
  };
}

function getPermissionValues(status: NativePermissionStatus) {
  return [status.location, status.coarseLocation].filter(
    (value): value is string => Boolean(value)
  );
}

function hasGrantedPermission(status: NativePermissionStatus) {
  return getPermissionValues(status).some((value) => value === 'granted');
}

function hasDeniedPermission(status: NativePermissionStatus) {
  const values = getPermissionValues(status);
  return values.length > 0 && values.every((value) => value === 'denied');
}

function isUnsupportedLocationError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    message.includes('not supported') ||
    message.includes('unimplemented') ||
    message.includes('not available')
  );
}

function isPermissionLocationError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    message.includes('permission') ||
    message.includes('denied') ||
    message.includes('not authorized')
  );
}

async function requestNativeDeviceLocation(): Promise<DeviceLocationResult> {
  try {
    let permissionStatus = await Geolocation.checkPermissions();

    if (!hasGrantedPermission(permissionStatus)) {
      if (hasDeniedPermission(permissionStatus)) {
        return { status: 'denied' };
      }

      permissionStatus = await Geolocation.requestPermissions();

      if (!hasGrantedPermission(permissionStatus)) {
        return {
          status: hasDeniedPermission(permissionStatus) ? 'denied' : 'error',
        };
      }
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });

    return {
      status: 'success',
      location: normalizeLocation(
        position.coords.latitude,
        position.coords.longitude
      ),
    };
  } catch (error) {
    if (isPermissionLocationError(error)) {
      return { status: 'denied' };
    }

    if (isUnsupportedLocationError(error)) {
      return { status: 'unsupported' };
    }

    return { status: 'error' };
  }
}

async function requestBrowserDeviceLocation(): Promise<DeviceLocationResult> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return { status: 'unsupported' };
  }

  return new Promise<DeviceLocationResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: 'success',
          location: normalizeLocation(
            position.coords.latitude,
            position.coords.longitude
          ),
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ status: 'denied' });
          return;
        }

        resolve({ status: 'error' });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });
}

export async function requestCurrentDeviceLocation() {
  if (isNativeApp() && Capacitor.isPluginAvailable('Geolocation')) {
    return requestNativeDeviceLocation();
  }

  return requestBrowserDeviceLocation();
}
