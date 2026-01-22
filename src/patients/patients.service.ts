import { Injectable } from '@nestjs/common';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PrismaService } from 'src/prisma/prisma.service'; // Importe o Prisma

@Injectable()
export class PatientsService {
  // Injete o Prisma no construtor
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePatientDto) {
    return this.prisma.patient.create({
      data: {
        id: data.customId, // Usa o ID que digitamos (para bater com o sensor)
        name: data.name,
        birthDate: new Date(data.birthDate), // Converte string para Date
        // Vincula hardcoded ao Hospital Geral (do seed)
        company: {
          connect: { slug: 'hospital-geral' } 
        }
      },
    });
  }

  findAll() {
    return this.prisma.patient.findMany();
  }

  // ... (pode manter os outros métodos como estavam ou implementar depois)
  findOne(id: number) { return `This action returns a #${id} patient`; }
  update(id: number, updatePatientDto: UpdatePatientDto) { return `This action updates a #${id} patient`; }
  remove(id: number) { return `This action removes a #${id} patient`; }
}