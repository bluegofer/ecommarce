import { redirect } from 'next/navigation';

export default function PurchasesRootPage() {
  redirect('/purchases/requisitions');
}