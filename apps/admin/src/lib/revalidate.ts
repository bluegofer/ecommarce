// Step-88 — Trigger storefront ISR revalidation after admin edits.
// Fire-and-forget: failures don't block the admin UI.
import { env } from './env';

interface RevalidateResult {
  ok: boolean;
  error?: string;
}

export async function revalidateStorefront(
  slug: string | null | undefined,
): Promise<RevalidateResult> {
  const paths: string[] = [];
  if (slug) {
    for (const locale of ['en', 'bn']) {
      paths.push(`/${locale}/p/${slug}`);
    }
  }
  // Always refresh home pages (recently updated sections/products)
  paths.push('/en', '/bn');

  try {
    const res = await fetch(`${env.storefrontUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.revalidateSecret ? { 'x-revalidate-secret': env.revalidateSecret } : {}),
      },
      body: JSON.stringify({ paths }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[revalidate] failed', res.status, body.slice(0, 200));
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[revalidate] network error:', (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}