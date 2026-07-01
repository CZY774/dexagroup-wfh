import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { FormField } from '../components/FormField';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'HRD_ADMIN' ? '/admin/employees' : '/employee/attendance'} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser.role === 'HRD_ADMIN' ? '/admin/employees' : '/employee/attendance', { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro" aria-label="Application context">
        <span>WFH Attendance</span>
        <strong>Employee attendance and HR monitoring</strong>
      </section>

      <section className="login-panel">
        <div className="login-heading">
          <span className="brand-mark" aria-hidden="true">dx</span>
          <div>
            <h1>Dexa Group</h1>
            <p>WFH Attendance Portal</p>
          </div>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <FormField label="Email">
            <input
              value={email}
              type="email"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              required
            />
          </FormField>

          <FormField label="Password">
            <input
              value={password}
              type="password"
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              required
              minLength={8}
            />
          </FormField>

          {error && <div className="alert is-error" role="alert">{error}</div>}

          <button className="primary-button" type="submit" disabled={submitting}>
            <LogIn size={18} />
            {submitting ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
