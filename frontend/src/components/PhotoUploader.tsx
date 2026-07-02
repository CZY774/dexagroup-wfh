import { ImageUp, X } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { formatBytes } from '../lib/format';
import { compressProofPhoto } from '../lib/imageCompression';

type PhotoUploaderProps = {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export function PhotoUploader({ file, onChange, disabled = false }: PhotoUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [compressionNote, setCompressionNote] = useState<string | null>(null);
  const selectionIdRef = useRef(0);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setCompressionNote(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (disabled || optimizing) {
      return;
    }

    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!selectedFile) {
      clearSelection();
      return;
    }

    const selectionId = selectionIdRef.current + 1;
    selectionIdRef.current = selectionId;
    setOptimizing(true);
    setCompressionNote('Optimizing photo');

    try {
      const result = await compressProofPhoto(selectedFile);
      if (selectionIdRef.current !== selectionId) {
        return;
      }

      onChange(result.file);
      setCompressionNote(
        result.compressed
          ? `Optimized ${formatBytes(result.originalSize)} to ${formatBytes(result.compressedSize)}`
          : `Photo size ${formatBytes(result.compressedSize)}`,
      );
    } catch {
      if (selectionIdRef.current !== selectionId) {
        return;
      }

      onChange(selectedFile);
      setCompressionNote(`Photo size ${formatBytes(selectedFile.size)}`);
    } finally {
      if (selectionIdRef.current === selectionId) {
        setOptimizing(false);
      }
    }
  }

  function clearSelection() {
    selectionIdRef.current += 1;
    setOptimizing(false);
    setCompressionNote(null);
    onChange(null);
  }

  return (
    <div className="photo-uploader">
      <label className={`photo-drop ${disabled || optimizing ? 'is-disabled' : ''}`}>
        <ImageUp size={22} />
        <span>{optimizing ? 'Optimizing photo' : file ? file.name : 'Proof photo'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleChange}
          disabled={disabled || optimizing}
        />
      </label>

      {compressionNote && <span className="form-note photo-meta" aria-live="polite">{compressionNote}</span>}

      {previewUrl && (
        <div className="photo-preview">
          <img src={previewUrl} alt="Selected proof" />
          <button
            type="button"
            className="icon-button"
            onClick={clearSelection}
            disabled={disabled || optimizing}
            aria-label="Remove selected photo"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
