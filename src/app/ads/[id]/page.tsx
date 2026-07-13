import type { Metadata } from 'next';
import { AdDetailsView } from '@/components/ads/AdDetailsView';
import {
  formatAdSharePrice,
  getAdShareDescription,
  getAdShareImageUrl,
  getAdShareTitle,
  getProductionAdUrl,
} from '@/lib/ad-sharing';
import { fetchPublicAdById } from '@/lib/ads-public';

type AdDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: AdDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const canonicalUrl = getProductionAdUrl(id);

  try {
    const ad = await fetchPublicAdById(id);
    const title = getAdShareTitle(ad, 'uz');
    const priceLabel = formatAdSharePrice(ad, 'uz');
    const description = getAdShareDescription(ad, 'uz');
    const image = getAdShareImageUrl(ad);
    const pageTitle = priceLabel ? `${title} | ${priceLabel} | BirJoy` : `${title} | BirJoy`;

    return {
      title: pageTitle,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        type: 'website',
        siteName: 'BirJoy',
        title,
        description,
        url: canonicalUrl,
        images: [
          {
            url: image,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return {
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }
}

export default async function AdDetailsPage({
  params,
}: AdDetailsPageProps) {
  const { id } = await params;
  let initialAd = null;

  try {
    initialAd = await fetchPublicAdById(id);
  } catch {
    initialAd = null;
  }

  return <AdDetailsView adId={id} initialAd={initialAd} />;
}
