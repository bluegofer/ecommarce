// apps/api/src/modules/catalog/media/media.controller.ts
// Step 3 STUB: local disk only. Step 12 swaps to S3.
import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('catalog')
@Controller('uploads')
export class MediaController {
  private readonly uploadsDir = path.resolve(process.cwd(), 'uploads');

  @Public()
  @Get(':filename')
  serve(@Param('filename') filename: string, @Res() res: Response) {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new NotFoundException();
    }
    const full = path.join(this.uploadsDir, filename);
    if (!fs.existsSync(full)) throw new NotFoundException('file not found');
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.webp' ? 'image/webp'
      : ext === '.svg' ? 'image/svg+xml'
      : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    fs.createReadStream(full).pipe(res);
  }
}