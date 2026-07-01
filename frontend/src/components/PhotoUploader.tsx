import { ImageUp, X } from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';

type PhotoUploaderProps = {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export function PhotoUploader({ file, onChange, disabled = false }: PhotoUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    onChange(event.target.files?.[0] ?? null);
  }

  return (
    <div className="photo-uploader">
      <label className={`photo-drop ${disabled ? 'is-disabled' : ''}`}>
        <ImageUp size={22} />
        <span>{file ? file.name : 'Proof photo'}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleChange}
          disabled={disabled}
        />
      </label>

      {previewUrl && (
        <div className="photo-preview">
          <img src={previewUrl} alt="Selected proof" />
          <button
            type="button"
            className="icon-button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Remove selected photo"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
