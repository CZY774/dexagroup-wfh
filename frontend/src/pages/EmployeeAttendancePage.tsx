import { FormEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { FormField } from '../components/FormField';
import { PhotoUploader } from '../components/PhotoUploader';
import { api } from '../lib/api';
import { captureAttendanceLocation } from '../lib/geolocation';
import type { AttendanceSummary } from '../types/api';
import { formatDateTime } from '../lib/format';

type SubmissionStep = 'idle' | 'locating' | 'uploading';

export function EmployeeAttendancePage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<AttendanceSummary | null>(null);
  const [submissionStep, setSubmissionStep] = useState<SubmissionStep>('idle');

  const submitting = submissionStep !== 'idle';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!photo) {
      setError('Proof photo is required.');
      return;
    }

    setSubmissionStep('locating');
    try {
      const location = await captureAttendanceLocation();
      setSubmissionStep('uploading');
      const record = await api.submitAttendance({ photo, notes, location });
      setSuccess(record);
      setPhoto(null);
      setNotes('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Attendance submission failed.');
    } finally {
      setSubmissionStep('idle');
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1>WFH Attendance</h1>
          <p>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(new Date())}</p>
        </div>
      </div>

      <form className="work-surface narrow-surface" onSubmit={handleSubmit}>
        <PhotoUploader file={photo} onChange={setPhoto} disabled={submitting} />

        <FormField label="Notes">
          <textarea value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} rows={4} disabled={submitting} />
        </FormField>
        <span className="form-note">{notes.length}/500 characters</span>

        {error && <div className="alert is-error" role="alert">{error}</div>}
        {success && <div className="alert is-success" role="status">Submitted at {formatDateTime(success.submittedAt)}</div>}

        <button className="primary-button" type="submit" disabled={submitting}>
          <Send size={18} />
          {submissionStep === 'locating' ? 'Getting Location' : submissionStep === 'uploading' ? 'Submitting' : 'Submit Attendance'}
        </button>
      </form>
    </section>
  );
}
