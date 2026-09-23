// apps/api/src/modules/uploads/uploads.service.ts
// Step 17: S3 media upload (TDD §6.1 media pipeline + §6.4 media library).
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

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

    // Public URL — bucket policy on media/ prefix allows anonymous GetObject.
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      url,
      key,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }
}