// packages/types/src/uploads.ts
// Sub-step 3.1 — Shared presign contract.

export type UploadKind = 'image' | 'video';

export interface PresignRequestDto {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: UploadKind;
}

export interface PresignResultDto {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: string;
}

export interface UploadResultDto {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}