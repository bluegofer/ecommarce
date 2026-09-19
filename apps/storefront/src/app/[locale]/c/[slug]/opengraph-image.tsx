// Step 14.5 — dynamic OG image per category (1200x630).
import { ImageResponse } from 'next/og';
import { catalogApi } from '@/lib/api';

export const runtime = 'edge';
export const alt = 'Category — BlueGofer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { locale: string; slug: string };
}

function findPath(
  nodes: Array<{ slug: string; nameEn: string; nameBn: string; children: unknown[] }>,
  slug: string,
): { nameEn: string; nameBn: string } | null {
  for (const n of nodes) {
    if (n.slug === slug) return { nameEn: n.nameEn, nameBn: n.nameBn };
    const found = findPath(
      n.children as Array<{ slug: string; nameEn: string; nameBn: string; children: unknown[] }>,
      slug,
    );
    if (found) return found;
  }
  return null;
}

export default async function Image({ params }: Props) {
  const locale = (params.locale === 'en' ? 'en' : 'bn') as 'bn' | 'en';
  let name = params.slug;
  try {
    const tree = await catalogApi.getCategoryTree();
    const found = findPath(
      tree as unknown as Array<{ slug: string; nameEn: string; nameBn: string; children: unknown[] }>,
      params.slug,
    );
    if (found) name = locale === 'bn' ? found.nameBn : found.nameEn;
  } catch {
    /* default slug as name */
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #EFF7FB 0%, #E0F2FE 100%)',
          padding: 80,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#0F172A',
        }}
      >
        <div style={{ fontSize: 32, color: '#25729A', fontWeight: 600 }}>Category</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 28,
            color: '#64748B',
          }}
        >
          <span style={{ fontWeight: 700, color: '#0C2B3D' }}>BlueGofer</span>
          <span>nolimitshopping.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}