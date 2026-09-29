import { ReturnDetailClient } from './ReturnDetailClient';

export default function ReturnDetailPage({ params }: { params: { id: string } }) {
  return <ReturnDetailClient returnId={params.id} />;
}