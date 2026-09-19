// Step 14.5 — dynamic OG image per product (1200x630).
// Runs at request time; Next.js caches the response per slug.
import { ImageResponse } from 'next/og';
import { catalogApi } from '@/lib/api';

export const runtime = 'edge';
export const alt = 'Product — BlueGofer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { locale: string; slug: string };
}

export default async function Image({ params }: Props) {
  const locale = (params.locale === 'en' ? 'en' : 'bn') as 'bn' | 'en';
  let title = 'BlueGofer';
  let brand = '';
  let price = '';
  let imgUrl: string | null = null;

  try {
    const p = await catalogApi.getProductBySlug(params.slug);
    title = locale === 'bn' ? p.titleBn : p.titleEn;
    brand = p.brand ?? '';
    price =
      typeof p.minPricePoisha === 'number' && p.minPricePoisha > 0
        ? `৳${(p.minPricePoisha / 100).toLocaleString('en-BD')}`
        : '';
    imgUrl = p.primaryImageUrl ?? null;
  } catch {
    /* fall through to default */
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#FFFFFF',
          padding: 60,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 460,
            height: 510,
            background: '#EFF7FB',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl} alt="" width={460} height={510} style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: 48, color: '#25729A' }}>BlueGofer</div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            marginLeft: 40,
            justifyContent: 'center',
          }}
        >
          {brand ? (
            <div style={{ fontSize: 24, color: '#25729A', marginBottom: 8 }}>{brand}</div>
          ) : null}
          <div style={{ fontSize: 44, fontWeight: 700, color: '#0F172A', lineHeight: 1.15 }}>
            {title.length > 90 ? title.slice(0, 88) + '…' : title}
          </div>
          {price ? (
            <div style={{ fontSize: 56, fontWeight: 700, color: '#C2410C', marginTop: 24 }}>
              {price}
            </div>
          ) : null}
          <div
            style={{
              marginTop: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 24,
              color: '#64748B',
            }}
          >
            <span style={{ fontWeight: 700, color: '#0C2B3D' }}>BlueGofer</span>
            <span>·</span>
            <span>Free delivery over ৳1,500</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}