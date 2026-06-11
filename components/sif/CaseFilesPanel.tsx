"use client";

import { useCallback, useEffect, useState } from "react";
import type { CaseFileGroup } from "@/app/api/sif/case-files/route";
import { authFetch } from "@/lib/auth-fetch";
import { useLanguage } from "@/lib/i18n";
import type { SifFileMetadata } from "@/lib/sif/types";

const IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "svg"]);

function isImage(file: SifFileMetadata): boolean {
  return IMAGE_FORMATS.has(file.Format?.toLowerCase() ?? "");
}

function fileIcon(format: string | undefined): string {
  const f = format?.toLowerCase() ?? "";
  if (IMAGE_FORMATS.has(f)) return "🖼️";
  if (f === "pdf") return "📄";
  if (f === "doc" || f === "docx") return "📝";
  if (f === "xls" || f === "xlsx") return "📊";
  if (f === "txt") return "📃";
  return "📎";
}

function formatSize(bytes: number | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function proxyUrl(file: SifFileMetadata): string | null {
  if (!file.Recno) return null;
  return `/api/sif/file-proxy?recno=${file.Recno}&format=${encodeURIComponent(file.Format ?? "")}&title=${encodeURIComponent(file.Title ?? "fil")}`;
}

interface LightboxImage {
  file: SifFileMetadata;
  groupImages: SifFileMetadata[];
  indexInGroup: number;
}

interface PdfViewer {
  file: SifFileMetadata;
  blobUrl: string;
}

interface Props {
  caseNumber: string;
}

export default function CaseFilesPanel({ caseNumber }: Props) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<CaseFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);
  const [pdfViewer, setPdfViewer] = useState<PdfViewer | null>(null);
  const [pdfLoadingRecno, setPdfLoadingRecno] = useState<number | null>(null);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    authFetch(`/api/sif/case-files?caseNumber=${encodeURIComponent(caseNumber)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGroups(data.groups ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [caseNumber, fetchKey]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const openPdf = useCallback(async (file: SifFileMetadata) => {
    if (!file.Recno) return;
    setPdfLoadingRecno(file.Recno);
    try {
      const res = await authFetch(proxyUrl(file)!);
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: "application/pdf" });
      setPdfViewer({ file, blobUrl: URL.createObjectURL(blob) });
    } finally {
      setPdfLoadingRecno(null);
    }
  }, []);

  const closePdfViewer = useCallback(() => {
    setPdfViewer((prev) => {
      if (prev) URL.revokeObjectURL(prev.blobUrl);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const { groupImages, indexInGroup } = lightbox;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && indexInGroup < groupImages.length - 1)
        setLightbox({
          file: groupImages[indexInGroup + 1],
          groupImages,
          indexInGroup: indexInGroup + 1,
        });
      else if (e.key === "ArrowLeft" && indexInGroup > 0)
        setLightbox({
          file: groupImages[indexInGroup - 1],
          groupImages,
          indexInGroup: indexInGroup - 1,
        });
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox]);

  useEffect(() => {
    if (!pdfViewer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePdfViewer(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdfViewer, closePdfViewer]);

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-400 dark:text-slate-500 text-sm">
        {t.caseFiles.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-sm space-y-3">
        <p className="text-red-500 dark:text-red-400">{t.caseFiles.error(error)}</p>
        <button
          onClick={refresh}
          className="text-xs text-gray-500 dark:text-slate-400 underline hover:text-gray-700 dark:hover:text-slate-200"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 dark:text-slate-500 text-sm">
        {t.caseFiles.empty}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={refresh}
          className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 flex items-center gap-1 transition"
          title="Hent filer på nytt fra PNB"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Oppdater
        </button>
      </div>
      {groups.map((group) => {
        const images = group.files.filter(isImage).filter((f) => !!f.Recno);
        const others = group.files.filter((f) => !isImage(f)).filter((f) => !!f.Recno);
        const isReferredCase = group.caseNumber !== caseNumber;

        return (
          <section key={group.caseNumber}>
            {groups.length > 1 && (
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>{isReferredCase ? "📁" : "📋"}</span>
                <span>{group.caseNumber}</span>
                {isReferredCase && (
                  <span className="normal-case font-normal text-gray-400 dark:text-slate-500">
                    — {t.caseFiles.linkedCase}
                  </span>
                )}
              </h3>
            )}

            {images.length > 0 && (
              <div className="mb-4">
                {groups.length === 1 && (
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    {t.caseFiles.images(images.length)}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {images.map((file, idx) => (
                    <button
                      key={file.Recno ?? idx}
                      onClick={() => setLightbox({ file, groupImages: images, indexInGroup: idx })}
                      className="aspect-square bg-gray-100 dark:bg-slate-700 rounded-xl overflow-hidden relative group focus:outline-none focus:ring-2 focus:ring-brand-500"
                      title={file.Title ?? undefined}
                    >
                      <img
                        src={proxyUrl(file)!}
                        alt={file.Title ?? t.caseFiles.unknownFile}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = "none";
                          const placeholder = el.nextElementSibling as HTMLElement | null;
                          if (placeholder) placeholder.style.display = "flex";
                        }}
                      />
                      <div
                        style={{ display: "none" }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-slate-500"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <span className="text-xs px-2 text-center leading-tight">
                          {file.Title ?? t.caseFiles.unknownFile}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 rounded-xl" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {others.length > 0 && (
              <div className="space-y-2">
                {others.map((file, idx) => {
                  const isPdf = file.Format?.toLowerCase() === "pdf";
                  const isLoading = pdfLoadingRecno === file.Recno;
                  const rowClass =
                    "flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition w-full text-left";
                  const meta = (
                    <>
                      <span className="text-2xl leading-none flex-shrink-0">
                        {fileIcon(file.Format)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                          {file.Title ?? t.caseFiles.unknownFile}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                          {[
                            file.Format?.toUpperCase(),
                            formatSize(file.Size),
                            file.StatusDescription,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </>
                  );

                  if (isPdf) {
                    return (
                      <button
                        key={file.Recno ?? idx}
                        onClick={() => openPdf(file)}
                        disabled={isLoading}
                        className={rowClass}
                      >
                        {meta}
                        {isLoading ? (
                          <svg
                            className="w-4 h-4 text-gray-400 flex-shrink-0 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-gray-400 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  }

                  return (
                    <a
                      key={file.Recno ?? idx}
                      href={proxyUrl(file)!}
                      download={
                        file.Title
                          ? `${file.Title}${file.Format ? `.${file.Format.toLowerCase()}` : ""}`
                          : undefined
                      }
                      className={rowClass}
                    >
                      {meta}
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition"
            onClick={closeLightbox}
            aria-label={t.caseFiles.close}
          >
            ×
          </button>

          {lightbox.indexInGroup > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-3xl w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition"
              onClick={(e) => {
                e.stopPropagation();
                const { groupImages, indexInGroup } = lightbox;
                setLightbox({
                  file: groupImages[indexInGroup - 1],
                  groupImages,
                  indexInGroup: indexInGroup - 1,
                });
              }}
              aria-label={t.caseFiles.previous}
            >
              ‹
            </button>
          )}

          <img
            key={lightbox.file.Recno}
            src={proxyUrl(lightbox.file)!}
            alt={lightbox.file.Title ?? t.caseFiles.unknownFile}
            className="max-w-[88vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {lightbox.indexInGroup < lightbox.groupImages.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-3xl w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition"
              onClick={(e) => {
                e.stopPropagation();
                const { groupImages, indexInGroup } = lightbox;
                setLightbox({
                  file: groupImages[indexInGroup + 1],
                  groupImages,
                  indexInGroup: indexInGroup + 1,
                });
              }}
              aria-label={t.caseFiles.next}
            >
              ›
            </button>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm text-center pointer-events-none">
            {lightbox.indexInGroup + 1} / {lightbox.groupImages.length}
            {lightbox.file.Title && (
              <span className="ml-2 text-white/50">· {lightbox.file.Title}</span>
            )}
          </div>
        </div>
      )}

      {pdfViewer && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between gap-4 px-4 py-2 bg-gray-900/95 border-b border-white/10 flex-shrink-0">
            <span className="text-white/80 text-sm truncate">{pdfViewer.file.Title}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={pdfViewer.blobUrl}
                download={
                  pdfViewer.file.Title
                    ? `${pdfViewer.file.Title}.pdf`
                    : "dokument.pdf"
                }
                className="text-white/70 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition"
              >
                Last ned
              </a>
              <button
                onClick={closePdfViewer}
                className="text-white/80 hover:text-white text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition"
                aria-label={t.caseFiles.close}
              >
                ×
              </button>
            </div>
          </div>
          <iframe
            src={pdfViewer.blobUrl}
            className="flex-1 w-full border-0"
            title={pdfViewer.file.Title ?? "PDF"}
          />
        </div>
      )}
    </div>
  );
}
