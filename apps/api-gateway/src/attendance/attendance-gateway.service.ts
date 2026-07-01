import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ATTENDANCE_PATTERNS,
  AttendanceLocationInput,
  AttendanceSummary,
  EmployeeSummary,
  PaginatedResult,
  PaginationInput,
  ProofFileResult,
  SERVICE_CLIENTS,
  UserRole,
} from '@dexa/contracts';
import { sendRpc } from '../common/rpc-client';

type SubmitAttendancePayload = {
  authUserId: string;
  employee: EmployeeSummary;
  file: {
    base64: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
  };
  location: AttendanceLocationInput;
  notes?: string | null;
};

@Injectable()
export class AttendanceGatewayService {
  constructor(@Inject(SERVICE_CLIENTS.ATTENDANCE) private readonly attendanceClient: ClientProxy) {}

  submit(payload: SubmitAttendancePayload): Promise<AttendanceSummary> {
    return sendRpc<AttendanceSummary>(this.attendanceClient, ATTENDANCE_PATTERNS.SUBMIT, payload);
  }

  listMine(payload: PaginationInput & { authUserId: string }): Promise<PaginatedResult<AttendanceSummary>> {
    return sendRpc<PaginatedResult<AttendanceSummary>>(this.attendanceClient, ATTENDANCE_PATTERNS.LIST_MINE, payload);
  }

  listAll(filters: PaginationInput & { date?: string; employeeId?: string }): Promise<PaginatedResult<AttendanceSummary>> {
    return sendRpc<PaginatedResult<AttendanceSummary>>(this.attendanceClient, ATTENDANCE_PATTERNS.LIST_ALL, filters);
  }

  getProof(payload: { id: string; requesterAuthUserId: string; requesterRole: UserRole }): Promise<ProofFileResult> {
    return sendRpc<ProofFileResult>(this.attendanceClient, ATTENDANCE_PATTERNS.GET_PROOF, payload);
  }
}
