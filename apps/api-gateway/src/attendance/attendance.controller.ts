import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ALLOWED_PROOF_IMAGE_MIME_TYPES,
  AttendanceLocationInput,
  detectProofImageMimeType,
  JwtPrincipal,
  UserRole,
} from '@dexa/contracts';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { parsePaginationQuery } from '../common/pagination';
import { RateLimit } from '../common/rate-limit.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { EmployeeGatewayService } from '../employees/employee-gateway.service';
import { AttendanceGatewayService } from './attendance-gateway.service';
import { SubmitAttendanceDto } from './dto';

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 2_097_152);
const MAX_LOCATION_ACCURACY_METERS = resolvePositiveNumber(process.env.MAX_LOCATION_ACCURACY_METERS, 500);
const ALLOWED_IMAGE_TYPES = new Set<string>(ALLOWED_PROOF_IMAGE_MIME_TYPES);

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceGateway: AttendanceGatewayService,
    private readonly employeeGateway: EmployeeGatewayService,
  ) {}

  @Post()
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: 'attendance-submit' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYEE)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_UPLOAD_BYTES,
      },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('Proof photo must be a JPEG, PNG, or WEBP image.'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  async submit(
    @CurrentUser() user: JwtPrincipal,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: SubmitAttendanceDto,
  ) {
    if (!file) {
      throw new BadRequestException('Proof photo is required.');
    }

    const detectedMimeType = detectProofImageMimeType(file.buffer);
    if (!detectedMimeType || detectedMimeType !== file.mimetype) {
      throw new BadRequestException('Proof photo content must match a JPEG, PNG, or WEBP image.');
    }

    const employee = await this.employeeGateway.getByAuthUserId(user.sub);
    const location = this.parseLocation(dto);

    return this.attendanceGateway.submit({
      authUserId: user.sub,
      employee,
      file: {
        base64: file.buffer.toString('base64'),
        originalFilename: file.originalname,
        mimeType: detectedMimeType,
        fileSize: file.size,
      },
      location,
      notes: dto.notes ?? null,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYEE)
  listMine(@CurrentUser() user: JwtPrincipal, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.attendanceGateway.listMine({
      authUserId: user.sub,
      ...parsePaginationQuery(page, limit),
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HRD_ADMIN)
  async listAll(
    @Query('date') date?: string,
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date must use YYYY-MM-DD format.');
    }

    const recordsPage = await this.attendanceGateway.listAll({
      date,
      employeeId,
      ...parsePaginationQuery(page, limit),
    });
    const employees = await this.employeeGateway.listByIds(recordsPage.data.map((record) => record.employeeId));

    const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

    return {
      data: recordsPage.data.map((record) => ({
        ...record,
        employee: employeesById.get(record.employeeId) ?? null,
      })),
      meta: recordsPage.meta,
    };
  }

  @Get(':id/proof')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, max-age=60')
  async getProof(@Param('id') id: string, @CurrentUser() user: JwtPrincipal, @Res() response: Response) {
    const proof = await this.attendanceGateway.getProof({
      id,
      requesterAuthUserId: user.sub,
      requesterRole: user.role,
    });

    response.setHeader('Content-Type', proof.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${proof.originalFilename.replace(/[\r\n"]/g, '')}"`);
    response.send(Buffer.from(proof.base64, 'base64'));
  }

  private parseLocation(dto: SubmitAttendanceDto): AttendanceLocationInput | null {
    const locationFields = [dto.latitude, dto.longitude, dto.accuracyMeters, dto.locationCapturedAt];
    const providedFieldCount = locationFields.filter((value) => value !== undefined && value !== '').length;
    if (providedFieldCount === 0) {
      return null;
    }

    if (providedFieldCount !== locationFields.length) {
      throw new BadRequestException('Location fields must be submitted together.');
    }

    const latitudeInput = dto.latitude as string;
    const longitudeInput = dto.longitude as string;
    const accuracyInput = dto.accuracyMeters as string;
    const capturedAt = dto.locationCapturedAt as string;
    const latitude = Number(latitudeInput);
    const longitude = Number(longitudeInput);
    const accuracyMeters = Number(accuracyInput);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90.');
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180.');
    }

    if (!Number.isFinite(accuracyMeters) || accuracyMeters <= 0 || accuracyMeters > MAX_LOCATION_ACCURACY_METERS) {
      throw new BadRequestException(`Location accuracy must be ${MAX_LOCATION_ACCURACY_METERS} meters or better.`);
    }

    return {
      latitude,
      longitude,
      accuracyMeters,
      capturedAt,
    };
  }
}

function resolvePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
