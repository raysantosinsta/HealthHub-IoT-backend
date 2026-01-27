import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'sua-chave-secreta-super-segura',
    });
  }

  async validate(payload: any) {
    try {
      // SUBSTITUIÇÃO: SQL Query -> Prisma Client
      // O 'include' faz o papel do LEFT JOIN
      const user = await this.prisma.user.findUnique({
        where: { 
          id: payload.sub 
        },
        include: {
          company: true, // Traz os dados da empresa relacionada
        },
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      // Verificação se o usuário tem empresa vinculada (Mantendo sua lógica original)
      if (!user.company || !user.companyId) {
        throw new UnauthorizedException('Empresa não encontrada');
      }

      // Retorna o objeto formatado para ser injetado no Request (req.user)
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        company: {
          id: user.company.id,
          name: user.company.name,
          slug: user.company.slug,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log do erro real para debug, mas retorno genérico para o cliente
      console.error('Erro no JwtStrategy:', error);
      throw new UnauthorizedException('Erro ao validar token');
    }
  }
}