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
        onPageCount?.(pdf.numPages);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      void loadingTask.destroy();
      pdfRef.current = null;
    };
  }, [url, onPageCount]);

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
      const renderTask = pdfPage.render({ canvas, canvasContext: ctx, viewport });
      await renderTask.promise;
    } catch {
      // Render cancelled — next render will take over
    }
  }, []);

  useEffect(() => {
    if (!loading && !error) {
      void renderPage(page);
    }
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Loading PDF…</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ display: loading ? "none" : "block" }}
      />
      {pageCount > 0 && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
          {page} / {pageCount}
        </div>
      )}
    </div>
  );
}
