'use client';

/**
 * Sub-step 3.4 — direct-to-S3 upload with progress.
 *
 * 1. ask API for a presigned PUT URL   (POST /api/v1/uploads/presign)
 * 2. PUT the blob straight to S3       (no auth header — URL is signed)
 * 3. return the public URL             (caller attaches it to the product)
 *
 * Zero EC2 memory. Zero API cost beyond the tiny presign JSON.
 */

import { useState } from 'react';
import { api, ApiError } from './api';
import type { PresignResultDto, UploadKind } from '@ecommarce/types';

function putToS3(
  uploadUrl: string,
  blob: Blob,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ApiError(xhr.status, 'S3_UPLOAD', `S3 PUT failed: ${xhr.status}`));
    };
    xhr.onerror = () =>
      reject(new ApiError(0, 'S3_NETWORK', 'S3 PUT network error'));

    xhr.send(blob);
  });
}

export function usePresignedUpload() {
  const [progress, setProgress] = useState<Record<string, number>>({});

  async function uploadBlob(
    blob: Blob,
    contentType: string,
    filename: string,
    kind: UploadKind,
    trackingId: string,
  ): Promise<string> {
    const presign = await api.post<PresignResultDto>('/api/v1/uploads/presign', {
      filename,
      mimeType: contentType,
      sizeBytes: blob.size,
      kind,
    });

    await putToS3(presign.uploadUrl, blob, contentType, (pct) => {
      setProgress((prev) => ({ ...prev, [trackingId]: pct }));
    });

    setProgress((prev) => ({ ...prev, [trackingId]: 100 }));
    return presign.publicUrl;
  }

  return { uploadBlob, progress };
}