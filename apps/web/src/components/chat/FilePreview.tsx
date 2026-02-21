"use client";

import { IconClose } from "@propian/shared/icons";

export interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  uploadedUrl?: string;
  error?: string;
}

interface FilePreviewProps {
  files: PendingFile[];
  onRemove: (id: string) => void;
}

export function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="pt-file-preview-strip">
      {files.map((pf) => {
        const isImage = pf.file.type.startsWith("image/");

        return (
          <div
            key={pf.id}
            className={`pt-file-preview-card ${pf.status === "error" ? "error" : ""}`}
          >
            {isImage ? (
              <img
                src={pf.previewUrl}
                alt={pf.file.name}
                className="pt-file-preview-thumb"
              />
            ) : (
              <div className="pt-file-preview-pdf">
                <span>{pf.file.name.split(".").pop()?.toUpperCase() ?? "FILE"}</span>
              </div>
            )}

            {/* Upload overlay */}
            {pf.status === "uploading" && (
              <div className="pt-file-preview-uploading">
                <div className="pt-file-preview-spinner" />
              </div>
            )}

            {/* Error overlay */}
            {pf.status === "error" && (
              <div className="pt-file-preview-uploading" style={{ background: "rgba(239,68,68,0.2)" }}>
                <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>!</span>
              </div>
            )}

            {/* Remove button */}
            <button
              className="pt-file-preview-remove"
              onClick={() => onRemove(pf.id)}
              type="button"
            >
              <IconClose size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
