"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useDropzone, FileRejection, Accept } from "react-dropzone";
import { cn } from "@/lib/utils";

type DropzoneContextValue = {
  files: File[];
  removeFile: (index: number) => void;
};

const DropzoneContext = createContext<DropzoneContextValue | null>(null);

function useDropzoneContext(): DropzoneContextValue {
  const ctx = useContext(DropzoneContext);
  if (!ctx) {
    throw new Error("DropzoneContent must be used within a Dropzone");
  }
  return ctx;
}

export type DropzoneProps = {
  className?: string;
  accept?: Accept;
  maxFiles?: number;
  src?: File[] | undefined;
  onDrop?: (files: File[]) => void;
  onError?: (error: Error | string) => void;
  children?: React.ReactNode;
};

export function Dropzone({
  className,
  accept,
  maxFiles = 10,
  src,
  onDrop,
  onError,
  children,
}: DropzoneProps) {
  const [internalFiles, setInternalFiles] = useState<File[]>([]);

  const files = src ?? internalFiles;

  const handleDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const first = rejections[0];
        const message = first.errors?.[0]?.message ?? "File rejected";
        onError?.(message);
      }
      const next = accepted.slice(0, maxFiles);
      if (!src) setInternalFiles(next);
      onDrop?.(next);
    },
    [maxFiles, onDrop, onError, src]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles,
    onDrop: handleDrop,
    multiple: maxFiles > 1,
  });

  const removeFile = useCallback(
    (index: number) => {
      if (src) return; // controlled by parent
      setInternalFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [src]
  );

  const contextValue = useMemo<DropzoneContextValue>(
    () => ({ files, removeFile }),
    [files, removeFile]
  );

  return (
    <DropzoneContext.Provider value={contextValue}>
      <div
        {...getRootProps()}
        className={cn(
          "rounded-xl transition-colors cursor-pointer focus:outline-none",
          isDragActive
            ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/10"
            : undefined,
          className
        )}
      >
        <input {...getInputProps()} />
        {children}
      </div>
    </DropzoneContext.Provider>
  );
}

export function DropzoneEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-gray-500 dark:text-gray-400">
      <div className="text-sm">
        Drag and drop files here, or click to browse
      </div>
      <div className="text-[11px]">PDF and DOCX supported</div>
    </div>
  );
}

export function DropzoneContent() {
  const { files, removeFile } = useDropzoneContext();

  if (!files || files.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-2">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
        >
          <div className="min-w-0 truncate">
            {file.name}{" "}
            <span className="text-xs text-gray-400">
              ({Math.round(file.size / 1024)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              removeFile(index);
            }}
            className="ml-3 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export default Dropzone;
