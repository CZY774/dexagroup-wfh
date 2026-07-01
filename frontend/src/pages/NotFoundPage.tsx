import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">dx</span>
        <div>
          <strong>Dexa Group</strong>
          <span>WFH Attendance</span>
        </div>
      </div>

      <section className="not-found-content">
        <p>404</p>
        <h1>Page not found</h1>
        <span>The page may have moved or the address is incorrect.</span>
        <Link className="primary-button" to="/">
          <ArrowLeft size={18} />
          Back to app
        </Link>
      </section>
    </main>
  );
}
