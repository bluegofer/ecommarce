'use client';

/**
 * Sub-step 3.3 — browser-side image resize + WebP conversion.
 *
 * Why: t3.medium has 4 GB RAM. sharp/ffmpeg on the API for every upload
 * is unsafe under burst load. Browser uses the user's CPU, costs $0,
 * and hits zero EC2 memory.
 *
 * - decode File via createImageBitmap
 * - produce 3 WebP blobs (thumb 300, medium 800, large 1600) at 0.85 quality
 * - preserve aspect ratio, only downscale
 * - fall back to JPEG if the browser cannot encode WebP
 */

export interface ResizedImage {
  thumb: Blob;
  medium: Blob;
  large: Blob;
  width: number;
  height: number;
}

const SIZES = { thumb: 300, medium: 800, large: 1600 } as const;
const WEBP_QUALITY = 0.85;

async function encode(
  bitmap: ImageBitmap,
  maxEdge: number,
): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);

  const webp: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', WEBP_QUALITY),
  );
  if (webp) return webp;

  const jpeg: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', WEBP_QUALITY),
  );
  if (!jpeg) throw new Error('canvas.toBlob returned null for both webp and jpeg');
  return jpeg;
}

export async function resizeImageToWebp(file: File): Promise<ResizedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`not an image: ${file.type}`);
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('image exceeds 5 MB — pick a smaller file');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const [thumb, medium, large] = await Promise.all([
      encode(bitmap, SIZES.thumb),
      encode(bitmap, SIZES.medium),
      encode(bitmap, SIZES.large),
    ]);
    return { thumb, medium, large, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export async function extractVideoPoster(file: File): Promise<Blob> {
  if (!file.type.startsWith('video/')) {
    throw new Error(`not a video: ${file.type}`);
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('video exceeds 50 MB — pick a smaller file');
  }

  return new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onerror = () => {
      cleanup();
      reject(new Error('failed to decode video'));
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
    };

    video.onseeked = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 800;
        canvas.height = video.videoHeight || 450;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas 2d context unavailable');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const webp = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), 'image/webp', WEBP_QUALITY),
        );
        cleanup();
        if (!webp) throw new Error('poster encode failed');
        resolve(webp);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
  });
}