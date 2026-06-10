import { AdDetailsView } from '@/components/ads/AdDetailsView';

export default async function AdDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdDetailsView adId={id} />;
}
