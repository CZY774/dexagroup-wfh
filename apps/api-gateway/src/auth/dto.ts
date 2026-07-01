import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { NormalizeEmail } from '../common/dto-transform';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
