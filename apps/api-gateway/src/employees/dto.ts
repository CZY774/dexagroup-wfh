import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail, TrimString } from '../common/dto-transform';

export class CreateEmployeeDto {
  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  employeeNumber!: string;

  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @NormalizeEmail()
  @IsEmail()
  @MaxLength(191)
  email!: string;

  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  department!: string;

  @TrimString()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  position!: string;

  @TrimString()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(80)
  password!: string;
}

export class UpdateEmployeeDto {
  @TrimString()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  employeeNumber?: string;

  @TrimString()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName?: string;

  @NormalizeEmail()
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @TrimString()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  department?: string;

  @TrimString()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  position?: string;

  @TrimString()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneNumber?: string;
}
