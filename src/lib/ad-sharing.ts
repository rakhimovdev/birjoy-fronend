import { getLocalizedText, languageMeta, type Language } from '@/lib/i18n';
import { getAdDisplayLocation } from '@/lib/listing-utils';
import type { Ad } from '@/lib/types';

export const BIRJOY_PUBLIC_SITE_URL = 'https://www.bir-joy.uz';

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

function isLocalHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')
  );
}

function isNativeShell() {
  if (typeof window === 'undefined') {
    return false;
  }

  const protocol = window.location.protocol;
  const hasCapacitorObject =
    typeof (window as Window & { Capacitor?: unknown }).Capacitor !== 'undefined';
  const isNativeUserAgent = window.navigator.userAgent.includes('BirJoyAndroidApp');

  return (
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    protocol === 'app:' ||
    protocol === 'file:' ||
    hasCapacitorObject ||
    isNativeUserAgent
  );
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getProductionAdUrl(adId: string) {
  return `${BIRJOY_PUBLIC_SITE_URL}/ads/${adId}`;
}

export function getAdShareUrl(adId: string, fallbackUrl?: string) {
  const productionUrl = getProductionAdUrl(adId);

  if (typeof window === 'undefined') {
    return productionUrl;
  }

  const currentUrl = fallbackUrl || window.location.href;

  if (isNativeShell()) {
    return productionUrl;
  }

  if (!isLocalHost(window.location.hostname)) {
    return productionUrl;
  }

  if (window.location.pathname === `/ads/${adId}`) {
    return currentUrl;
  }

  try {
    return new URL(`/ads/${adId}`, window.location.origin).href;
  } catch {
    return currentUrl || productionUrl;
  }
}

export function formatAdSharePrice(ad: Ad, locale: Language) {
  return new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(ad.price);
}

export function getAdShareTitle(ad: Ad, locale: Language) {
  return getLocalizedText(ad.title, locale).trim() || 'BirJoy';
}

export function getAdShareDescription(ad: Ad, locale: Language, maxLength = 180) {
  const priceLabel = formatAdSharePrice(ad, locale);
  const location =
    getLocalizedText(ad.formattedAddress, locale) ||
    getLocalizedText(getAdDisplayLocation(ad), locale);
  const description = getLocalizedText(ad.description, locale).replace(/\s+/g, ' ').trim();
  const baseDescription = [priceLabel, location, description].filter(Boolean).join('. ');

  return truncateText(baseDescription || getAdShareTitle(ad, locale), maxLength);
}

export function getAdShareImageUrl(ad: Ad) {
  const image = ad.images.find((value) => {
    if (!value || value.startsWith('data:') || value.startsWith('blob:')) {
      return false;
    }

    return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
  });

  if (!image) {
    return `${BIRJOY_PUBLIC_SITE_URL}/icon-512.png`;
  }

  if (image.startsWith('/')) {
    return `${trimTrailingSlash(BIRJOY_PUBLIC_SITE_URL)}${image}`;
  }

  return image;
}

export function buildAdSharePayload(ad: Ad, locale: Language, fallbackUrl?: string) {
  const title = getAdShareTitle(ad, locale);
  const priceLabel = formatAdSharePrice(ad, locale);
  const url = getAdShareUrl(ad.id, fallbackUrl);

  return {
    title,
    text: priceLabel ? `${title} - ${priceLabel}` : title,
    url,
  };
}

export function getTelegramShareUrl(ad: Ad, locale: Language) {
  const payload = buildAdSharePayload(ad, locale);
  const text = [payload.text, getAdShareDescription(ad, locale, 120)].filter(Boolean).join('\n');

  return `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(text)}`;
}

export function getWhatsAppShareUrl(ad: Ad, locale: Language) {
  const payload = buildAdSharePayload(ad, locale);
  const text = [payload.text, getAdShareDescription(ad, locale, 120), payload.url]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function canUseWebShare(payload: { title: string; text: string; url: string }) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }

  if (typeof navigator.canShare !== 'function') {
    return true;
  }

  try {
    return navigator.canShare(payload);
  } catch {
    return true;
  }
}

export async function copyTextToClipboard(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available.');
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();

  const isSuccessful = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!isSuccessful) {
    throw new Error('Clipboard copy failed.');
  }
}
