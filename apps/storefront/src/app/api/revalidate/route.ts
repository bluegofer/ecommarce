import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRUSTED_ORIGINS = [
  'https://nolimitshopping.com',
  'https://www.nolimitshopping.com',
  'https://admin.nolimitshopping.com',
];

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET ?? '';
  const isProd = process.env.NODE_ENV === 'production';
  const origin = req.headers.get('origin') ?? '';
  const isTrustedOrigin = TRUSTED_ORIGINS.includes(origin);
  const headerSecret = req.headers.get('x-revalidate-secret') ?? '';
  const querySecret = new URL(req.url).searchParams.get('secret') ?? '';
  const provided = headerSecret || querySecret;
  const host = req.headers.get('host') ?? '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');

  const allowed = isTrustedOrigin || (secret.length > 0 && provided === secret) || (!isProd && isLocal);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { paths?: string[]; tags?: string[] };
  try {
    body = (await req.json()) as { paths?: string[]; tags?: string[] };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const paths: string[] = [];
  const tags: string[] = [];
  for (const p of body.paths ?? []) {
    if (typeof p === 'string' && p.startsWith('/')) {
      revalidatePath(p);
      paths.push(p);
    }
  }
  for (const t of body.tags ?? []) {
    if (typeof t === 'string' && t.length > 0) {
      revalidateTag(t);
      tags.push(t);
    }
  }

  return NextResponse.json({ ok: true, revalidated: { paths, tags }, now: Date.now() });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'use POST' }, { status: 405 });
}