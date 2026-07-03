import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../common/dto-transform';

export class SubmitAttendanceDto {
  @TrimString()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @TrimString()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  latitude?: string;

  @TrimString()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  longitude?: string;

  @TrimString()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accuracyMeters?: string;

  @TrimString()
  @IsOptional()
  @IsISO8601()
  locationCapturedAt?: string;
}
