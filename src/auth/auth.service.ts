import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      console.log('--- [DEBUG LOGIN] INÍCIO ---');
      console.log(`1. Buscando email: [${email}]`);

      // SUBSTITUIÇÃO: findUnique com include ao invés de JOIN
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          company: true, // Traz os dados da empresa relacionada
        },
      });

      if (!user) {
        console.error('2. [ERRO]: Usuário não encontrado no banco.');
        throw new UnauthorizedException('Credenciais inválidas');
      }

      console.log('3. Usuário localizado. Verificando senha...');

      // Comparação de texto puro (Limpando espaços extras com trim)
      const inputPassword = String(password).trim();
      const dbPassword = String(user.password).trim();

      console.log(`4. Comparação: Input["${inputPassword}"] vs Banco["${dbPassword}"]`);

      if (inputPassword !== dbPassword) {
        console.error('5. [ERRO]: A senha digitada não confere com a do banco.');
        throw new UnauthorizedException('Credenciais inválidas');
      }

      console.log('6. [SUCESSO]: Senha correta.');

      // Remove a senha do objeto de retorno
      const { password: _, ...userWithoutPassword } = user;

      return {
        ...userWithoutPassword,
        company: user.company
          ? {
              id: user.company.id,
              name: user.company.name,
              slug: user.company.slug,
            }
          : null,
      };
    } catch (error) {
      console.error('--- [DEBUG LOGIN] FALHA CRÍTICA ---');
      console.error(error.message);
      throw error;
    }
  }

  async login(user: any) {
    console.log('7. Gerando Token JWT para:', user.email);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyName: user.company.name, // Adicione isso aqui!
      companyId: user.companyId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name,
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    companyId: string;
    role?: string;
  }) {
    try {
      console.log('--- [DEBUG REGISTER] ---');

      // 1. Verifica se o email já existe usando Prisma
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new UnauthorizedException('Email já cadastrado');
      }

      // IDs manuais (Mantendo sua lógica original)
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log(`Salvando novo usuário com senha em TEXTO PURO: ${data.password}`);


      // 2. CONVERTER A STRING PARA O TIPO ENUM CORRETO
      // Se data.role vier preenchido, forçamos o tipo (as Role).
      // Se não, usamos o valor padrão do Enum (Role.STAFF).
      const userRole: Role = data.role ? (data.role as Role) : Role.STAFF;
      // 2. Criação usando create
      // O Prisma preenche 'createdAt' e 'updatedAt' automaticamente se definidos com @default(now()) no schema,
      // mas podemos passar explicitamente se preferir.
      const newUser = await this.prisma.user.create({
        data: {
          id: userId,
          email: data.email,
          password: data.password, // TEXTO PURO
          name: data.name,
          companyId: data.companyId,
          role: userRole,
          // createdAt: new Date(), // Opcional se seu schema tiver @default(now())
          // updatedAt: new Date(), // Opcional se seu schema tiver @updatedAt
        },
        select: { // Equivalente ao RETURNING
          id: true,
          email: true,
          name: true,
          role: true,
          companyId: true,
        },
      });

      return newUser;
    } catch (error) {
      console.error('Erro no Registro:', error.message);
      throw new UnauthorizedException('Erro ao registrar: ' + error.message);
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      // 1. Buscar senha atual
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new UnauthorizedException('Usuário não encontrado');

      // 2. Comparação texto puro
      if (oldPassword.trim() !== user.password.trim()) {
        throw new UnauthorizedException('Senha atual incorreta');
      }

      // 3. Atualizar senha
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          password: newPassword,
          // updatedAt: new Date() // O Prisma faz isso sozinho se o campo tiver @updatedAt no schema
        },
      });

      return { message: 'Senha alterada com sucesso' };
    } catch (error) {
      // Se não for UnauthorizedException, lança erro genérico
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Erro ao alterar senha');
    }
  }

  async getUsersByCompany(companyId: string) {
    // 1. Busca simples com select para não retornar a senha
    const users = await this.prisma.user.findMany({
      where: { companyId: companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    return users;
  }
}