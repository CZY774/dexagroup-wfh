import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EMPLOYEE_PATTERNS } from '@dexa/contracts';
import { EmployeeService } from './employee.service';

@Controller()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @MessagePattern(EMPLOYEE_PATTERNS.CREATE)
  create(@Payload() payload: Parameters<EmployeeService['create']>[0]) {
    return this.employeeService.create(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.LIST)
  list(@Payload() payload: Parameters<EmployeeService['list']>[0]) {
    return this.employeeService.list(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.GET_BY_ID)
  getById(@Payload() payload: { id: string }) {
    return this.employeeService.getById(payload.id);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.GET_BY_AUTH_USER_ID)
  getByAuthUserId(@Payload() payload: { authUserId: string }) {
    return this.employeeService.getByAuthUserId(payload.authUserId);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.LIST_BY_IDS)
  listByIds(@Payload() payload: { ids: string[] }) {
    return this.employeeService.listByIds(payload.ids);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.UPDATE)
  update(@Payload() payload: Parameters<EmployeeService['update']>[0]) {
    return this.employeeService.update(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.DEACTIVATE)
  deactivate(@Payload() payload: { id: string; updatedBy?: string }) {
    return this.employeeService.deactivate(payload.id, payload.updatedBy);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.ACTIVATE)
  activate(@Payload() payload: { id: string; updatedBy?: string }) {
    return this.employeeService.activate(payload.id, payload.updatedBy);
  }
}
