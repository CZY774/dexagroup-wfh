import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ALLOWED_PROOF_IMAGE_MIME_TYPES,
  AttendanceLocationInput,
  AttendanceSummary,
  detectProofImageMimeType,
  EmployeeSummary,
  PaginatedResult,
  PaginationInput,
  ProofFileResult,
  UserRole,
} from '@dexa/contracts';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import { createProofStorage } from './proof-storage';

type UploadedProofPayload = {
  base64: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
};

type SubmitAttendancePayload = {
  authUserId: string;
  employee: EmployeeSummary;
  file: UploadedProofPayload;
  location: AttendanceLocationInput;
  notes?: string | null;
};

type ListMinePayload = PaginationInput & {
  authUserId: string;
};

type ListAllPayload = PaginationInput & {
  date?: string;
  employeeId?: string;
};

@Injectable()
export class AttendanceService {
  private readonly maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 2_097_152);
  private readonly maxLocationAccuracyMeters = resolvePositiveNumber(process.env.MAX_LOCATION_ACCURACY_METERS, 500);
  private readonly timezone = process.env.APP_TIMEZONE ?? 'Asia/Jakarta';
  private readonly proofStorage = createProofStorage();

  constructor(@InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>) {}

  async submit(payload: SubmitAttendancePayload): Promise<AttendanceSummary> {
    if (!payload.employee.active) {
      throw this.forbidden('Inactive employees cannot submit attendance.');
    }

    if (payload.employee.authUserId !== payload.authUserId) {
      throw this.forbidden('Employee identity does not match authenticated user.');
    }

    this.validateProof(payload.file);

    const now = new Date();
    const location = this.validateLocation(payload.location, now);
    const attendanceDate = this.getBusinessDate(now);
    const existing = await this.records.findOne({
      where: {
        employeeId: payload.employee.id,
        attendanceDate,
      },
    });

    if (existing) {
      throw this.conflict('Attendance has already been submitted for today.');
    }

    const savedFile = await this.persistProof(payload.file, attendanceDate);
    const record = this.records.create({
      employeeId: payload.employee.id,
      authUserId: payload.authUserId,
      attendanceDate,
      submittedAt: now,
      proofPath: savedFile.relativePath,
      storedFilename: savedFile.filename,
      originalFilename: this.sanitizeOriginalFilename(payload.file.originalFilename),
      mimeType: payload.file.mimeType,
      fileSize: payload.file.fileSize,
      notes: this.normalizeNotes(payload.notes),
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: location.accuracyMeters,
      locationCapturedAt: location.capturedAt,
    });

    try {
      return this.toSummary(await this.records.save(record));
    } catch (error) {
      await this.removePersistedProof(savedFile.relativePath);
      if (this.isDuplicateError(error)) {
        throw this.conflict('Attendance has already been submitted for today.');
      }
      throw error;
    }
  }

  async listMine(payload: ListMinePayload): Promise<PaginatedResult<AttendanceSummary>> {
    const [rows, total] = await this.records.findAndCount({
      where: { authUserId: payload.authUserId },
      order: { submittedAt: 'DESC' },
      skip: (payload.page - 1) * payload.limit,
      take: payload.limit,
    });

    return {
      data: rows.map((record) => this.toSummary(record)),
      meta: this.createPaginationMeta(payload, total),
    };
  }

  async listAll(payload: ListAllPayload): Promise<PaginatedResult<AttendanceSummary>> {
    const [rows, total] = await this.records.findAndCount({
      where: {
        ...(payload.date ? { attendanceDate: payload.date } : {}),
        ...(payload.employeeId ? { employeeId: payload.employeeId } : {}),
      },
      order: { submittedAt: 'DESC' },
      skip: (payload.page - 1) * payload.limit,
      take: payload.limit,
    });

    return {
      data: rows.map((record) => this.toSummary(record)),
      meta: this.createPaginationMeta(payload, total),
    };
  }

  async getProof(payload: { id: string; requesterAuthUserId: string; requesterRole: UserRole }): Promise<ProofFileResult> {
    const record = await this.records.findOne({ where: { id: payload.id } });
    if (!record) {
      throw this.notFound('Attendance record was not found.');
    }

    const isOwner = record.authUserId === payload.requesterAuthUserId;
    const isHrdAdmin = payload.requesterRole === UserRole.HRD_ADMIN;
    if (!isOwner && !isHrdAdmin) {
      throw this.forbidden('You are not allowed to access this proof photo.');
    }

    const fileBuffer = await this.readProofFile(record.proofPath);

    return {
      filename: record.storedFilename,
      originalFilename: record.originalFilename,
      mimeType: record.mimeType,
      base64: fileBuffer.toString('base64'),
    };
  }

  private async persistProof(file: UploadedProofPayload, attendanceDate: string): Promise<{ filename: string; relativePath: string }> {
    const extension = this.extensionFromMime(file.mimeType);
    const filename = `${randomUUID()}${extension}`;
    const relativeDirectory = attendanceDate;
    const relativePath = `${relativeDirectory}/${filename}`;

    await this.proofStorage.put({
      key: relativePath,
      body: Buffer.from(file.base64, 'base64'),
      mimeType: file.mimeType,
    });

    return { filename, relativePath };
  }

  private async removePersistedProof(relativePath: string): Promise<void> {
    await this.proofStorage.delete(relativePath).catch(() => undefined);
  }

  private async readProofFile(relativePath: string): Promise<Buffer> {
    try {
      return await this.proofStorage.get(relativePath);
    } catch (error) {
      if (this.isMissingProofError(error)) {
        throw this.notFound('Proof photo file was not found.');
      }

      throw error;
    }
  }

  private validateProof(file: UploadedProofPayload) {
    if (!file?.base64 || !file.originalFilename || !file.mimeType) {
      throw this.badRequest('Proof photo is required.');
    }

    const allowedMimeTypes = new Set<string>(ALLOWED_PROOF_IMAGE_MIME_TYPES);
    if (!allowedMimeTypes.has(file.mimeType)) {
      throw this.badRequest('Proof photo must be a JPEG, PNG, or WEBP image.');
    }

    if (file.fileSize <= 0 || file.fileSize > this.maxUploadBytes) {
      throw this.badRequest(`Proof photo must be smaller than ${Math.floor(this.maxUploadBytes / 1024 / 1024)} MB.`);
    }

    const decodedBytes = Buffer.byteLength(file.base64, 'base64');
    if (decodedBytes !== file.fileSize) {
      throw this.badRequest('Proof photo payload is invalid.');
    }

    const detectedMimeType = detectProofImageMimeType(Buffer.from(file.base64, 'base64'));
    if (!detectedMimeType || detectedMimeType !== file.mimeType) {
      throw this.badRequest('Proof photo content must match a JPEG, PNG, or WEBP image.');
    }
  }

  private validateLocation(location: AttendanceLocationInput | undefined, submittedAt: Date) {
    if (!location) {
      throw this.badRequest('Location is required for attendance submission.');
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    const accuracyMeters = Number(location.accuracyMeters);
    const capturedAt = new Date(location.capturedAt);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw this.badRequest('Latitude must be between -90 and 90.');
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw this.badRequest('Longitude must be between -180 and 180.');
    }

    if (!Number.isFinite(accuracyMeters) || accuracyMeters <= 0 || accuracyMeters > this.maxLocationAccuracyMeters) {
      throw this.badRequest(`Location accuracy must be ${this.maxLocationAccuracyMeters} meters or better.`);
    }

    if (Number.isNaN(capturedAt.getTime())) {
      throw this.badRequest('Location captured timestamp is invalid.');
    }

    const driftMs = Math.abs(submittedAt.getTime() - capturedAt.getTime());
    if (driftMs > 5 * 60 * 1000) {
      throw this.badRequest('Location must be captured at submission time.');
    }

    return {
      latitude,
      longitude,
      accuracyMeters,
      capturedAt,
    };
  }

  private extensionFromMime(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    return extensions[mimeType] ?? '.img';
  }

  private sanitizeOriginalFilename(filename: string): string {
    const sanitized = filename.replace(/[/\\\r\n"]/g, '').trim();
    return (sanitized || 'proof-photo').slice(0, 255);
  }

  private normalizeNotes(notes?: string | null): string | null {
    const normalized = notes?.trim() || null;
    if (normalized && normalized.length > 500) {
      throw this.badRequest('Notes must be 500 characters or fewer.');
    }

    return normalized;
  }

  private getBusinessDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  private toSummary(record: AttendanceRecord): AttendanceSummary {
    return {
      id: record.id,
      employeeId: record.employeeId,
      authUserId: record.authUserId,
      attendanceDate: record.attendanceDate,
      submittedAt: record.submittedAt.toISOString(),
      originalFilename: record.originalFilename,
      mimeType: record.mimeType,
      fileSize: record.fileSize,
      notes: record.notes,
      latitude: record.latitude,
      longitude: record.longitude,
      accuracyMeters: record.accuracyMeters,
      locationCapturedAt: record.locationCapturedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
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

  private isDuplicateError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ER_DUP_ENTRY';
  }

  private isMissingProofError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as { code?: string; message?: string; status?: number; statusCode?: number };
    return (
      candidate.code === 'ENOENT' ||
      candidate.status === 404 ||
      candidate.statusCode === 404 ||
      /NoSuchKey|not found|status 404/i.test(candidate.message ?? '')
    );
  }

  private badRequest(message: string): RpcException {
    return new RpcException({ statusCode: 400, message });
  }

  private forbidden(message: string): RpcException {
    return new RpcException({ statusCode: 403, message });
  }

  private notFound(message: string): RpcException {
    return new RpcException({ statusCode: 404, message });
  }

  private conflict(message: string): RpcException {
    return new RpcException({ statusCode: 409, message });
  }
}

function resolvePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
