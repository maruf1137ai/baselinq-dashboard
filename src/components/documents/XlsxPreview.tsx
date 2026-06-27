import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface XlsxPreviewProps {
  /** Proxy/stream URL (NOT the raw S3 presigned URL) — fetched as ArrayBuffer. */
  url: string;
  className?: string;
}

/** A single parsed cell value. */
type Cell = string | number | boolean | null;
type SheetRow = Cell[];

const MAX_ROWS = 500;
const MAX_COLS = 50;

/**
 * Client-side Excel (.xlsx/.xls) preview.
 *
 * SheetJS is loaded LAZILY via dynamic import (CLAUDE.md: "don't add a new npm
 * dependency without checking bundle impact") so it stays out of the main
 * bundle and only downloads when a spreadsheet is actually previewed.
 *
 * Parsing is fully client-side (sensitive payroll data — no third-party online
 * viewers). We render into a real <table> via sheet_to_json (header:1) — never
 * dangerouslySetInnerHTML — so there's no HTML-injection surface.
 */
export const XlsxPreview: React.FC<XlsxPreviewProps> = ({ url, className }) => {
  const [sheets, setSheets] = useState<{ name: string; rows: SheetRow[] }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setError(true);
      return;
    }

    // Cancel-on-unmount guard — no setState after the component is gone.
    let cancelled = false;
    setLoading(true);
    setError(false);
    setTruncated(false);
    setSheets([]);
    setActiveSheet(0);

    (async () => {
      try {
        // Lazy chunk — keeps SheetJS out of the main bundle.
        const XLSX = await import('xlsx');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });

        let didTruncate = false;
        const parsed = wb.SheetNames.map((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const allRows = XLSX.utils.sheet_to_json<SheetRow>(ws, {
            header: 1,
            defval: '',
            blankrows: false,
          });
          let rows = allRows;
          if (rows.length > MAX_ROWS) {
            rows = rows.slice(0, MAX_ROWS);
            didTruncate = true;
          }
          rows = rows.map((r) => {
            if (r.length > MAX_COLS) {
              didTruncate = true;
              return r.slice(0, MAX_COLS);
            }
            return r;
          });
          return { name: sheetName, rows };
        });

        if (cancelled) return;
        setSheets(parsed);
        setTruncated(didTruncate);
      } catch (e) {
        if (!cancelled) {
          console.error('XLSX preview error:', e);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const current = sheets[activeSheet];

  // Widest row in the active sheet — drives the rendered column count so short
  // rows still align under the full header.
  const colCount = useMemo(() => {
    if (!current) return 0;
    return current.rows.reduce((max, r) => Math.max(max, r.length), 0);
  }, [current]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[420px] ${className ?? ''}`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || sheets.length === 0 || !current) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[420px] gap-3 text-muted-foreground ${className ?? ''}`}>
        <FileText className="w-8 h-8" strokeWidth={1.5} />
        <p className="text-sm">Could not load spreadsheet preview. Use Download to open the file.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-white ${className ?? ''}`}>
      {/* Sheet tabs — only when there's more than one sheet. */}
      {sheets.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-2 py-1.5 shrink-0">
          {sheets.map((s, i) => (
            <button
              key={s.name + i}
              type="button"
              onClick={() => setActiveSheet(i)}
              className={`whitespace-nowrap rounded-md px-3 py-1 text-xs transition-colors ${
                i === activeSheet
                  ? 'bg-background text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {truncated && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-700">
          Large spreadsheet — showing the first {MAX_ROWS} rows / {MAX_COLS} columns. Download for the full file.
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {current.rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-muted/40' : 'even:bg-muted/10'}>
                {/* Row-number gutter */}
                <td className="sticky left-0 z-10 border border-border bg-muted/30 px-2 py-1 text-right text-muted-foreground select-none">
                  {ri + 1}
                </td>
                {Array.from({ length: colCount }).map((_, ci) => {
                  const cell = row[ci];
                  return (
                    <td
                      key={ci}
                      className={`border border-border px-2 py-1 align-top ${
                        ri === 0 ? 'font-medium text-foreground' : 'text-foreground'
                      }`}>
                      {cell === null || cell === undefined ? '' : String(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
