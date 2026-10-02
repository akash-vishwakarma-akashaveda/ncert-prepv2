import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, Minus, Plus, X, Loader2, AlertTriangle } from 'lucide-react';
// Legacy build: transpiled for older browsers (pre-2024 iOS Safari, older Android WebViews), which the
// modern build drops. Loaded only when a student opens a chapter, so it costs nothing elsewhere.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/types/src/display/api';
import { API_URL } from '../../services/api/client';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// ncert.nic.in refuses to be framed and has no CORS, so the bytes come through our API's proxy.
export const proxiedPdfUrl = (pdfUrl: string) => `${API_URL}/api/textbooks/pdf?url=${encodeURIComponent(pdfUrl)}`;

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;
// Phones get a sharp page without the memory blow-up of a 3x canvas (iOS kills tabs over ~384 MB).
const MAX_PIXEL_RATIO = 2;

interface PdfViewerProps {
  url: string; // original ncert.nic.in link
  title: string;
  subtitle?: string;
  onClose: () => void;
}

type LoadState = { kind: 'loading'; percent: number } | { kind: 'ready' } | { kind: 'missing' } | { kind: 'error' };

/**
 * Renders the PDF with PDF.js instead of the browser's own viewer, which does not exist inside an
 * iframe on Android Chrome, iOS/iPadOS Safari or in-app browsers (WhatsApp, Instagram). Pages are
 * drawn only near the viewport and released when far away, so long chapters stay light on phones.
 */
export const PdfViewer: React.FC<PdfViewerProps> = ({ url, title, subtitle, onClose }) => {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'loading', percent: 0 });
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null); // page 1 at scale 1
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [current, setCurrent] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const task = pdfjs.getDocument({
      url: proxiedPdfUrl(url),
      // Fetch only the byte ranges the visible pages need instead of the whole 2-10 MB file first.
      disableAutoFetch: true,
      rangeChunkSize: 256 * 1024,
      isEvalSupported: false,
    });
    task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
      if (total) setState((s) => (s.kind === 'loading' ? { kind: 'loading', percent: Math.round((loaded / total) * 100) } : s));
    };
    let cancelled = false;
    task.promise.then(
      async (pdf) => {
        const first = await pdf.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        if (cancelled) return;
        setPageSize({ w: vp.width, h: vp.height });
        setDoc(pdf);
        setState({ kind: 'ready' });
      },
      (err: { status?: number; name?: string }) => {
        if (cancelled) return;
        setState({ kind: err?.status === 404 || err?.name === 'MissingPDFException' ? 'missing' : 'error' });
      },
    );
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [url]);

  // Close on Escape, lock the page behind the viewer, and start keyboard focus inside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit-to-width is zoom 1; the gutter keeps a little page edge visible on phones.
  const gutter = width < 640 ? 16 : 48;
  const scale = pageSize && width ? ((width - gutter) / pageSize.w) * zoom : 0;
  const changeZoom = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 10) / 10)));

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#1E2233]/80 backdrop-blur-xs sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white sm:rounded-[22px] sm:border-[3px] border-[color:var(--card-line)] flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 border-b-2 border-[#E3E5EC] shrink-0">
          <span className="hidden sm:flex w-9 h-9 rounded-xl bg-[#FFE9E2] text-[#C24A2C] items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-[#1E2233] truncate">{title}</p>
            <p className="text-[11px] font-semibold text-[#6B7280] truncate">
              {doc ? `Page ${current} of ${doc.numPages}` : subtitle}
              {doc && subtitle ? <span className="hidden sm:inline"> · {subtitle}</span> : null}
            </p>
          </div>
          {doc && (
            <div className="flex items-center rounded-xl border-2 border-[#E3E5EC] shrink-0" role="group" aria-label="Zoom">
              <button onClick={() => changeZoom(-0.2)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" className="w-8 h-8 flex items-center justify-center text-[#4B5168] disabled:opacity-40 cursor-pointer">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(1)} aria-label="Fit to width" className="px-1 min-w-[44px] text-[11px] font-extrabold text-[#4B5168] tabular-nums cursor-pointer">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => changeZoom(0.2)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className="w-8 h-8 flex items-center justify-center text-[#4B5168] disabled:opacity-40 cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the original PDF in a new tab"
            className="shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-extrabold text-[color:var(--brand)] bg-[color:var(--brand-soft)] rounded-xl"
          >
            <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden md:inline">Open original</span>
          </a>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 flex items-center justify-center text-[#6B7280] hover:text-[#1E2233] bg-[color:var(--page)] border-2 border-[#E3E5EC] rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-auto overscroll-contain bg-[#E9EBF2] [-webkit-overflow-scrolling:touch]">
          {state.kind === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm font-bold text-[#6B7280]" role="status">
              <Loader2 className="w-7 h-7 animate-spin text-[color:var(--brand)]" />
              Opening chapter{state.percent > 0 && state.percent < 100 ? ` · ${state.percent}%` : '…'}
            </div>
          )}
          {(state.kind === 'missing' || state.kind === 'error') && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-sm text-center bg-white rounded-[20px] border-2 border-[#E3E5EC] p-6">
                <AlertTriangle className="w-8 h-8 mx-auto text-[#E0603F]" />
                <p className="mt-3 font-extrabold text-[#1E2233]">
                  {state.kind === 'missing' ? 'This chapter has moved on the NCERT website' : 'We could not open this chapter'}
                </p>
                <p className="mt-1.5 text-sm text-[#6B7280]">
                  {state.kind === 'missing'
                    ? 'NCERT has updated this book, so the old link no longer works. You can find the new edition on the NCERT textbooks page.'
                    : 'The NCERT website did not respond. Check your connection, or open the PDF directly.'}
                </p>
                <a
                  href={state.kind === 'missing' ? 'https://ncert.nic.in/textbook.php' : url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-extrabold text-white bg-[color:var(--brand)] rounded-xl"
                >
                  <ExternalLink className="w-4 h-4" /> {state.kind === 'missing' ? 'NCERT textbooks' : 'Open PDF'}
                </a>
              </div>
            </div>
          )}
          {doc && pageSize && scale > 0 && (
            <div className="py-2 sm:py-4 flex flex-col items-center gap-2 sm:gap-3" style={{ minWidth: pageSize.w * scale + gutter }}>
              {Array.from({ length: doc.numPages }, (_, i) => (
                <PdfPage key={i} doc={doc} pageNumber={i + 1} scale={scale} fallbackSize={pageSize} root={scrollRef} onVisible={setCurrent} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PdfPage: React.FC<{
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  fallbackSize: { w: number; h: number };
  root: React.RefObject<HTMLDivElement | null>;
  onVisible: (page: number) => void;
}> = ({ doc, pageNumber, scale, fallbackSize, root, onVisible }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [size, setSize] = useState(fallbackSize);
  const [drawn, setDrawn] = useState(false);

  // "near" = within ~2 screens: draw it. Leaving that band frees the canvas memory again.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root: root.current, rootMargin: '150% 0px' });
    io.observe(el);
    const centre = new IntersectionObserver(([entry]) => entry.isIntersecting && onVisible(pageNumber), {
      root: root.current,
      rootMargin: '-45% 0px -45% 0px',
    });
    centre.observe(el);
    return () => {
      io.disconnect();
      centre.disconnect();
    };
  }, [root, pageNumber, onVisible]);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    setSize({ w: viewport.width / scale, h: viewport.height / scale });
    const task: RenderTask = page.render({
      canvasContext: canvas.getContext('2d')!,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
    });
    return task;
  }, [doc, pageNumber, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!near) {
      if (canvas) canvas.width = canvas.height = 0; // release the bitmap
      setDrawn(false);
      return;
    }
    let task: RenderTask | null = null;
    let cancelled = false;
    // Debounce so a quick fling past pages, or a run of zoom taps, does not queue throwaway renders.
    const timer = setTimeout(async () => {
      task = await draw();
      if (cancelled) return task?.cancel();
      task?.promise.then(
        () => !cancelled && setDrawn(true),
        () => undefined, // cancelled render
      );
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
    };
  }, [near, draw]);

  return (
    <div
      ref={boxRef}
      className="relative bg-white shadow-[0_2px_10px_rgba(30,34,51,0.12)] shrink-0"
      style={{ width: size.w * scale, height: size.h * scale }}
      aria-label={`Page ${pageNumber}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {!drawn && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#9AA1B4]">
          {near ? <Loader2 className="w-5 h-5 animate-spin" /> : pageNumber}
        </span>
      )}
    </div>
  );
};
