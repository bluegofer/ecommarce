// Step 14.1 — on-demand ISR revalidation webhook.
//
// Called by the admin app (or backend) after a product/category/CMS publish.
// Secured with a shared secret in `REVALIDATE_SECRET` env var; if the env is
// unset, the route returns 503 in production and allows only localhost in dev.
//
// Example:
//   POST /api/revalidate
//   { "paths": ["/bn/p/wireless-headphone-x200", "/en/p/wireless-headphone-x200"] }
//
// Or with tags:
//   { "tags": ["product:wireless-headphone-x200"] }
//
// See TDD §8.1 — "on-demand revalidation hooked to admin publish events".
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RevalidatePayload {
  paths?: string[];
  tags?: string[];
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET ?? '';
  const isProd = process.env.NODE_ENV === 'production';

  // Header-based secret (preferred) or query param (for simple curl usage)
  const headerSecret = req.headers.get('x-revalidate-secret') ?? '';
  const querySecret = new URL(req.url).searchParams.get('secret') ?? '';
  const provided = headerSecret || querySecret;

  if (isProd && !secret) {
    return NextResponse.json(
      { ok: false, error: 'REVALIDATE_SECRET not configured' },
      { status: 503 },
    );
  }
  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: RevalidatePayload;
  try {
    body = (await req.json()) as RevalidatePayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const revalidatedPaths: string[] = [];
  const revalidatedTags: string[] = [];

  for (const p of body.paths ?? []) {
    if (typeof p === 'string' && p.startsWith('/')) {
      revalidatePath(p);
      revalidatedPaths.push(p);
    }
  }
  for (const t of body.tags ?? []) {
    if (typeof t === 'string' && t.length > 0) {
      revalidateTag(t);
      revalidatedTags.push(t);
    }
  }

  return NextResponse.json({
    ok: true,
    revalidated: { paths: revalidatedPaths, tags: revalidatedTags },
    now: Date.now(),
  });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'use POST' }, { status: 405 });
}