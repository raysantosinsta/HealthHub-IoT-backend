import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  active?: boolean;
  bpmMin?: number;
  bpmMax?: number;
  spo2Min?: number;
}