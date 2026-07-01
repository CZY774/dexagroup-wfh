import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@dexa/contracts';
import { AuthGatewayService } from '../auth/auth-gateway.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { parsePaginationQuery } from '../common/pagination';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import { EmployeeGatewayService } from './employee-gateway.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HRD_ADMIN)
export class EmployeesController {
  constructor(
    private readonly authGateway: AuthGatewayService,
    private readonly employeeGateway: EmployeeGatewayService,
  ) {}

  @Post()
  async create(@Body() dto: CreateEmployeeDto) {
    let createdUserId: string | null = null;

    try {
      const user = await this.authGateway.createEmployeeUser({
        email: dto.email,
        password: dto.password,
      });
      createdUserId = user.id;

      return await this.employeeGateway.create({
        authUserId: user.id,
        employeeNumber: dto.employeeNumber,
        fullName: dto.fullName,
        email: dto.email,
        department: dto.department,
        position: dto.position,
        phoneNumber: dto.phoneNumber ?? null,
      });
    } catch (error) {
      if (createdUserId) {
        await this.authGateway.setUserActive({ userId: createdUserId, active: false }).catch(() => undefined);
      }

      throw error;
    }
  }

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.employeeGateway.list(parsePaginationQuery(page, limit));
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.employeeGateway.getById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const current = await this.employeeGateway.getById(id);
    const nextEmail = dto.email?.trim().toLowerCase();
    const shouldUpdateAuthEmail = Boolean(nextEmail && nextEmail !== current.email);

    if (shouldUpdateAuthEmail && nextEmail) {
      await this.authGateway.updateUserEmail({
        userId: current.authUserId,
        email: nextEmail,
      });
    }

    try {
      return await this.employeeGateway.update({
        id,
        ...dto,
      });
    } catch (error) {
      if (shouldUpdateAuthEmail) {
        await this.authGateway.updateUserEmail({
          userId: current.authUserId,
          email: current.email,
        }).catch(() => undefined);
      }

      throw error;
    }
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.softDelete(id);
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    const employee = await this.employeeGateway.activate(id);
    try {
      await this.authGateway.setUserActive({
        userId: employee.authUserId,
        active: true,
      });
    } catch (error) {
      await this.employeeGateway.deactivate(id).catch(() => undefined);
      throw error;
    }

    return employee;
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.softDelete(id);
  }

  private async softDelete(id: string) {
    const employee = await this.employeeGateway.deactivate(id);
    try {
      await this.authGateway.setUserActive({
        userId: employee.authUserId,
        active: false,
      });
    } catch (error) {
      await this.employeeGateway.activate(id).catch(() => undefined);
      throw error;
    }

    return employee;
  }
}
