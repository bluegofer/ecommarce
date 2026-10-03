// apps/api/src/modules/uploads/uploads.service.ts
// Step 17: S3 media upload (TDD §6.1 media pipeline + §6.4 media library).
// Sub-step 3.1: presigned PUT URL for browser-direct S3 upload (zero EC2 RAM).
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import type {
  PresignRequestDto,
  PresignResultDto,
  UploadKind,
} from '@ecommarce/types';

interface UploadedFileShape {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION ?? 'ap-south-1';
    this.bucket = process.env.S3_MEDIA_BUCKET ?? '';
    if (!this.bucket) {
      this.logger.warn('S3_MEDIA_BUCKET not set — media uploads will fail');
    }
    // EC2 IAM role supplies credentials automatically; no keys in code.
    this.s3 = new S3Client({ region: this.region });
  }

  async uploadMedia(file: UploadedFileShape): Promise<UploadResult> {
    if (!file) throw new Error('file required');
    if (!this.bucket) throw new Error('S3_MEDIA_BUCKET not configured');

    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const id = randomUUID();
    const key = `media/${id}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      url,
      key,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  /**
   * Sub-step 3.1 — presigned PUT URL for browser-direct S3 upload.
   *
   * Why: t3.medium (4 GB RAM) cannot safely buffer large image/video
   * payloads through the API process. Browser PUTs straight to S3.
   *
   * Contract:
   *   - kind=image : <= 5 MB, mime in {jpeg, png, webp, gif}
   *   - kind=video : <= 50 MB, mime in {mp4, webm, quicktime}
   *   - URL expires in 5 minutes
   *   - Key namespace: media/YYYY-MM/<uuid>.<ext>
   */
  async getPresignedUrl(input: PresignRequestDto): Promise<PresignResultDto> {
    if (!this.bucket) throw new Error('S3_MEDIA_BUCKET not configured');

    const { filename, mimeType, sizeBytes, kind } = input;

    if (kind === 'image') {
      if (!ALLOWED_IMAGE.has(mimeType)) {
        throw new Error(`unsupported image mime: ${mimeType}`);
      }
      if (sizeBytes > MAX_IMAGE_BYTES) {
        throw new Error('image exceeds 5 MB limit');
      }
    } else if (kind === 'video') {
      if (!ALLOWED_VIDEO.has(mimeType)) {
        throw new Error(`unsupported video mime: ${mimeType}`);
      }
      if (sizeBytes > MAX_VIDEO_BYTES) {
        throw new Error('video exceeds 50 MB limit');
      }
    } else {
      throw new Error(`invalid kind: ${String(kind)}`);
    }

    const ext = path.extname(filename).toLowerCase() || (kind === 'image' ? '.bin' : '.mp4');
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const key = `media/${ym}/${randomUUID()}${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 300 });
    const publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return { uploadUrl, key, publicUrl, expiresAt };
  }
}

// Keep the unused type import path clean for future refactors.
export type { UploadKind };