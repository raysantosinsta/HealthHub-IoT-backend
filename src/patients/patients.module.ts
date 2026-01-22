import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // <--- ADICIONE ISSO AQUI
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
