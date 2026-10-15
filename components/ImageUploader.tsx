"use client";

import { useCallback, useId, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  previewUrl: string | null;
  onImageReady: (payload: {
    base64: string;
    mimeType: string;
    previewUrl: string;
  }) => void;
  onClear: () => void;
  disabled?: boolean;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read error"));
    reader.readAsDataURL(file);
  });
}

export function ImageUploader({
  previewUrl,
  onImageReady,
  onClear,
  disabled = false,
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const base64 = await fileToBase64(file);
      const objectUrl = URL.createObjectURL(file);
      onImageReady({
        base64,
        mimeType: file.type,
        previewUrl: objectUrl,
      });
    },
    [onImageReady],
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) void acceptFile(file);
        }}
        className={cn(
          "relative flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition",
          dragging
            ? "border-cyan-400 bg-cyan-400/10"
            : "border-slate-700 bg-[#0B1220]",
          disabled && "opacity-60",
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Prescription preview"
            className="max-h-56 w-auto rounded-md border border-slate-700 object-contain shadow-lg"
          />
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-cyan-400" />
            <p className="text-center text-sm font-medium text-slate-100">
              Drop prescription image here
            </p>
            <p className="mt-1 text-center text-xs text-slate-400">
              PNG, JPEG, or WebP
            </p>
          </>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void acceptFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" />
          Select Image
        </button>
        {previewUrl && (
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear Image
          </button>
        )}
      </div>
    </div>
  );
}
