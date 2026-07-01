import { X } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type ProofPreviewDialogProps = {
  recordId: string;
  title: string;
  onClose: () => void;
};

export function ProofPreviewDialog({ recordId, title, onClose }: ProofPreviewDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    const controller = new AbortController();

    setImageUrl(null);
    setError(null);
    setLoading(true);

    api
      .getProofBlob(recordId, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((proofError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(proofError instanceof Error ? proofError.message : 'Unable to load proof photo.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [recordId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="dialog-backdrop" onClick={handleBackdropClick}>
      <section className="proof-dialog" role="dialog" aria-modal="true" aria-labelledby="proof-dialog-title">
        <header className="dialog-header">
          <h2 id="proof-dialog-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close proof preview">
            <X size={16} />
          </button>
        </header>

        <div className="proof-dialog-body">
          {loading && <span className="proof-skeleton" aria-label="Loading proof photo" />}
          {error && (
            <div className="alert is-error dialog-error" role="alert">
              {error}
            </div>
          )}
          {imageUrl && !error && <img src={imageUrl} alt="Attendance proof" />}
        </div>
      </section>
    </div>
  );
}
