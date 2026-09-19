// Step 14.5 — sitewide OG image fallback (1200x630).
// Used when a page does not define its own opengraph-image.
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BlueGofer — Online Shopping in Bangladesh';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0C2B3D 0%, #164561 55%, #25729A 100%)',
          color: '#FFFFFF',
          padding: 80,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              background: '#87CEEB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 36,
              color: '#0C2B3D',
            }}
          >
            S
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>BlueGofer</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>
            Online Shopping in Bangladesh
          </div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.85 }}>
          Safe payments · Fast delivery · Easy returns
        </div>
      </div>
    ),
    { ...size },
  );
}