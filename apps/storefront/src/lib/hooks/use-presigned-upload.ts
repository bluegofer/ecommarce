// apps/storefront/src/lib/hooks/use-presigned-upload.ts
// Lightweight client-side S3 upload for storefront (returns media).
// Mirrors the admin hook but kept self-contained per DECISIONS.md.
'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';

export interface PresignResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: string;
}

async function putToS3(
  uploadUrl: string,
  blob: Blob,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(blob);
  });
}

export function usePresignedUpload() {
  const [progress, setProgress] = useState<Record<string, number>>({});

  async function uploadBlob(
    blob: Blob,
    contentType: string,
    filename: string,
    trackingId: string,
  ): Promise<string> {
    const presign = await api.post<PresignResult>('/uploads/presign', {
      filename,
      mimeType: contentType,
      sizeBytes: blob.size,
      kind: 'image',
    });

    await putToS3(presign.uploadUrl, blob, contentType, (pct) => {
      setProgress((prev) => ({ ...prev, [trackingId]: pct }));
    });
    setProgress((prev) => ({ ...prev, [trackingId]: 100 }));
    return presign.publicUrl;
  }

  return { uploadBlob, progress };
}
