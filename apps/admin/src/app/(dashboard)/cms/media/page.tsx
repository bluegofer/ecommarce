'use client';

import { useState } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2 } from 'lucide-react';
import { PageHeader, Modal, useToast } from '@/components/ui';
import { useQuery, useMutation, useUpload } from '@/lib/hooks';

interface Media {
  id: string;
  url: string;
  filename: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
}

interface UploadResult {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export default function MediaLibraryPage() {
  const toast = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const { data, loading, error, refetch } = useQuery<Media[]>('/api/v1/cms/media-library');

  const uploadMutation = useUpload<UploadResult>('/api/v1/uploads/media');
  const saveMetadataMutation = useMutation<
    { url: string; filename: string; mimeType: string; sizeBytes: number },
    unknown
  >('post', '/api/v1/cms/media-library');
  const deleteMutation = useMutation<string, unknown>(
    'delete',
    (input) => `/api/v1/cms/media-library/${(input as unknown as string)}`,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="CMS · Media library"
        subtitle="Central repository · auto-WebP conversion · alt-text formula enforced on save"
        actions={
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            <UploadCloud className="w-4 h-4" /> Upload
          </button>
        }
      />

      <div className="card p-5">
        {loading && !data ? (
          <div className="p-10 text-center text-slate-400">Loading media…</div>
        ) : error ? (
          <div className="p-10 text-center text-danger-700">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            No media yet. Upload images to use across products, banners, and CMS pages.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {data.map((m) => (
              <div key={m.id} className="group relative aspect-square rounded border border-border bg-slate-50 overflow-hidden">
                <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <p className="text-[11px] text-white font-mono truncate">{m.filename}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-white/80">
                      {m.width && m.height ? `${m.width}×${m.height}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Delete this media?')) return;
                        await deleteMutation.mutate(m.id);
                        toast.success('Deleted');
                        void refetch();
                      }}
                      className="p-1.5 rounded bg-danger-600 text-white hover:bg-danger-700"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={uploadOpen}
        onClose={() => {
          if (uploadMutation.loading) return;
          setUploadOpen(false);
          setFile(null);
        }}
        title="Upload media"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                if (uploadMutation.loading) return;
                setUploadOpen(false);
                setFile(null);
              }}
              disabled={uploadMutation.loading}
              className="h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!file || uploadMutation.loading}
              onClick={async () => {
                if (!file) return;
                try {
                  // Step 1: file → S3 via /uploads/media
                  const uploaded = await uploadMutation.upload(file);
                  // Step 2: metadata → DB via /cms/media-library
                  await saveMetadataMutation.mutate({
                    url: uploaded.url,
                    filename: uploaded.filename,
                    mimeType: uploaded.mimeType,
                    sizeBytes: uploaded.sizeBytes,
                  });
                  toast.success('Uploaded');
                  setUploadOpen(false);
                  setFile(null);
                  void refetch();
                } catch (e) {
                  toast.error('Upload failed', e instanceof Error ? e.message : 'Unknown');
                }
              }}
              className="h-9 px-3 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {uploadMutation.loading ? 'Uploading…' : 'Upload'}
            </button>
          </>
        }
      >
        <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-sky-400">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={uploadMutation.loading}
          />
          <UploadCloud className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-700">{file ? file.name : 'Click to select an image'}</p>
        </label>
      </Modal>
    </div>
  );
}