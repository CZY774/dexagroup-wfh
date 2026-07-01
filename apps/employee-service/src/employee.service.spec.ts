import assert from 'node:assert/strict';
import test from 'node:test';
import { RpcException } from '@nestjs/microservices';
import { Employee } from './employee.entity';
import { EmployeeService } from './employee.service';

function createEmployee(overrides: Partial<Employee> = {}): Employee {
  const now = new Date('2026-06-29T08:00:00.000Z');
  return {
    id: 'employee-1',
    authUserId: 'user-1',
    employeeNumber: 'DX-001',
    fullName: 'Dexa Employee',
    email: 'employee@dexa.test',
    department: 'Engineering',
    position: 'Developer',
    phoneNumber: null,
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createRepository(initialRows: Employee[] = []) {
  const rows = [...initialRows];

  return {
    rows,
    repository: {
      findOne: async ({ where }: { where: Partial<Employee> | Partial<Employee>[] }) => {
        const filters = Array.isArray(where) ? where : [where];
        return rows.find((row) => filters.some((filter) => matches(row, filter))) ?? null;
      },
      find: async () => [...rows].sort((a, b) => a.fullName.localeCompare(b.fullName)),
      create: (payload: Partial<Employee>) => payload as Employee,
      save: async (employee: Employee) => {
        const now = new Date('2026-06-29T08:00:00.000Z');
        const saved = {
          ...employee,
          id: employee.id ?? `employee-${rows.length + 1}`,
          active: employee.active ?? true,
          createdAt: employee.createdAt ?? now,
          updatedAt: now,
        };
        const index = rows.findIndex((row) => row.id === saved.id);
        if (index >= 0) {
          rows[index] = saved;
        } else {
          rows.push(saved);
        }
        return saved;
      },
    },
  };
}

function matches(row: Employee, where: Partial<Employee>): boolean {
  return Object.entries(where).every(([key, value]) => row[key as keyof Employee] === value);
}

function rpcPayload(error: unknown): { statusCode: number; message: string } {
  return (error as RpcException).getError() as { statusCode: number; message: string };
}

test('employee-service creates employee master data', async () => {
  const { repository, rows } = createRepository();
  const service = new EmployeeService(repository as never);

  const employee = await service.create({
    authUserId: 'user-1',
    employeeNumber: 'DX-001',
    fullName: 'Dexa Employee',
    email: 'employee@dexa.test',
    department: 'Engineering',
    position: 'Developer',
    phoneNumber: '08123456789',
  });

  assert.equal(employee.id, 'employee-1');
  assert.equal(employee.email, 'employee@dexa.test');
  assert.equal(employee.active, true);
  assert.equal(rows.length, 1);
});

test('employee-service rejects duplicate employee number or email', async () => {
  const { repository } = createRepository([createEmployee()]);
  const service = new EmployeeService(repository as never);

  await assert.rejects(
    service.create({
      authUserId: 'user-2',
      employeeNumber: 'DX-001',
      fullName: 'Duplicate Employee',
      email: 'other@dexa.test',
      department: 'Engineering',
      position: 'Developer',
    }),
    (error) => {
      assert.equal(rpcPayload(error).statusCode, 409);
      return true;
    },
  );

  await assert.rejects(
    service.create({
      authUserId: 'user-3',
      employeeNumber: 'DX-003',
      fullName: 'Duplicate Email',
      email: 'employee@dexa.test',
      department: 'Engineering',
      position: 'Developer',
    }),
    (error) => {
      assert.equal(rpcPayload(error).statusCode, 409);
      return true;
    },
  );
});

test('employee-service deactivates an employee without deleting the record', async () => {
  const { repository, rows } = createRepository([createEmployee()]);
  const service = new EmployeeService(repository as never);

  const employee = await service.deactivate('employee-1');

  assert.equal(employee.active, false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].active, false);
});

test('employee-service activates an inactive employee without deleting the record', async () => {
  const { repository, rows } = createRepository([createEmployee({ active: false })]);
  const service = new EmployeeService(repository as never);

  const employee = await service.activate('employee-1');

  assert.equal(employee.active, true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].active, true);
});
