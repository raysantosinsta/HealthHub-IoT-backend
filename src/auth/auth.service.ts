import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Valida credenciais procurando em múltiplas tabelas (User e Patient)
   */
  async validateUser(email: string, password: string): Promise<any> {
    try {
      this.logger.log(`[AUTH] Validando credenciais para: ${email}`);

      // 1. Tenta buscar na tabela de Usuários (ADMIN/STAFF)
      let identity: any = await this.prisma.user.findUnique({
        where: { email },
        include: { company: true },
      });

      // 2. Se não achou no User, tenta buscar na tabela de Pacientes
      if (!identity) {
        this.logger.log(`[AUTH] E-mail não encontrado em 'User', buscando em 'Patient'...`);
        identity = await this.prisma.patient.findUnique({
          where: { email },
          include: { company: true },
        });
      }

      // 3. Se não achou em nenhuma das tabelas
      if (!identity) {
        this.logger.error(`[AUTH] Usuário inexistente: ${email}`);
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // 4. Comparação de senha em TEXTO PURO (Conforme solicitado)
      const inputPassword = String(password).trim();
      const dbPassword = String(identity.password).trim();

      if (inputPassword !== dbPassword) {
        this.logger.error(`[AUTH] Senha incorreta para: ${email}`);
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // 5. Normalização do objeto de retorno
      // Remove a senha e garante que o campo 'role' exista (Paciente usa role fixa se não tiver no DB)
      const { password: _, ...identityWithoutPassword } = identity;

      return {
        ...identityWithoutPassword,
        role: identity.role || 'PATIENT', 
        company: identity.company
          ? {
              id: identity.company.id,
              name: identity.company.name,
              slug: identity.company.slug,
            }
          : null,
      };
    } catch (error) {
      this.logger.error(`[AUTH ERROR] ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera o Token JWT contendo informações de contexto e padrões de atividade
   */
  async login(user: any) {
    this.logger.log(`[AUTH] Gerando Token para: ${user.email}`);

    let activities: any[] = [];

    try {
      // Busca padrões de atividade do banco para o Frontend usar em combos/filtros
      const dbActivities = await this.prisma.activityPattern.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      if (dbActivities && dbActivities.length > 0) {
        activities = dbActivities;
      } else {
        // Fallback caso o banco esteja vazio
        activities = [
          { id: 'default-1', name: 'Repouso', slug: 'resting' },
          { id: 'default-2', name: 'Dormindo', slug: 'sleeping' }
        ];
      }
    } catch (error) {
      this.logger.warn(`Erro ao carregar atividades no login: ${error.message}`);
    }

    // Payload do Token (O que o frontend vai conseguir ler ao decodificar)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || user.company?.id,
      companyName: user.company?.name,
      activities: activities, // Importante para o App Mobile do Paciente
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: payload.companyId,
        companyName: payload.companyName,
        activities: activities,
      },
    };
  }

  /**
   * Registro de novos usuários (Staff/Admin)
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
    companyId: string;
    role?: string;
  }) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new UnauthorizedException('Email já cadastrado');
      }

      const userRole: Role = data.role ? (data.role as Role) : Role.STAFF;

      return await this.prisma.user.create({
        data: {
          email: data.email,
          password: data.password, // TEXTO PURO
          name: data.name,
          companyId: data.companyId,
          role: userRole,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    } catch (error) {
      throw new UnauthorizedException('Erro ao registrar: ' + error.message);
    }
  }

  /**
   * Troca de senha básica
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    // Busca primeiro em User
    let user = await this.prisma.user.findUnique({ where: { id: userId } });
    let isPatient = false;

    // Se não for User, busca em Patient
    if (!user) {
      user = await (this.prisma.patient.findUnique({ where: { id: userId } }) as any);
      isPatient = true;
    }

    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    if (oldPassword.trim() !== user.password.trim()) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    if (isPatient) {
      await this.prisma.patient.update({
        where: { id: userId },
        data: { password: newPassword },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: newPassword },
      });
    }

    return { message: 'Senha alterada com sucesso' };
  }
}