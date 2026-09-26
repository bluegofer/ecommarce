'use client';

/**
 * Sub-step 3.5 — Product media uploader.
 *
 * Browser-side compression + direct-to-S3. Zero EC2 RAM.
 *  - Max 8 images (each <= 5 MB): resized to 3 WebP sizes in the browser
 *  - Max 1 video  (each <= 50 MB): poster extracted from first frame
 *  - Click-to-set main image (first slot)
 */

import { useRef, useState } from 'react';
import { UploadCloud, X, Image as ImageIcon, Video as VideoIcon, Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresignedUpload } from '@/lib/presigned-upload';
import { resizeImageToWebp, extractVideoPoster } from '@/lib/image-pipeline';

export interface MediaItem {
  url: string;
  filename: string;
  kind: 'image' | 'video';
  altText: string;
  // For exactOptionalPropertyTypes: true — presence of key is explicit,
  // value can be a string (poster URL) or null (no poster available).
  posterUrl: string | null;
}

interface MediaUploaderProps {
  value: MediaItem[];
  onChange: (next: MediaItem[]) => void;
  maxImages?: number;
  maxVideos?: number;
  disabled?: boolean;
}

const MAX_IMAGES_DEFAULT = 8;
const MAX_VIDEOS_DEFAULT = 1;

export function MediaUploader({
  value,
  onChange,
  maxImages = MAX_IMAGES_DEFAULT,
  maxVideos = MAX_VIDEOS_DEFAULT,
  disabled = false,
}: MediaUploaderProps) {
  const { uploadBlob, progress } = usePresignedUpload();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement | null>(null);
  const videoInput = useRef<HTMLInputElement | null>(null);

  const images = value.filter((m) => m.kind === 'image');
  const videos = value.filter((m) => m.kind === 'video');
  const imageSlotsLeft = Math.max(0, maxImages - images.length);
  const videoSlotsLeft = Math.max(0, maxVideos - videos.length);

  async function handleImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const arr = Array.from(files).slice(0, imageSlotsLeft);
      const created: MediaItem[] = [];
      for (let i = 0; i < arr.length; i++) {
        const f = arr[i];
        if (!f) continue;
        if (!f.type.startsWith('image/')) throw new Error(`Not an image: ${f.name}`);
        if (f.size > 5 * 1024 * 1024) throw new Error(`Image > 5 MB: ${f.name}`);

        const resized = await resizeImageToWebp(f);
        const trackId = `img-${Date.now()}-${i}`;
        const url = await uploadBlob(
          resized.large,
          'image/webp',
          f.name.replace(/\.[^.]+$/, '.webp'),
          'image',
          trackId,
        );
        created.push({
          url,
          filename: f.name,
          kind: 'image',
          altText: f.name.replace(/\.[^.]+$/, ''),
          posterUrl: null,
        });
      }
      onChange([...value, ...created]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (imageInput.current) imageInput.current.value = '';
    }
  }

  async function handleVideo(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (videoSlotsLeft === 0) {
      setError('Only one video per product');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const f = files[0];
      if (!f) throw new Error('No file selected');
      if (!f.type.startsWith('video/')) throw new Error(`Not a video: ${f.name}`);
      if (f.size > 50 * 1024 * 1024) throw new Error(`Video > 50 MB: ${f.name}`);

      const trackId = `vid-${Date.now()}`;
      const url = await uploadBlob(f, f.type, f.name, 'video', trackId);

      let posterUrl: string | null = null;
      try {
        const posterBlob = await extractVideoPoster(f);
        posterUrl = await uploadBlob(
          posterBlob,
          'image/webp',
          f.name.replace(/\.[^.]+$/, '-poster.webp'),
          'image',
          `${trackId}-poster`,
        );
      } catch {
        posterUrl = null;
      }

      onChange([
        ...value,
        {
          url,
          filename: f.name,
          kind: 'video',
          altText: f.name.replace(/\.[^.]+$/, ''),
          posterUrl,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (videoInput.current) videoInput.current.value = '';
    }
  }

  function removeAt(idx: number) {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  }

  function setMain(idx: number) {
    if (idx === 0) return;
    const next = [...value];
    const removed = next.splice(idx, 1);
    const item = removed[0];
    if (!item) return;
    next.unshift(item);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Image grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[12.5px] font-medium text-slate-700">
            Images ({images.length}/{maxImages})
          </label>
          {imageSlotsLeft > 0 && (
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              disabled={busy || disabled}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Add images
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((m, i) => (
            <div
              key={`${m.url}-${i}`}
              className={cn(
                'group relative aspect-square rounded border bg-slate-50 overflow-hidden',
                i === 0 && m.kind === 'image' ? 'border-sky-500 ring-2 ring-sky-200' : 'border-border',
              )}
            >
              {m.kind === 'image' ? (
                <img src={m.url} alt={m.altText} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center bg-slate-900 text-white relative">
                  {m.posterUrl ? (
                    <img src={m.posterUrl} alt="" className="w-full h-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 grid place-items-center bg-slate-900/40">
                    <VideoIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}

              {i === 0 && m.kind === 'image' && (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-600 text-white text-[10px] font-semibold">
                  <Star className="w-2.5 h-2.5" /> Main
                </span>
              )}

              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end gap-1 p-1.5">
                {i !== 0 && m.kind === 'image' && (
                  <button
                    type="button"
                    onClick={() => setMain(i)}
                    className="p-1 rounded bg-white text-sky-700 hover:bg-sky-50"
                    title="Set as main image"
                  >
                    <Star className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="p-1 rounded bg-danger-600 text-white hover:bg-danger-700"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {imageSlotsLeft > 0 && (
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              disabled={busy || disabled}
              className="aspect-square rounded border-2 border-dashed border-sky-300 bg-sky-50 grid place-items-center text-sky-600 hover:bg-sky-100 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
              <span className="text-[11px] font-medium mt-1">Add image</span>
            </button>
          )}

          {Array.from({ length: Math.max(0, Math.min(3, imageSlotsLeft - 1)) }).map((_, i) => (
            <div
              key={`ph-${i}`}
              className="aspect-square rounded border border-dashed border-border bg-slate-50 grid place-items-center text-slate-300"
            >
              <ImageIcon className="w-6 h-6" />
            </div>
          ))}
        </div>

        <input
          ref={imageInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={busy || disabled}
          className="sr-only"
          onChange={(e) => void handleImages(e.target.files)}
        />
      </div>

      {/* Video */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[12.5px] font-medium text-slate-700">
            Video ({videos.length}/{maxVideos})
          </label>
          {videoSlotsLeft > 0 && (
            <button
              type="button"
              onClick={() => videoInput.current?.click()}
              disabled={busy || disabled}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
            >
              <VideoIcon className="w-3.5 h-3.5" />
              Add video (MP4, &lt;= 50 MB)
            </button>
          )}
        </div>
        <input
          ref={videoInput}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          disabled={busy || disabled}
          className="sr-only"
          onChange={(e) => void handleVideo(e.target.files)}
        />
      </div>

      {/* Progress + error */}
      {Object.entries(progress).some(([, pct]) => pct < 100) && (
        <div className="space-y-1">
          {Object.entries(progress)
            .filter(([, pct]) => pct < 100)
            .map(([id, pct]) => (
              <div key={id} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 tabular-nums">{pct}%</span>
              </div>
            ))}
        </div>
      )}

      {error && (
        <p className="text-[12.5px] text-danger-700 bg-danger-50 border border-danger-200 rounded p-2">
          {error}
        </p>
      )}
    </div>
  );
}
