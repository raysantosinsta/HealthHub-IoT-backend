import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { Role } from 'generated/prisma/enums';

export class LoginDto {
  @ApiProperty({ example: 'enfermeira@clinica.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'enfermeira@clinica.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'clinic-123' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'STAFF', enum: Role, required: false })
  @IsString()
  role?: Role;
}