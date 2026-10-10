// apps/api/src/modules/uploads/uploads.controller.ts
// Step 17: multipart upload -> S3 -> returns URL for /cms/media-library metadata save.
// Sub-step 3.1: adds POST /uploads/presign for browser-direct S3 upload.
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Multer } from 'multer';
import type { PresignRequestDto } from '@ecommarce/types';

interface UploadedFileShape {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Post('media')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async uploadMedia(@UploadedFile() file: UploadedFileShape) {
    if (!file) throw new BadRequestException('file required');
    return this.uploads.uploadMedia(file);
  }

  /**
   * Sub-step 3.1 — presigned PUT URL.
   * Client asks; server returns a signed S3 URL valid for 5 minutes.
   * Browser PUTs the file straight to S3 — zero EC2 RAM/CPU cost.
   */
  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Post('presign')
  async presign(@Body() body: PresignRequestDto) {
    if (!body || !body.filename || !body.mimeType || !body.kind) {
      throw new BadRequestException('filename, mimeType, sizeBytes, kind required');
    }
    try {
      return await this.uploads.getPresignedUrl(body);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : String(e));
    }
  }
}

export type { Multer };