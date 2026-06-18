'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin, Phone, Tag, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { AdCard } from '@/components/ads/AdCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategoryBySlug } from '@/lib/mock-data';
import { Ad } from '@/lib/types';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { fetchAdById, fetchAds, getConditionLabel } from '@/lib/ads';

export function AdDetailsView({ adId }: { adId: string }) {
  const { isFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const [ad, setAd] = useState<Ad | null>(null);
  const [relatedAds, setRelatedAds] = useState<Ad[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAd() {
      try {
        setIsLoading(true);
        const [currentAd, allAds] = await Promise.all([fetchAdById(adId), fetchAds()]);

        if (!cancelled) {
          setAd(currentAd);
          setSelectedImageIndex(0);
          setRelatedAds(
            allAds.filter((item) => item.id !== currentAd.id && item.category === currentAd.category).slice(0, 3)
          );
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAd(null);
          setRelatedAds([]);
          setError(loadError instanceof Error ? loadError.message : messages.adDetails.notFound);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAd();

    return () => {
      cancelled = true;
    };
  }, [adId, messages.adDetails.notFound]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <div className="rounded-3xl border bg-white px-6 py-12 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight">{messages.adDetails.loading}</h1>
          </div>
        </main>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <div className="rounded-3xl border bg-white px-6 py-12 text-center shadow-sm">
            <h1 className="mb-3 text-2xl font-bold tracking-tight">{messages.adDetails.notFound}</h1>
            <p className="mb-8 text-muted-foreground">{error || messages.adDetails.notFound}</p>
            <Button asChild>
              <Link href="/">{messages.adDetails.backToListings}</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const category = getCategoryBySlug(ad.category);
  const localizedTitle = getLocalizedText(ad.title, locale);
  const localizedDescription = getLocalizedText(ad.description, locale);
  const localizedLocation = getLocalizedText(ad.location, locale);
  const localizedCategory = category ? getLocalizedText(category.name, locale) : messages.adDetails.category;
  const localizedCondition = getConditionLabel(ad.condition, locale);
  const selectedImage = ad.images[selectedImageIndex] || ad.images[0];
  const shouldDisableOptimization =
    selectedImage.startsWith('data:') || selectedImage.startsWith('blob:');
  const formattedPrice = new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(ad.price);
  const postedAgo = formatDistanceToNow(new Date(ad.createdAt), {
    addSuffix: true,
    locale: languageMeta[locale].dateLocale,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" className="px-0 text-primary hover:bg-transparent">
            <Link href="/">{messages.adDetails.backToListings}</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-6">
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border bg-white shadow-sm">
              <Image
                src={selectedImage}
                alt={localizedTitle}
                fill
                className="object-cover"
                data-ai-hint="classified product detail"
                unoptimized={shouldDisableOptimization}
              />
              {ad.isFeatured ? (
                <Badge className="absolute left-4 top-4 bg-accent font-bold text-accent-foreground">
                  {messages.adCard.featured}
                </Badge>
              ) : null}
            </div>
            {ad.images.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {ad.images.map((image, index) => (
                  <button
                    key={`${image.slice(0, 32)}-${index}`}
                    type="button"
                    className={`relative aspect-square overflow-hidden rounded-2xl border transition-colors ${index === selectedImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                      }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <Image
                      src={image}
                      alt={`${localizedTitle} ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized={image.startsWith('data:') || image.startsWith('blob:')}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">
                    {localizedCategory}
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{localizedTitle}</h1>
                </div>
                <div className="text-3xl font-bold text-primary">{formattedPrice}</div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-y py-5 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.location}</p>
                    <p>{localizedLocation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.posted}</p>
                    <p>{postedAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.category}</p>
                    <p>{localizedCategory}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.condition}</p>
                    <p>{localizedCondition}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <h2 className="mb-3 text-xl font-semibold">{messages.adDetails.description}</h2>
                <p className="whitespace-pre-line leading-7 text-muted-foreground">{localizedDescription}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24 border-none shadow-sm">
              <CardHeader>
                <CardTitle>{messages.adDetails.overview}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-4">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{messages.adDetails.seller}</p>
                    <p className="font-semibold">{ad.userName}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.category}: </span>
                    {localizedCategory}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.condition}: </span>
                    {localizedCondition}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.location}: </span>
                    {localizedLocation}
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <p>
                      <span className="font-medium text-foreground">{messages.auth.phoneLabel}: </span>
                      {ad.sellerPhone}
                    </p>
                  </div>
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.posted}: </span>
                    {postedAgo}
                  </p>
                </div>

                <div className="grid gap-3">
                  <Button asChild className="h-11">
                    <Link href="/ads/create">{messages.adDetails.createSimilar}</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11">
                    <Link href="/">{messages.adDetails.browseMore}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>{messages.adDetails.safetyTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {messages.adDetails.safetyTips.map((tip) => (
                  <div key={tip} className="rounded-2xl bg-muted/50 p-4">
                    {tip}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {relatedAds.length > 0 ? (
          <section className="mt-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">{messages.adDetails.relatedListings}</h2>
              <Button asChild variant="ghost" className="text-primary">
                <Link href="/">{messages.adDetails.browseMore}</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {relatedAds.map((item) => (
                <AdCard key={item.id} ad={item} isFavorite={isFavorite(item.id)} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
