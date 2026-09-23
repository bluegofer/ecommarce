// apps/api/src/modules/uploads/uploads.controller.ts
// Step 17: multipart upload → S3 → returns URL for /cms/media-library metadata save.
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { Roles } from '../../common/decorators/roles.decorator';

// Explicit import so `Express.Multer.File` resolves without relying on
// global namespace merging (requires "multer" in tsconfig types array).
import type { Multer } from 'multer';

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
}

// Silence unused-import lint on Multer (kept for future typing needs).
export type { Multer };