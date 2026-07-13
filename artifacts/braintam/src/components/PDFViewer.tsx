import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFViewerProps {
  url: string;
  page: number;
  onPageCount?: (total: number) => void;
  className?: string;
}

export default function PDFViewer({ url, page, onPageCount, className = "" }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  // Store callback in a ref so it never triggers PDF reload (caller may pass inline fn)
  const onPageCountRef = useRef(onPageCount);
  useEffect(() => { onPageCountRef.current = onPageCount; }, [onPageCount]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({ url });

    (async () => {
      try {
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        onPageCountRef.current?.(pdf.numPages);
        setLoading(false);
      } catch (e) {
        if (cancelled) return; // AbortError from destroy() on unmount — suppress
        const msg = e instanceof Error ? e.message : String(e);
        // Suppress generic abort errors
        if (msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("signal")) return;
        setError(msg || "Failed to load PDF");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {}); // prevent unhandled AbortError
      pdfRef.current = null;
    };
  }, [url]); // intentionally omit onPageCount — use stable ref instead

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    const clampedPage = Math.max(1, Math.min(pageNum, pdf.numPages));
    try {
      const pdfPage = await pdf.getPage(clampedPage);
      const viewport = pdfPage.getViewport({ scale: 2 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await pdfPage.render({ canvas, canvasContext: ctx, viewport }).promise;
    } catch {
      // Render cancelled on slide change — next render takes over
    }
  }, []);

  useEffect(() => {
    if (!loading && !error) void renderPage(page);
  }, [page, loading, error, renderPage]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-red-400 text-sm p-4 ${className}`}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 flex items-center justify-center overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950 z-10">
          <img src="/braintam-logo.png" alt="Braintam" className="w-28 opacity-75" />
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#FF6B1A", borderTopColor: "transparent" }} />
            <span className="text-sm text-gray-400">Loading slides…</span>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ opacity: loading ? 0 : 1, transition: "opacity 0.25s" }}
      />
      {!loading && pageCount > 0 && (
        <div className="absolute bottom-2 right-10 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full pointer-events-none">
          {page} / {pageCount}
        </div>
      )}
    </div>
  );
}
