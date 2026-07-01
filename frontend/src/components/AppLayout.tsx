import { CalendarCheck, ClipboardList, LogOut, Menu, UserRoundCog, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    }

    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  function handleLogout() {
    closeMobileNav();
    logout();
  }

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button
          className="icon-button mobile-menu-button"
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileNavOpen}
          aria-controls="app-sidebar"
          tabIndex={mobileNavOpen ? -1 : undefined}
        >
          <Menu size={18} />
        </button>

        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">dx</span>
          <div>
            <strong>Dexa Group</strong>
            <span>{user?.role === 'HRD_ADMIN' ? 'HRD Admin' : 'WFH Attendance'}</span>
          </div>
        </div>
      </header>

      {mobileNavOpen && <button className="mobile-nav-backdrop" type="button" aria-label="Close navigation menu" onClick={closeMobileNav} />}

      <aside id="app-sidebar" className={`sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-block">
            <span className="brand-mark" aria-hidden="true">dx</span>
            <div>
              <strong>Dexa Group</strong>
              <span>{user?.role === 'HRD_ADMIN' ? 'HRD Admin Portal' : 'WFH Attendance'}</span>
            </div>
          </div>

          <button className="icon-button sidebar-close-button" type="button" onClick={closeMobileNav} aria-label="Close navigation menu">
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {user?.role === 'EMPLOYEE' && (
            <>
              <NavLink to="/employee/attendance" onClick={closeMobileNav}>
                <CalendarCheck size={18} />
                Attendance
              </NavLink>
              <NavLink to="/employee/history" onClick={closeMobileNav}>
                <ClipboardList size={18} />
                History
              </NavLink>
            </>
          )}

          {user?.role === 'HRD_ADMIN' && (
            <>
              <NavLink to="/admin/employees" onClick={closeMobileNav}>
                <Users size={18} />
                Employees
              </NavLink>
              <NavLink to="/admin/attendance" onClick={closeMobileNav}>
                <UserRoundCog size={18} />
                Monitoring
              </NavLink>
            </>
          )}
        </nav>

        <button className="nav-logout" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          Sign out
        </button>
      </aside>

      <main className="content-shell">
        <Outlet />
      </main>
    </div>
  );
}
