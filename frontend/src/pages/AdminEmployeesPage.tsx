import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Save, UserCheck, UserX } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { FormField } from '../components/FormField';
import { PaginationControls } from '../components/PaginationControls';
import { PasswordInput } from '../components/PasswordInput';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import type { EmployeeSummary, PaginationMeta } from '../types/api';

type EmployeeForm = {
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
  position: string;
  phoneNumber: string;
  password: string;
};

const emptyForm: EmployeeForm = {
  employeeNumber: '',
  fullName: '',
  email: '',
  department: '',
  position: '',
  phoneNumber: '',
  password: '',
};

const initialMeta: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

export function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const editingEmployee = useMemo(
    () => employees.find((employee) => employee.id === editingId) ?? null,
    [editingId, employees],
  );

  useEffect(() => {
    loadEmployees(page, pageSize);
  }, [page, pageSize]);

  async function loadEmployees(nextPage: number, nextLimit: number) {
    setLoading(true);
    try {
      const result = await api.listEmployees({ page: nextPage, limit: nextLimit });
      setEmployees(result.data);
      setMeta(result.meta);
    } catch (employeesError) {
      setError(employeesError instanceof Error ? employeesError.message : 'Unable to load employees.');
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof EmployeeForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(employee: EmployeeSummary) {
    setEditingId(employee.id);
    setForm({
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      phoneNumber: employee.phoneNumber ?? '',
      password: '',
    });
    setError(null);
    setSuccess(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingEmployee) {
        const updatedEmployee = await api.updateEmployee(editingEmployee.id, {
          employeeNumber: form.employeeNumber,
          fullName: form.fullName,
          email: form.email,
          department: form.department,
          position: form.position,
          phoneNumber: form.phoneNumber,
        });
        setEmployees((current) =>
          current.map((employee) => (employee.id === updatedEmployee.id ? updatedEmployee : employee)),
        );
        setSuccess('Employee updated.');
      } else {
        await api.createEmployee(form);
        if (page === 1) {
          await loadEmployees(1, pageSize);
        } else {
          setPage(1);
        }
        setSuccess('Employee created.');
      }

      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save employee.');
    } finally {
      setSaving(false);
    }
  }

  async function setEmployeeStatus(employee: EmployeeSummary, active: boolean) {
    const actionLabel = active ? 'Reactivate' : 'Deactivate';
    const confirmed = window.confirm(`${actionLabel} ${employee.fullName}?`);
    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);
    setStatusUpdatingId(employee.id);

    try {
      const updatedEmployee = active
        ? await api.activateEmployee(employee.id)
        : await api.deactivateEmployee(employee.id);
      setEmployees((current) =>
        current.map((currentEmployee) => (currentEmployee.id === updatedEmployee.id ? updatedEmployee : currentEmployee)),
      );
      setSuccess(active ? 'Employee reactivated.' : 'Employee deactivated.');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update employee status.');
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p>{loading ? 'Loading employees' : `${meta.total} employees`}</p>
        </div>
      </div>

      <div className="split-layout">
        <form className="work-surface stack-form" onSubmit={handleSubmit}>
          <div className="surface-heading">
            <h2>{editingEmployee ? 'Update Employee' : 'Create Employee'}</h2>
            {editingEmployee && (
              <button className="secondary-button" type="button" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
            )}
          </div>

          <div className="form-grid">
            <FormField label="Employee Number">
              <input
                value={form.employeeNumber}
                onChange={(event) => updateField('employeeNumber', event.target.value)}
                disabled={saving}
                required
              />
            </FormField>
            <FormField label="Full Name">
              <input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} disabled={saving} required />
            </FormField>
            <FormField label="Email">
              <input value={form.email} type="email" onChange={(event) => updateField('email', event.target.value)} disabled={saving} required />
            </FormField>
            <FormField label="Department">
              <input value={form.department} onChange={(event) => updateField('department', event.target.value)} disabled={saving} required />
            </FormField>
            <FormField label="Position">
              <input value={form.position} onChange={(event) => updateField('position', event.target.value)} disabled={saving} required />
            </FormField>
            <FormField label="Phone">
              <input value={form.phoneNumber} onChange={(event) => updateField('phoneNumber', event.target.value)} disabled={saving} />
            </FormField>
            {!editingEmployee && (
              <FormField label="Initial Password">
                <PasswordInput
                  value={form.password}
                  minLength={8}
                  onChange={(event) => updateField('password', event.target.value)}
                  disabled={saving}
                  required
                />
              </FormField>
            )}
          </div>

          {error && <div className="alert is-error" role="alert">{error}</div>}
          {success && <div className="alert is-success" role="status">{success}</div>}

          <button className="primary-button" type="submit" disabled={saving}>
            {editingEmployee ? <Save size={18} /> : <Plus size={18} />}
            {saving ? 'Saving' : editingEmployee ? 'Save Employee' : 'Create Employee'}
          </button>
        </form>

        <div className="table-section">
          <DataTable
            data={employees}
            keyExtractor={(employee) => employee.id}
            emptyText="No employees yet"
            loading={loading}
            columns={[
              {
                header: 'Employee',
                render: (employee) => (
                  <div className="entity-cell">
                    <strong>{employee.fullName}</strong>
                    <span>{employee.employeeNumber}</span>
                  </div>
                ),
              },
              {
                header: 'Department',
                render: (employee) => employee.department,
              },
              {
                header: 'Position',
                render: (employee) => employee.position,
              },
              {
                header: 'Status',
                render: (employee) => <StatusBadge active={employee.active} />,
              },
              {
                header: 'Actions',
                className: 'action-column',
                render: (employee) => (
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => startEdit(employee)}
                      disabled={saving || statusUpdatingId !== null}
                      aria-label="Edit employee"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className={employee.active ? 'icon-button danger' : 'icon-button'}
                      type="button"
                      onClick={() => setEmployeeStatus(employee, !employee.active)}
                      disabled={saving || statusUpdatingId !== null}
                      aria-label={employee.active ? 'Deactivate employee' : 'Reactivate employee'}
                    >
                      {employee.active ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </div>
                ),
              },
            ]}
          />

          <PaginationControls
            meta={meta}
            onPageChange={setPage}
            onLimitChange={(limit) => {
              setPageSize(limit);
              setPage(1);
            }}
            disabled={loading || saving || statusUpdatingId !== null}
          />
        </div>
      </div>
    </section>
  );
}
