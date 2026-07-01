import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../common/dto-transform';

export class SubmitAttendanceDto {
  @TrimString()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @TrimString()
  @IsString()
  @IsNotEmpty()
  latitude!: string;

  @TrimString()
  @IsString()
  @IsNotEmpty()
  longitude!: string;

  @TrimString()
  @IsString()
  @IsNotEmpty()
  accuracyMeters!: string;

  @TrimString()
  @IsISO8601()
  locationCapturedAt!: string;
}
