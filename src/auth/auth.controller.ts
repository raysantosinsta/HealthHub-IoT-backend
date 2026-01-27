import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: any) {
    // Validação básica de presença de dados
    if (!loginDto.email || !loginDto.password) {
      throw new UnauthorizedException('E-mail e senha são obrigatórios');
    }

    console.log(`[LOGIN] Tentativa para: ${loginDto.email}`);

    // 1. Valida as credenciais
    const user = await this.authService.validateUser(
      loginDto.email, 
      loginDto.password
    );

    if (!user) {
      console.log(`[LOGIN FAILED] Credenciais inválidas para: ${loginDto.email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // 2. Gera o token
    console.log(`[LOGIN SUCCESS] Gerando JWT para: ${user.email}`);
    return this.authService.login(user);
  }
}