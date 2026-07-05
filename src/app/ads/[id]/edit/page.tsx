import { EditAdPageView } from '@/components/ads/EditAdPageView';

export default async function EditAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EditAdPageView adId={id} />;
}
