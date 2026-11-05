import { ProductCarousel } from '@/components/home';
import type { ProductSummary } from '@/lib/api/types';
import type { Dictionary } from '@/lib/i18n';

export interface RelatedCarouselProps {
  title: string;
  products: ProductSummary[];
  locale: 'bn' | 'en';
  dict: Dictionary;
  seeAllHref?: string;
  seeAllLabel?: string;
}

/**
 * PDP related-products carousel. Reuses home ProductCarousel but exposed
 * under the pdp/ namespace so PDP pages only import from one place.
 */
export function RelatedCarousel(props: RelatedCarouselProps) {
  return <ProductCarousel {...props} />;
}