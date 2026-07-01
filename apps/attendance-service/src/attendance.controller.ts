import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ATTENDANCE_PATTERNS } from '@dexa/contracts';
import { AttendanceService } from './attendance.service';

@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @MessagePattern(ATTENDANCE_PATTERNS.SUBMIT)
  submit(@Payload() payload: Parameters<AttendanceService['submit']>[0]) {
    return this.attendanceService.submit(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.LIST_MINE)
  listMine(@Payload() payload: Parameters<AttendanceService['listMine']>[0]) {
    return this.attendanceService.listMine(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.LIST_ALL)
  listAll(@Payload() payload: Parameters<AttendanceService['listAll']>[0]) {
    return this.attendanceService.listAll(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.GET_PROOF)
  getProof(@Payload() payload: Parameters<AttendanceService['getProof']>[0]) {
    return this.attendanceService.getProof(payload);
  }
}
