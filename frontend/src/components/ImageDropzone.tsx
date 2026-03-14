/**
 * components/ImageDropzone.tsx
 *
 * Drag-and-drop file upload area. Accepts images (and optionally videos).
 * Shows a preview thumbnail after selection.
 * Built on react-dropzone.
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: Record<string, string[]>;
  maxSize?: number; // bytes
  label?: string;
}

export default function ImageDropzone({
  file,
  onFileChange,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] },
  maxSize = 50 * 1024 * 1024,
  label = 'NFT Image',
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFileChange(accepted[0]);
    },
    [onFileChange]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: 1,
  });

  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-mono uppercase tracking-widest text-dim">
        {label}
      </label>

      {file ? (
        // Preview state
        <div className="relative group rounded border border-border overflow-hidden bg-surface-2">
          <img
            src={preview!}
            alt="NFT preview"
            className="w-full h-48 object-cover"
          />
          {/* Overlay with file info */}
          <div className="absolute bottom-0 left-0 right-0 bg-bg/80 backdrop-blur-sm p-2 flex items-center justify-between">
            <span className="text-xs font-mono text-text truncate max-w-[80%]">
              {file.name}
            </span>
            <span className="text-xs text-muted font-mono">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </div>
          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileChange(null);
            }}
            className="absolute top-2 right-2 w-6 h-6 rounded bg-bg/80 border border-border flex items-center justify-center hover:bg-red-900/40 hover:border-red-500/50 transition-colors"
          >
            <X size={12} className="text-dim" />
          </button>
        </div>
      ) : (
        // Drop zone
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer',
            'transition-all duration-200',
            isDragActive && !isDragReject && 'border-amber bg-amber-glow',
            isDragReject && 'border-red-500/60 bg-red-500/5',
            !isDragActive && 'border-border hover:border-amber-dim hover:bg-surface-2'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-center px-4">
            {isDragActive ? (
              <>
                <Upload size={20} className="text-amber" />
                <span className="text-sm font-mono text-amber">Drop it in</span>
              </>
            ) : isDragReject ? (
              <>
                <X size={20} className="text-red-400" />
                <span className="text-sm font-mono text-red-400">Invalid file</span>
              </>
            ) : (
              <>
                <ImageIcon size={20} className="text-muted" />
                <span className="text-sm font-mono text-dim">
                  Drag image here or{' '}
                  <span className="text-amber underline underline-offset-2">browse</span>
                </span>
                <span className="text-xs text-muted font-mono">
                  PNG, JPG, GIF, WEBP — max {(maxSize / 1024 / 1024).toFixed(0)}MB
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}