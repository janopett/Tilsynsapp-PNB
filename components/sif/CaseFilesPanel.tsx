"use client";

import { useEffect, useState, useCallback } from "react";
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

interface Props {
  caseNumber: string;
}

export default function CaseFilesPanel({ caseNumber }: Props) {
  const [files, setFiles] = useState<SifFileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sif/case-files?caseNumber=${encodeURIComponent(caseNumber)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFiles(data.files ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [caseNumber]);

  const images = files.filter(isImage);
  const others = files.filter((f) => !isImage(f));

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setLightboxIdx((i) => (i !== null ? Math.min(i + 1, images.length - 1) : null));
      else if (e.key === "ArrowLeft")
        setLightboxIdx((i) => (i !== null ? Math.max(i - 1, 0) : null));
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, images.length, closeLightbox]);

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-400 dark:text-slate-500 text-sm">
        Laster filer fra saken…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-red-500 dark:text-red-400 text-sm">
        Kunne ikke hente filer: {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 dark:text-slate-500 text-sm">
        Ingen filer registrert på saken i PNB.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Image carousel grid */}
      {images.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Bilder ({images.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {images.map((file, idx) => (
              <button
                key={file.Recno ?? idx}
                onClick={() => setLightboxIdx(idx)}
                className="aspect-square bg-gray-100 dark:bg-slate-700 rounded-xl overflow-hidden relative group focus:outline-none focus:ring-2 focus:ring-brand-500"
                title={file.Title ?? undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/sif/file-proxy?url=${encodeURIComponent(file.URL ?? "")}&format=${file.Format ?? ""}&title=${encodeURIComponent(file.Title ?? "fil")}`}
                  alt={file.Title ?? "Bilde"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 rounded-xl" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Other files list */}
      {others.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Dokumenter ({others.length})
          </h3>
          <div className="space-y-2">
            {others.map((file, idx) => (
              <a
                key={file.Recno ?? idx}
                href={`/api/sif/file-proxy?url=${encodeURIComponent(file.URL ?? "")}&format=${file.Format ?? ""}&title=${encodeURIComponent(file.Title ?? "fil")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                <span className="text-2xl leading-none flex-shrink-0">
                  {fileIcon(file.Format)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                    {file.Title ?? "Ukjent fil"}
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
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition"
            onClick={closeLightbox}
            aria-label="Lukk"
          >
            ×
          </button>

          {/* Prev */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-3xl w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((i) => (i !== null ? i - 1 : null));
              }}
              aria-label="Forrige"
            >
              ‹
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={images[lightboxIdx].Recno}
            src={`/api/sif/file-proxy?url=${encodeURIComponent(images[lightboxIdx].URL ?? "")}&format=${images[lightboxIdx].Format ?? ""}&title=${encodeURIComponent(images[lightboxIdx].Title ?? "fil")}`}
            alt={images[lightboxIdx].Title ?? "Bilde"}
            className="max-w-[88vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightboxIdx < images.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-3xl w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((i) => (i !== null ? i + 1 : null));
              }}
              aria-label="Neste"
            >
              ›
            </button>
          )}

          {/* Caption */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm text-center pointer-events-none">
            {lightboxIdx + 1} / {images.length}
            {images[lightboxIdx].Title && (
              <span className="ml-2 text-white/50">· {images[lightboxIdx].Title}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
