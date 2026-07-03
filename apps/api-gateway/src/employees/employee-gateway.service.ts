import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { EMPLOYEE_PATTERNS, EmployeeSummary, PaginatedResult, PaginationInput, SERVICE_CLIENTS } from '@dexa/contracts';
import { sendRpc } from '../common/rpc-client';

type CreateEmployeePayload = {
  authUserId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
  position: string;
  phoneNumber?: string | null;
};

type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'authUserId'>> & {
  id: string;
  updatedBy?: string;
};

@Injectable()
export class EmployeeGatewayService {
  constructor(@Inject(SERVICE_CLIENTS.EMPLOYEE) private readonly employeeClient: ClientProxy) {}

  create(payload: CreateEmployeePayload): Promise<EmployeeSummary> {
    return sendRpc<EmployeeSummary>(this.employeeClient, EMPLOYEE_PATTERNS.CREATE, payload);
  }

  list(payload: PaginationInput): Promise<PaginatedResult<EmployeeSummary>> {
    return sendRpc<PaginatedResult<EmployeeSummary>>(this.employeeClient, EMPLOYEE_PATTERNS.LIST, payload);
  }

  getById(id: string): Promise<EmployeeSummary> {
    return sendRpc<EmployeeSummary>(this.employeeClient, EMPLOYEE_PATTERNS.GET_BY_ID, { id });
  }

  getByAuthUserId(authUserId: string): Promise<EmployeeSummary> {
    return sendRpc<EmployeeSummary>(this.employeeClient, EMPLOYEE_PATTERNS.GET_BY_AUTH_USER_ID, { authUserId });
  }

  listByIds(ids: string[]): Promise<EmployeeSummary[]> {
    return sendRpc<EmployeeSummary[]>(this.employeeClient, EMPLOYEE_PATTERNS.LIST_BY_IDS, { ids });
  }

  update(payload: UpdateEmployeePayload): Promise<EmployeeSummary> {
    return sendRpc<EmployeeSummary>(this.employeeClient, EMPLOYEE_PATTERNS.UPDATE, payload);
  }

  deactivate(id: string, updatedBy: string): Promise<EmployeeSummary> {
    return sendRpc<EmployeeSummary>(this.employeeClient, EMPLOYEE_PATTERNS.DEACTIVATE, { id, updatedBy });
  }

  activate(id: string, updatedBy: string): Promise<EmployeeSummary> {
    return sendRpc<EmployeeSummary>(this.employeeClient, EMPLOYEE_PATTERNS.ACTIVATE, { id, updatedBy });
  }
}
