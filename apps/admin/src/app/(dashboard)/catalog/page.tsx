import { redirect } from 'next/navigation';

export default function CatalogRootPage() {
  redirect('/products');
}