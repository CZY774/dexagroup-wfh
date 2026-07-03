import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeSummary, PaginatedResult, PaginationInput } from '@dexa/contracts';
import { In, Repository } from 'typeorm';
import { Employee } from './employee.entity';

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
export class EmployeeService {
  constructor(@InjectRepository(Employee) private readonly employees: Repository<Employee>) {}

  async create(payload: CreateEmployeePayload): Promise<EmployeeSummary> {
    const normalized = this.normalizeCreate(payload);

    const existing = await this.employees.findOne({
      where: [
        { authUserId: normalized.authUserId },
        { employeeNumber: normalized.employeeNumber },
        { email: normalized.email },
      ],
    });

    if (existing) {
      throw this.conflict('Employee auth user, employee number, or email is already registered.');
    }

    const employee = this.employees.create(normalized);
    return this.toSummary(await this.employees.save(employee));
  }

  async list(payload: PaginationInput = { page: 1, limit: 10 }): Promise<PaginatedResult<EmployeeSummary>> {
    const [rows, total] = await this.employees.findAndCount({
      order: {
        fullName: 'ASC',
      },
      skip: (payload.page - 1) * payload.limit,
      take: payload.limit,
    });

    return {
      data: rows.map((employee) => this.toSummary(employee)),
      meta: this.createPaginationMeta(payload, total),
    };
  }

  async listByIds(ids: string[]): Promise<EmployeeSummary[]> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return [];
    }

    const rows = await this.employees.find({
      where: {
        id: In(uniqueIds),
      },
    });

    return rows.map((employee) => this.toSummary(employee));
  }

  async getById(id: string): Promise<EmployeeSummary> {
    const employee = await this.employees.findOne({ where: { id } });
    if (!employee) {
      throw this.notFound('Employee was not found.');
    }

    return this.toSummary(employee);
  }

  async getByAuthUserId(authUserId: string): Promise<EmployeeSummary> {
    const employee = await this.employees.findOne({ where: { authUserId } });
    if (!employee) {
      throw this.notFound('Employee profile was not found.');
    }

    return this.toSummary(employee);
  }

  async update(payload: UpdateEmployeePayload): Promise<EmployeeSummary> {
    const employee = await this.employees.findOne({ where: { id: payload.id } });
    if (!employee) {
      throw this.notFound('Employee was not found.');
    }

    if (payload.employeeNumber !== undefined && payload.employeeNumber.trim() !== employee.employeeNumber) {
      const employeeNumber = this.requireText(payload.employeeNumber, 'Employee number');
      await this.assertUnique('employeeNumber', employeeNumber, payload.id);
      employee.employeeNumber = employeeNumber;
    }

    if (payload.email !== undefined && payload.email.trim().toLowerCase() !== employee.email) {
      const email = this.requireText(payload.email, 'Email').toLowerCase();
      await this.assertUnique('email', email, payload.id);
      employee.email = email;
    }

    if (payload.fullName !== undefined) {
      employee.fullName = this.requireText(payload.fullName, 'Full name');
    }

    if (payload.department !== undefined) {
      employee.department = this.requireText(payload.department, 'Department');
    }

    if (payload.position !== undefined) {
      employee.position = this.requireText(payload.position, 'Position');
    }

    if (payload.phoneNumber !== undefined) {
      employee.phoneNumber = payload.phoneNumber?.trim() || null;
    }

    if (payload.updatedBy) {
      employee.updatedBy = payload.updatedBy;
    }

    return this.toSummary(await this.employees.save(employee));
  }

  async deactivate(id: string, updatedBy?: string): Promise<EmployeeSummary> {
    const employee = await this.employees.findOne({ where: { id } });
    if (!employee) {
      throw this.notFound('Employee was not found.');
    }

    employee.active = false;
    if (updatedBy) employee.updatedBy = updatedBy;
    return this.toSummary(await this.employees.save(employee));
  }

  async activate(id: string, updatedBy?: string): Promise<EmployeeSummary> {
    const employee = await this.employees.findOne({ where: { id } });
    if (!employee) {
      throw this.notFound('Employee was not found.');
    }

    employee.active = true;
    if (updatedBy) employee.updatedBy = updatedBy;
    return this.toSummary(await this.employees.save(employee));
  }

  private normalizeCreate(payload: CreateEmployeePayload): CreateEmployeePayload {
    return {
      authUserId: this.requireText(payload.authUserId, 'Auth user id'),
      employeeNumber: this.requireText(payload.employeeNumber, 'Employee number'),
      fullName: this.requireText(payload.fullName, 'Full name'),
      email: this.requireText(payload.email, 'Email').toLowerCase(),
      department: this.requireText(payload.department, 'Department'),
      position: this.requireText(payload.position, 'Position'),
      phoneNumber: payload.phoneNumber?.trim() || null,
    };
  }

  private requireText(value: string, label: string): string {
    if (typeof value !== 'string') {
      throw this.badRequest(`${label} is required.`);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw this.badRequest(`${label} is required.`);
    }

    return normalized;
  }

  private async assertUnique(field: 'employeeNumber' | 'email', value: string, currentId: string) {
    const existing = await this.employees.findOne({ where: { [field]: value } });
    if (existing && existing.id !== currentId) {
      throw this.conflict(`${field === 'email' ? 'Email' : 'Employee number'} is already used.`);
    }
  }

  private toSummary(employee: Employee): EmployeeSummary {
    return {
      id: employee.id,
      authUserId: employee.authUserId,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      phoneNumber: employee.phoneNumber,
      active: employee.active,
      updatedBy: employee.updatedBy ?? null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    };
  }

  private createPaginationMeta(payload: PaginationInput, total: number) {
    return {
      page: payload.page,
      limit: payload.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / payload.limit)),
    };
  }

  private notFound(message: string): RpcException {
    return new RpcException({ statusCode: 404, message });
  }

  private badRequest(message: string): RpcException {
    return new RpcException({ statusCode: 400, message });
  }

  private conflict(message: string): RpcException {
    return new RpcException({ statusCode: 409, message });
  }
}
