"use client";

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import type { SifFileMetadata } from "@/lib/sif/types";
import type { CaseFileGroup } from "@/app/api/sif/case-files/route";
import { useLanguage } from "@/lib/i18n";

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

interface Props {
  caseNumber: string;
}

export default function CaseFilesPanel({ caseNumber }: Props) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<CaseFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

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
  }, [caseNumber]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (!lightbox) return;
    const { groupImages, indexInGroup } = lightbox;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && indexInGroup < groupImages.length - 1)
        setLightbox({ file: groupImages[indexInGroup + 1], groupImages, indexInGroup: indexInGroup + 1 });
      else if (e.key === "ArrowLeft" && indexInGroup > 0)
        setLightbox({ file: groupImages[indexInGroup - 1], groupImages, indexInGroup: indexInGroup - 1 });
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox]);

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-400 dark:text-slate-500 text-sm">
        {t.caseFiles.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-red-500 dark:text-red-400 text-sm">
        {t.caseFiles.error}{error}
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
                  <span className="normal-case font-normal text-gray-400 dark:text-slate-500">— {t.caseFiles.linkedCase}</span>
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proxyUrl(file)!}
                        alt={file.Title ?? t.caseFiles.unknownFile}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 rounded-xl" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {others.length > 0 && (
              <div className="space-y-2">
                {others.map((file, idx) => (
                  <a
                    key={file.Recno ?? idx}
                    href={proxyUrl(file)!}
                    download={file.Title ? `${file.Title}${file.Format ? `.${file.Format.toLowerCase()}` : ""}` : undefined}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
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
                setLightbox({ file: groupImages[indexInGroup - 1], groupImages, indexInGroup: indexInGroup - 1 });
              }}
              aria-label={t.caseFiles.previous}
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
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
                setLightbox({ file: groupImages[indexInGroup + 1], groupImages, indexInGroup: indexInGroup + 1 });
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
    </div>
  );
}
