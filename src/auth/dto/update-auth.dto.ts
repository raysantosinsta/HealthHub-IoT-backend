import { PartialType } from '@nestjs/swagger';
import { LoginDto } from './auth.dto';

export class UpdateAuthDto extends PartialType(LoginDto) {}
