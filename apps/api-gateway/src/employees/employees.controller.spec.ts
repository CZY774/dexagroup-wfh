import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRole } from '@dexa/contracts';
import { AuthGatewayService } from '../auth/auth-gateway.service';
import { EmployeeGatewayService } from './employee-gateway.service';
import { EmployeesController } from './employees.controller';

test('employees controller DELETE soft-deletes employee and deactivates auth user', async () => {
  const calls: string[] = [];
  const authGateway = {
    setUserActive: async (payload: { userId: string; active: boolean }) => {
      calls.push(`auth:${payload.userId}:${payload.active}`);
      return {
        id: payload.userId,
        email: 'employee@dexa.test',
        role: UserRole.EMPLOYEE,
        active: payload.active,
        createdAt: '2026-06-29T08:00:00.000Z',
        updatedAt: '2026-06-29T08:00:00.000Z',
      };
    },
  } as AuthGatewayService;
  const employeeGateway = {
    deactivate: async (id: string) => {
      calls.push(`employee:${id}`);
      return {
        id,
        authUserId: 'user-1',
        employeeNumber: 'DX-001',
        fullName: 'Dexa Employee',
        email: 'employee@dexa.test',
        department: 'Engineering',
        position: 'Developer',
        phoneNumber: null,
        active: false,
        createdAt: '2026-06-29T08:00:00.000Z',
        updatedAt: '2026-06-29T08:00:00.000Z',
      };
    },
  } as EmployeeGatewayService;

  const controller = new EmployeesController(authGateway, employeeGateway);
  const result = await controller.delete('employee-1');

  assert.equal(result.active, false);
  assert.deepEqual(calls, ['employee:employee-1', 'auth:user-1:false']);
});

test('employees controller PATCH activate reactivates employee and auth user', async () => {
  const calls: string[] = [];
  const authGateway = {
    setUserActive: async (payload: { userId: string; active: boolean }) => {
      calls.push(`auth:${payload.userId}:${payload.active}`);
      return {
        id: payload.userId,
        email: 'employee@dexa.test',
        role: UserRole.EMPLOYEE,
        active: payload.active,
        createdAt: '2026-06-29T08:00:00.000Z',
        updatedAt: '2026-06-29T08:00:00.000Z',
      };
    },
  } as AuthGatewayService;
  const employeeGateway = {
    activate: async (id: string) => {
      calls.push(`employee:${id}`);
      return {
        id,
        authUserId: 'user-1',
        employeeNumber: 'DX-001',
        fullName: 'Dexa Employee',
        email: 'employee@dexa.test',
        department: 'Engineering',
        position: 'Developer',
        phoneNumber: null,
        active: true,
        createdAt: '2026-06-29T08:00:00.000Z',
        updatedAt: '2026-06-29T08:00:00.000Z',
      };
    },
  } as EmployeeGatewayService;

  const controller = new EmployeesController(authGateway, employeeGateway);
  const result = await controller.activate('employee-1');

  assert.equal(result.active, true);
  assert.deepEqual(calls, ['employee:employee-1', 'auth:user-1:true']);
});

test('employees controller rolls back employee deactivate when auth deactivation fails', async () => {
  const calls: string[] = [];
  const authGateway = {
    setUserActive: async (payload: { userId: string; active: boolean }) => {
      calls.push(`auth:${payload.userId}:${payload.active}`);
      throw new Error('auth unavailable');
    },
  } as AuthGatewayService;
  const employeeGateway = {
    deactivate: async (id: string) => {
      calls.push(`employee-deactivate:${id}`);
      return {
        id,
        authUserId: 'user-1',
        employeeNumber: 'DX-001',
        fullName: 'Dexa Employee',
        email: 'employee@dexa.test',
        department: 'Engineering',
        position: 'Developer',
        phoneNumber: null,
        active: false,
        createdAt: '2026-06-29T08:00:00.000Z',
        updatedAt: '2026-06-29T08:00:00.000Z',
      };
    },
    activate: async (id: string) => {
      calls.push(`employee-activate:${id}`);
      return {
        id,
        authUserId: 'user-1',
        employeeNumber: 'DX-001',
        fullName: 'Dexa Employee',
        email: 'employee@dexa.test',
        department: 'Engineering',
        position: 'Developer',
        phoneNumber: null,
        active: true,
        createdAt: '2026-06-29T08:00:00.000Z',
        updatedAt: '2026-06-29T08:00:00.000Z',
      };
    },
  } as EmployeeGatewayService;

  const controller = new EmployeesController(authGateway, employeeGateway);

  await assert.rejects(controller.delete('employee-1'), /auth unavailable/);
  assert.deepEqual(calls, ['employee-deactivate:employee-1', 'auth:user-1:false', 'employee-activate:employee-1']);
});

test('employees controller rolls back employee activate when auth reactivation fails', async () => {
  const calls: string[] = [];
  const authGateway = {
    setUserActive: async (payload: { userId: string; active: boolean }) => {
      calls.push(`auth:${payload.userId}:${payload.active}`);
      throw new Error('auth unavailable');
    },
  } as AuthGatewayService;
  const employeeGateway = {
    activate: async (id: string) => {
      calls.push(`employee-activate:${id}`);
      return {
        id,
        authUserId: 'user-1',
        employeeNumber: 'DX-001',
        fullName: 'Dexa Employee',
        email: 'employee@dexa.test',
        department: 'Engineering',
        position: 'Developer',
        phoneNumber: null,
        active: true,
        createdAt: '2026-06-29T08:00:00.000Z',
        updatedAt: '2026-06-29T08:00:00.000Z',
      };
    },
    deactivate: async (id: string) => {
      calls.push(`employee-deactivate:${id}`);
      return {
        id,
        authUserId: 'user-1',
        employeeNumber: 'DX-001',
        fullName: 'Dexa Employee',
        email: 'employee@dexa.test',
        department: 'Engineering',
        position: 'Developer',
        phoneNumber: null,
        active: false,
        createdAt: '2026-06-29T08:00:00.000Z',
        updatedAt: '2026-06-29T08:00:00.000Z',
      };
    },
  } as EmployeeGatewayService;

  const controller = new EmployeesController(authGateway, employeeGateway);

  await assert.rejects(controller.activate('employee-1'), /auth unavailable/);
  assert.deepEqual(calls, ['employee-activate:employee-1', 'auth:user-1:true', 'employee-deactivate:employee-1']);
});
