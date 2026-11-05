'use client';

import { useState } from 'react';
import { UploadCloud, Download, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader, useToast, StatusChip } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

interface ImportRow {
  row: number;
  status: 'ok' | 'error';
  message?: string;
  sku?: string;
}

interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  rows: ImportRow[];
}

export default function CatalogImportPage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onUpload() {
    if (!file) {
      toast.error('Select a CSV first');
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/catalog/import-export/import`,
        { method: 'POST', body: formData, credentials: 'include' },
      );
      if (!res.ok) {
        const body = await res.text();
        throw new ApiError(res.status, 'IMPORT_FAILED', body || 'Import failed');
      }
      const data = (await res.json()) as ImportResult;
      setResult(data);
      toast.success(
        `Import done: ${data.successCount} ok, ${data.errorCount} errors`,
      );
    } catch (e) {
      toast.error('Import failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      setUploading(false);
    }
  }

  async function onExport() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/catalog/import-export/export`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalog-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e) {
      toast.error('Export failed', e instanceof Error ? e.message : 'Unknown');
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title="Catalog import / export"
        subtitle="Bulk-upload products and stock with per-row error reports"
        actions={
          <button
            type="button"
            onClick={() => void onExport()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 grid place-items-center rounded-lg bg-sky-50 text-sky-600 shrink-0">
            <UploadCloud className="w-6 h-6" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">Upload products CSV</h3>
            <p className="text-[13px] text-slate-500 mt-1">
              Columns: sku, titleEn, titleBn, categorySlug, brand, pricePoisha, stock, attribute:size, attribute:color, …
            </p>
          </div>
        </div>

        <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/30 transition-colors">
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-700">
            {file ? file.name : 'Click to select a CSV file'}
          </p>
          {file && (
            <p className="text-[12px] text-slate-400 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setResult(null);
            }}
            className="h-10 px-4 rounded border border-border bg-white text-sm font-medium text-slate-700"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => void onUpload()}
            disabled={!file || uploading}
            className="h-10 px-4 rounded bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload & import'}
          </button>
        </div>
      </div>

      {result && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <h3 className="font-semibold text-slate-900">Import report</h3>
            <StatusChip
              label={`${result.successCount} succeeded`}
              tone="success"
            />
            {result.errorCount > 0 && (
              <StatusChip
                label={`${result.errorCount} errors`}
                tone="danger"
              />
            )}
            <span className="ml-auto text-[12.5px] text-slate-500">
              {result.totalRows} rows total
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-border sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">Row</th>
                  <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">SKU</th>
                  <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-[12px] font-semibold text-slate-500 uppercase">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.rows.map((r) => (
                  <tr key={r.row}>
                    <td className="px-4 py-2 tabular-nums text-slate-600">{r.row}</td>
                    <td className="px-4 py-2 font-mono text-[12.5px] text-slate-700">{r.sku ?? '—'}</td>
                    <td className="px-4 py-2">
                      {r.status === 'ok' ? (
                        <span className="inline-flex items-center gap-1 text-success-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-danger-700">
                          <AlertTriangle className="w-3.5 h-3.5" /> Error
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-[12.5px]">{r.message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}